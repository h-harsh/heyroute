import { mkdir, readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checked = spawnSync(process.execPath, ['scripts/check.mjs'], { cwd: root, stdio: 'inherit' });
if (checked.status !== 0) process.exit(1);
const manifest = JSON.parse(await readFile(path.join(root, 'extension/manifest.json'), 'utf8'));
const files = (await readdir(path.join(root, 'extension'))).sort();
if (files.some((file) => !/\.(js|json|html|css)$/.test(file))) throw new Error('Unexpected extension artifact.');
await mkdir(path.join(root, 'dist'), { recursive: true });
const output = path.join(root, 'dist', `heyroute-${manifest.version}.zip`);
const result = spawnSync('zip', ['-j', '-q', '-FS', output, ...files], { cwd: path.join(root, 'extension'), stdio: 'inherit' });
if (result.error) throw new Error('Install the zip command to package the extension.');
if (result.status !== 0) process.exit(result.status ?? 1);
const licensed = spawnSync('zip', ['-j', '-q', output, path.join(root, 'LICENSE')], { stdio: 'inherit' });
if (licensed.status !== 0) process.exit(licensed.status ?? 1);
console.log(`Created dist/heyroute-${manifest.version}.zip (extension files and MIT notice only).`);
