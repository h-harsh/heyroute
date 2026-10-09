import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import crypto from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium } = await import('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await mkdtemp(path.join(tmpdir(), 'heyroute-browser-'));
const originHits = [];
const proxyHits = [];
const sockets = new Set();
const closeServer = (server) => new Promise((resolve) => server.close(resolve));
const listen = (server, port = 0) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(server.address().port); });
});
function track(socket) {
  sockets.add(socket);
  socket.on('error', () => {});
  socket.on('close', () => sockets.delete(socket));
}
function app(req, res) {
  originHits.push(req.url);
  res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
  res.end('<!doctype html><html><head><title>HeyRoute fixture</title></head><body>HeyRoute fixture</body></html>');
}
function websocket(server) {
  server.on('upgrade', (req, socket) => {
    originHits.push(req.url);
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.on('data', () => socket.end(Buffer.from([0x88, 0x00])));
    track(socket);
  });
}

// Test fixture only. Destinations are restricted to reserved test names/ports.
let allowedPorts;
function socksServer() {
  return net.createServer((socket) => {
    track(socket);
    let stage = 0;
    let buffer = Buffer.alloc(0);
    function receive(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      if (stage === 0) {
        if (buffer.length < 2 || buffer.length < 2 + buffer[1]) return;
        if (buffer[0] !== 5) return socket.destroy();
        buffer = buffer.subarray(2 + buffer[1]);
        socket.write(Buffer.from([5, 0]));
        stage = 1;
      }
      if (stage === 1) {
        if (buffer.length < 5) return;
        if (buffer[0] !== 5 || buffer[1] !== 1 || buffer[3] !== 3) return socket.destroy();
        const length = buffer[4];
        if (buffer.length < 7 + length) return;
        const host = buffer.subarray(5, 5 + length).toString('utf8');
        const port = buffer.readUInt16BE(5 + length);
        if (!host.endsWith('.heyroute.test') || !allowedPorts.has(port)) return socket.destroy();
        proxyHits.push({ host, port });
        const remainder = buffer.subarray(7 + length);
        stage = 2;
        socket.pause();
        socket.removeListener('data', receive);
        const upstream = net.connect(port, '127.0.0.1');
        track(upstream);
        upstream.once('connect', () => {
          socket.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]));
          if (remainder.length) upstream.write(remainder);
          socket.pipe(upstream).pipe(socket);
          socket.resume();
        });
        upstream.once('error', () => socket.destroy());
        socket.once('close', () => upstream.destroy());
      }
    }
    socket.on('data', receive);
  });
}

let context;
let otherContext;
let socks;
let httpOrigin;
let tlsOrigin;
try {
  const certFile = path.join(scratch, 'fixture-cert.pem');
  const keyFile = path.join(scratch, 'fixture-key.pem');
  const cert = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile,
    '-out', certFile, '-days', '1', '-subj', '/CN=secure.heyroute.test'], { stdio: 'ignore' });
  assert.equal(cert.status, 0, 'openssl must generate the temporary test TLS fixture');
  httpOrigin = http.createServer(app);
  tlsOrigin = https.createServer({ key: await readFile(keyFile), cert: await readFile(certFile) }, app);
  websocket(httpOrigin);
  websocket(tlsOrigin);
  const httpPort = await listen(httpOrigin);
  const tlsPort = await listen(tlsOrigin);
  allowedPorts = new Set([httpPort, tlsPort]);
  socks = socksServer();
  const socksPort = await listen(socks);
  const profile = path.join(scratch, 'profile');
  const launch = () => chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, ignoreHTTPSErrors: true,
    args: [`--disable-extensions-except=${path.join(root, 'extension')}`,
      `--load-extension=${path.join(root, 'extension')}`,
      '--host-resolver-rules=MAP *.heyroute.test 127.0.0.1', '--disable-background-networking'],
  });
  const extensionId = async () => {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    return new URL(worker.url()).host;
  };
  const status = (page) => page.evaluate(() => chrome.runtime.sendMessage({ type: 'status' }));
  context = await launch();
  let id = await extensionId();
  const options = await context.newPage();
  const errors = [];
  options.on('pageerror', (error) => errors.push(error.message));
  await options.goto(`chrome-extension://${id}/options.html`);
  await options.waitForFunction(() => document.querySelector('#state').textContent === 'Routing off');
  assert.equal((await status(options)).status.active, false);
  await options.locator('#toggle').click();
  await options.waitForFunction(() => document.querySelector('#feedback').textContent.includes('hostname'));
  await options.locator('#port').fill(String(socksPort));
  await options.locator('#domains').fill('private.heyroute.test\nsecure.heyroute.test');
  await options.locator('#acknowledge').check();
  await options.locator('#save').click();
  await options.waitForFunction(() => document.querySelector('#feedback').textContent.includes('Settings saved'));
  assert.equal((await status(options)).status.active, false, 'save must not enable');
  await options.locator('#toggle').click();
  await options.waitForFunction(() => document.querySelector('#state').textContent === 'Routing enabled');
  const effective = await options.evaluate(() => chrome.proxy.settings.get({ incognito: false }));
  assert.equal(effective.levelOfControl, 'controlled_by_this_extension');
  assert.equal(effective.value.pacScript.mandatory, true);
  console.log('PASS: actual extension UI, empty state, save/enable, and effective proxy ownership.');

  const page = await context.newPage();
  await page.goto(`http://private.heyroute.test:${httpPort}/selected-http`);
  assert.match(await page.textContent('body'), /HeyRoute fixture/);
  assert.ok(proxyHits.some((hit) => hit.host === 'private.heyroute.test'));
  await page.goto(`https://secure.heyroute.test:${tlsPort}/selected-https`);
  assert.ok(proxyHits.some((hit) => hit.host === 'secure.heyroute.test' && hit.port === tlsPort));
  const socketResult = await page.evaluate(async ({ httpPort, tlsPort }) => {
    async function open(url) {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => { socket.close(); reject(new Error('WebSocket timeout')); }, 5000);
        socket.onopen = () => { clearTimeout(timer); socket.close(); resolve('open'); };
        socket.onerror = () => { clearTimeout(timer); reject(new Error('WebSocket error')); };
      });
    }
    // WSS from an HTTPS page; WS is exercised from an HTTP page below.
    return open(`wss://secure.heyroute.test:${tlsPort}/selected-wss`);
  }, { httpPort, tlsPort });
  assert.equal(socketResult, 'open');
  await page.goto(`http://private.heyroute.test:${httpPort}/ws-page`);
  assert.equal(await page.evaluate((port) => new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://private.heyroute.test:${port}/selected-ws`);
    socket.onopen = () => { socket.close(); resolve('open'); };
    socket.onerror = () => reject(new Error('WebSocket failed'));
  }), httpPort), 'open');
  assert.ok(originHits.includes('/selected-ws'));
  assert.ok(originHits.includes('/selected-wss'));
  console.log('PASS: selected HTTP, HTTPS, WS and WSS traffic uses real SOCKS5 with remote hostnames.');

  const beforeDirect = proxyHits.length;
  await page.goto(`http://ordinary.heyroute.test:${httpPort}/ordinary`);
  assert.equal(proxyHits.length, beforeDirect);
  assert.ok(originHits.includes('/ordinary'));
  otherContext = await chromium.launchPersistentContext(path.join(scratch, 'other-profile'), {
    channel: 'chromium', headless: true,
    args: ['--host-resolver-rules=MAP *.heyroute.test 127.0.0.1', '--disable-background-networking'],
  });
  const otherPage = await otherContext.newPage();
  await otherPage.goto(`http://private.heyroute.test:${httpPort}/other-profile`);
  assert.equal(proxyHits.length, beforeDirect);
  await otherContext.close(); otherContext = null;
  console.log('PASS: unmatched hosts and a separate browser profile bypass the proxy.');

  for (const socket of sockets) socket.destroy();
  await closeServer(socks); socks = null;
  for (const [host, port, scheme] of [['private', httpPort, 'http'], ['secure', tlsPort, 'https']]) {
    const failedPath = `/offline-${scheme}`;
    const offlinePage = await context.newPage();
    await assert.rejects(offlinePage.goto(`${scheme}://${host}.heyroute.test:${port}${failedPath}`, { timeout: 10000 }));
    assert.ok(!originHits.includes(failedPath), 'selected domain must never hit origin directly');
    await offlinePage.close();
  }
  await page.goto(`http://ordinary.heyroute.test:${httpPort}/ordinary-offline`);
  assert.ok(originHits.includes('/ordinary-offline'));
  console.log('PASS: stopping SOCKS blocks selected HTTP/HTTPS with zero direct fallback; ordinary browsing works.');

  socks = socksServer();
  await listen(socks, socksPort);
  await page.goto(`http://private.heyroute.test:${httpPort}/recovered`);
  assert.ok(originHits.includes('/recovered'));
  await mkdir(path.join(root, 'test-results'), { recursive: true });
  await options.screenshot({ path: path.join(root, 'test-results/options.png'), fullPage: true });
  assert.deepEqual(errors, []);
  await context.close(); context = null;
  context = await launch();
  id = await extensionId();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(() => document.querySelector('#state').textContent === 'Routing enabled');
  assert.equal((await status(popup)).status.active, true);
  const restarted = await context.newPage();
  await restarted.goto(`http://private.heyroute.test:${httpPort}/after-restart`);
  assert.ok(originHits.includes('/after-restart'));
  await popup.locator('#toggle').click();
  await popup.waitForFunction(() => document.querySelector('#state').textContent === 'Routing off');
  const beforeOff = proxyHits.length;
  await restarted.goto(`http://private.heyroute.test:${httpPort}/disabled`);
  assert.equal(proxyHits.length, beforeOff);
  assert.ok(originHits.includes('/disabled'));
  console.log('PASS: tunnel recovery, browser restart persistence, popup disable, and no UI exceptions.');
  console.log('Browser experiment passed. Only reserved test domains and temporary keys were used.');
} finally {
  if (otherContext) await otherContext.close();
  if (context) await context.close();
  for (const socket of sockets) socket.destroy();
  for (const server of [socks, httpOrigin, tlsOrigin]) {
    server?.closeAllConnections?.();
    if (server?.listening) await closeServer(server);
  }
  await rm(scratch, { recursive: true, force: true });
}
