import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const excluded = new Set(['.git', '.local', 'node_modules', 'dist', 'test-results', 'playwright-report', 'graphify-out']);
export async function sourceFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

// Heuristics catch common accidents; they are not a credential audit guarantee.
export function contentFindings(text) {
  const findings = [];
  const patterns = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
    ['personal email', /\b[A-Z0-9._%+-]+@(?!example\.(?:com|org|net)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ['personal filesystem path', /\/Users\/[A-Za-z0-9._-]+\//],
    ['credential assignment', /\b(?:password|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ];
  for (const [label, pattern] of patterns) if (pattern.test(text)) findings.push(label);
  return findings;
}

export async function checkPublicContent(root) {
  const findings = [];
  for (const file of await sourceFiles(root)) {
    if (/\.(pem|key|har)$|(^|\/)\.env(?:\.|$)/.test(file)) {
      findings.push(`${path.relative(root, file)}: forbidden personal artifact`);
      continue;
    }
    const text = await readFile(file, 'utf8');
    for (const finding of contentFindings(text)) findings.push(`${path.relative(root, file)}: ${finding}`);
  }
  return findings;
}
