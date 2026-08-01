import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, '..');
const repoRoot = resolve(webRoot, '..');

const packageJson = JSON.parse(await readFile(resolve(webRoot, 'package.json'), 'utf8'));
const version = packageJson.version;

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`package.json version must use SemVer x.y.z; received ${String(version)}`);
}

const checks = [
  {
    path: resolve(webRoot, 'public/sw.js'),
    expected: `rhythmcoach-v${version}`,
    label: 'service-worker cache name'
  },
  {
    path: resolve(repoRoot, 'README.md'),
    expected: `**v${version} · Stable**`,
    label: 'README current version'
  },
  {
    path: resolve(repoRoot, 'CHANGELOG.md'),
    expected: `## [${version}] -`,
    label: 'CHANGELOG release heading'
  },
  {
    path: resolve(repoRoot, 'PRIVACY.md'),
    expected: `version ${version}`,
    label: 'privacy version reference'
  }
];

for (const check of checks) {
  const content = await readFile(check.path, 'utf8');
  if (!content.includes(check.expected)) {
    throw new Error(`${check.label} is not synchronized with v${version}: expected ${check.expected}`);
  }
}

console.log(`RhythmCoach version references are synchronized at v${version}`);
