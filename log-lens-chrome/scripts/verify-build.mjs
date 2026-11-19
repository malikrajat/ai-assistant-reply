import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const requiredFiles = [
  'manifest.json',
  'service-worker.js',
  'content-script.js',
  'page-error-bridge.js',
  'page-console-bridge.js',
  'popup.html',
  'sidepanel.html',
  'options.html',
  'logs.html',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

const failures = [];
for (const file of requiredFiles) {
  const path = join(dist, file);
  if (!existsSync(path)) failures.push(`missing ${file}`);
}

if (existsSync(join(dist, 'manifest.json'))) {
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
  if (manifest.manifest_version !== 3) failures.push('manifest_version must be 3');
  if (manifest.version !== packageJson.version) {
    failures.push(
      `manifest version ${manifest.version} does not match package.json ${packageJson.version}`,
    );
  }
  if (manifest.background?.service_worker !== 'service-worker.js') {
    failures.push('background.service_worker must be service-worker.js');
  }
  if (manifest.action?.default_popup !== 'popup.html') {
    failures.push('action.default_popup must be popup.html');
  }
  if (manifest.side_panel?.default_path !== 'sidepanel.html') {
    failures.push('side_panel.default_path must be sidepanel.html');
  }
  if (manifest.options_ui?.page !== 'options.html') {
    failures.push('options_ui.page must be options.html');
  }
  if (!manifest.commands?.['open-logs']) failures.push('open-logs command is missing');
  const csp = manifest.content_security_policy?.extension_pages ?? '';
  if (/unsafe-eval/i.test(csp)) failures.push('extension CSP must not allow unsafe-eval');
  for (const permission of [
    'storage',
    'alarms',
    'notifications',
    'downloads',
    'clipboardWrite',
    'sidePanel',
    'scripting',
  ]) {
    if (!manifest.permissions?.includes(permission)) {
      failures.push(`required permission missing: ${permission}`);
    }
  }
}

for (const classic of ['content-script.js', 'page-error-bridge.js', 'page-console-bridge.js']) {
  const path = join(dist, classic);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, 'utf8');
  if (/^\s*import\s/m.test(source)) failures.push(`${classic} must not contain import statements`);
  if (/^\s*export\s/m.test(source)) failures.push(`${classic} must not contain export statements`);
}

if (existsSync(join(dist, 'service-worker.js'))) {
  const source = readFileSync(join(dist, 'service-worker.js'), 'utf8');
  if (!source.includes('onMessageExternal')) {
    failures.push('service worker does not register the external API listener');
  }
}

if (failures.length > 0) {
  console.error('Build verification failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const sizes = requiredFiles.map((file) => [file, statSync(join(dist, file)).size]);
console.log(`Verified Log Lens ${packageJson.version}: ${requiredFiles.length} required files.`);
for (const [file, size] of sizes) {
  console.log(`  ${file.padEnd(28)} ${(size / 1024).toFixed(1)} KB`);
}
