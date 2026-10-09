import test from 'node:test';
import assert from 'node:assert/strict';
import { commitProblems } from '../scripts/check-commit.mjs';

test('commit conventions reject trailers from any author', () => {
  assert.deepEqual(commitProblems('feat: add selective routing'), []);
  assert.ok(commitProblems('miscellaneous stuff').length);
  assert.ok(commitProblems(`feat: ${'a'.repeat(73)}`).length);
  for (const trailer of ['Co-Authored-By', 'co-authored-by', 'Signed-Off-By', 'Generated-By']) {
    assert.ok(commitProblems(`feat: add routing\n\n${trailer}: Person <person@example.com>`).length);
  }
});
