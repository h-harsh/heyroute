import { readFile } from 'node:fs/promises';

export function commitProblems(message) {
  const subject = message.split(/\r?\n/)[0];
  const problems = [];
  if (!/^(feat|fix|docs|test|chore|refactor|ci|perf|build)(\([a-z0-9-]+\))?: \S/.test(subject)) {
    problems.push('Use type: imperative subject.');
  }
  if (subject.length > 72) problems.push('Keep the subject within 72 characters.');
  if (/^\s*(?:co-authored-by|signed-off-by|generated-by):|generated (?:with|by) (?:claude|codex|chatgpt)|🤖/im.test(message)) {
    problems.push('Attribution and co-author trailers are not allowed.');
  }
  return problems;
}

if (process.argv[2]) {
  const problems = commitProblems(await readFile(process.argv[2], 'utf8'));
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
}
