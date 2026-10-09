import test from 'node:test';
import assert from 'node:assert/strict';
import { contentFindings } from '../scripts/public-check.mjs';

test('public check detects common personal artifacts without exposing values', () => {
  const key = ['-----BEGIN', 'OPENSSH', 'PRIVATE KEY-----'].join(' ');
  assert.ok(contentFindings(key).includes('private key'));
  assert.ok(contentFindings(['developer', '@', 'mail', '.invalid'].join('')).includes('personal email'));
  assert.ok(contentFindings(['/', 'Users', '/', 'someone', '/', 'file'].join('')).includes('personal filesystem path'));
  assert.ok(contentFindings(['ghp_', 'a'.repeat(40)].join('')).includes('GitHub token'));
  assert.deepEqual(contentFindings('app.example.com 127.0.0.1:1080 owner@example.com'), []);
});
