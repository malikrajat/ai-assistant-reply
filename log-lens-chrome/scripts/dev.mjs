// Watch all four Vite passes. The main pass owns page/SW output; the other
// passes keep classic content-script bundles up to date.
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const configs = [[], ['--config', 'vite.content.config.ts'], ['--config', 'vite.bridge.config.ts'], ['--config', 'vite.console.config.ts']];

const children = configs.map((args) =>
  spawn(process.execPath, [vite, 'build', ...args, '--watch'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, LOG_LENS_DEV: '1' },
  }),
);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) shutdown(code);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
