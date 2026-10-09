import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { DEFAULTS, normalizeDomains, normalizeSettings, buildProxyConfig, controlProblem } from '../extension/core.js';

const route = (rules, host, url = `https://${host}/`) => {
  const context = vm.createContext({});
  vm.runInContext(buildProxyConfig({ domains: rules }).pacScript.data, context);
  return context.FindProxyForURL(url, host);
};

test('new install is disabled and has no private configuration', () => {
  assert.deepEqual(normalizeSettings(), DEFAULTS);
});
test('normalize and deduplicate domain rules', () => {
  assert.deepEqual(normalizeDomains(' APP.EXAMPLE.COM\r\n\napp.example.com\n*.example.com '), ['app.example.com', '*.example.com']);
});
test('reject URLs, IPs, local names, patterns, and PAC injection', () => {
  for (const rule of ['https://app.example.com', 'app.example.com/path', 'app.example.com:443',
    '127.0.0.1', '[::1]', 'localhost', 'app.local', '*.localhost', '*', '.example.com',
    '*example.com', 'app..example.com', '-app.example.com', 'app_.example.com',
    'app.example.com;DIRECT', 'a.example.com";return "DIRECT', 'app.例子', '123.456']) {
    assert.throws(() => normalizeDomains(rule), undefined, rule);
  }
});
test('enforce rule and label limits', () => {
  assert.throws(() => normalizeDomains(Array.from({ length: 101 }, (_, i) => `a${i}.example.com`)));
  assert.throws(() => normalizeDomains(`${'a'.repeat(64)}.example.com`));
  assert.throws(() => normalizeDomains(' '.repeat(8193)));
});
test('settings reject malformed state and unsafe ports', () => {
  for (const port of [0, 65536, 1.5, '1080', NaN]) assert.throws(() => normalizeSettings({ port }));
  for (const input of [null, [], { enabled: 'true' }, { directAcknowledged: 1 }, { version: 2 }]) {
    assert.throws(() => normalizeSettings(input));
  }
  assert.throws(() => normalizeSettings({ enabled: true }));
  assert.throws(() => normalizeSettings({ enabled: true, domains: ['app.example.com'] }));
});
test('exact hostname matching excludes lookalikes and subdomains', () => {
  assert.equal(route(['app.example.com'], 'APP.EXAMPLE.COM.'), 'SOCKS5 127.0.0.1:1080');
  for (const host of ['example.com', 'sub.app.example.com', 'app.example.com.evil.test', 'evilapp.example.com']) {
    assert.equal(route(['app.example.com'], host), 'DIRECT');
  }
});
test('wildcard matches only subdomains, including nested ones', () => {
  for (const host of ['a.example.com', 'a.b.example.com']) {
    assert.equal(route(['*.example.com'], host), 'SOCKS5 127.0.0.1:1080');
  }
  for (const host of ['example.com', 'badexample.com', 'example.com.evil.test']) {
    assert.equal(route(['*.example.com'], host), 'DIRECT');
  }
});
test('same host route applies to HTTP, HTTPS and WebSocket schemes without fallback', () => {
  for (const scheme of ['http', 'https', 'ws', 'wss']) {
    const result = route(['app.example.com'], 'app.example.com', `${scheme}://app.example.com/path`);
    assert.equal(result, 'SOCKS5 127.0.0.1:1080');
    assert.ok(!result.includes('DIRECT'));
  }
  const config = buildProxyConfig({ port: 2345, domains: ['app.example.com'] });
  assert.equal(config.pacScript.mandatory, true);
  assert.ok(config.pacScript.data.includes('SOCKS5 127.0.0.1:2345'));
});
test('managed and non-direct proxy configurations block enabling', () => {
  assert.ok(controlProblem({ levelOfControl: 'not_controllable', value: { mode: 'system' } }));
  assert.ok(controlProblem({ levelOfControl: 'controlled_by_other_extensions', value: { mode: 'direct' } }));
  assert.ok(controlProblem({ levelOfControl: 'controllable_by_this_extension', value: { mode: 'pac_script' } }));
  assert.equal(controlProblem({ levelOfControl: 'controllable_by_this_extension', value: { mode: 'system' } }), null);
});
