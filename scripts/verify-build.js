/**
 * Build Verification Script
 * Verifies that all required files are present in the dist folder
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

const distDir = resolve(process.cwd(), 'dist');

const requiredFiles = [
  'manifest.json',
  'contentScript.js',
  'serviceWorker.js',
  'options.html',
  'options.js',
  'options.css',
  'popup.html',
  'popup.js',
  'popup.css',
  'styles.css',
];

const optionalFiles = [
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

console.log('🔍 Verifying build output...\n');

let hasErrors = false;

// Check required files
console.log('Required files:');
requiredFiles.forEach((file) => {
  const filePath = resolve(distDir, file);
  const exists = existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
  if (!exists) {
    hasErrors = true;
  }
});

// Check optional files
console.log('\nOptional files:');
optionalFiles.forEach((file) => {
  const filePath = resolve(distDir, file);
  const exists = existsSync(filePath);
  const status = exists ? '✅' : '⚠️ ';
  console.log(`  ${status} ${file}`);
});

if (hasErrors) {
  console.log('\n❌ Build verification failed! Some required files are missing.');
  process.exit(1);
} else {
  console.log('\n✅ Build verification passed! All required files are present.');
  console.log('\n📦 Extension is ready to load in Chrome:');
  console.log('   1. Open chrome://extensions/');
  console.log('   2. Enable "Developer mode"');
  console.log('   3. Click "Load unpacked"');
  console.log('   4. Select the "dist" folder');
  process.exit(0);
}
