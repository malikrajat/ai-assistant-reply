/**
 * Development watcher.
 *
 * Runs both build passes in watch mode:
 *  1. default mode  - service worker, options, popup, stylesheet
 *  2. content mode  - the single-file content script bundle
 *
 * They are separate passes because the content script has to be emitted as one
 * self-contained file (content scripts cannot load chunks at runtime).
 */

import { spawn } from 'child_process';

const isWindows = process.platform === 'win32';
const vite = isWindows ? 'vite.cmd' : 'vite';

const passes = [
  { args: ['build', '--watch', '--mode', 'development'], name: 'extension' },
  { args: ['build', '--watch', '--mode', 'content'], name: 'content' },
];

const children = passes.map(({ args, name }) => {
  const child = spawn(vite, args, { stdio: 'inherit', shell: true });

  child.on('exit', (code) => {
    console.log(`[dev] ${name} build exited with code ${code}`);
  });

  return child;
});

function shutdown() {
  children.forEach((child) => child.kill());
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
