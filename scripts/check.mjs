import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { sourceFiles, checkPublicContent } from './public-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(root, 'extension/manifest.json'), 'utf8'));
assert.deepEqual(manifest.permissions.slice().sort(), ['proxy', 'storage']);
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.incognito, 'not_allowed');
for (const key of ['host_permissions', 'optional_host_permissions', 'content_scripts', 'externally_connectable', 'web_accessible_resources', 'update_url']) {
  assert.equal(manifest[key], undefined, `${key} widens the public extension boundary`);
}
assert.equal(manifest.background.type, 'module');
assert.ok(manifest.content_security_policy.extension_pages.includes("connect-src 'none'"));
for (const file of await sourceFiles(root)) {
  if (/\.py$/.test(file)) {
    const result = spawnSync('python3', ['-c', 'import ast,sys; ast.parse(open(sys.argv[1]).read(), filename=sys.argv[1])', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${path.relative(root, file)}: ${result.stderr}`);
  }
  if (/\.(mjs|js)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${path.relative(root, file)}: ${result.stderr}`);
  }
  if (file.includes(`${path.sep}extension${path.sep}`) && /\.(js|html)$/.test(file)) {
    const text = await readFile(file, 'utf8');
    assert.ok(!/innerHTML|\beval\s*\(|new Function|storage\.sync|\bfetch\s*\(|XMLHttpRequest/.test(text), `${path.relative(root, file)} contains an unreviewed capability`);
  }
}
const findings = await checkPublicContent(root);
assert.deepEqual(findings, [], findings.join('\n'));
console.log('PASS: syntax, minimal permissions, local-only runtime, and public-content checks.');
