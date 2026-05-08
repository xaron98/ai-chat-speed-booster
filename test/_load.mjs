import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

export function loadACSB(...relativePaths) {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis.globalThis = sandbox.globalThis;
  const ctx = createContext(sandbox);
  for (const rel of relativePaths) {
    const src = readFileSync(resolve(repoRoot, rel), 'utf8');
    runInContext(src, ctx, { filename: rel });
  }
  return sandbox.globalThis.ACSB || {};
}
