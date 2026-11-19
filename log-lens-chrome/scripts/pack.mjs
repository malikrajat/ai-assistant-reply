import { createWriteStream, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const manifestPath = join(dist, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error('No built extension found. Run "npm run build" first.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.version !== packageJson.version) {
  console.error(
    `Version mismatch: package.json ${packageJson.version}, manifest.json ${manifest.version}`,
  );
  process.exit(1);
}

const output = join(root, `log-lens-chrome-${packageJson.version}.zip`);
const outputStream = createWriteStream(output);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolvePromise, reject) => {
  outputStream.on('close', resolvePromise);
  outputStream.on('error', reject);
  archive.on('warning', (error) => {
    if (error.code === 'ENOENT') console.warn(error.message);
    else reject(error);
  });
  archive.on('error', reject);
  archive.pipe(outputStream);
  archive.glob('**/*', {
    cwd: dist,
    ignore: ['**/*.map', '**/.DS_Store'],
    dot: false,
  });
  archive.finalize();
});

const size = statSync(output).size;
console.log(`Packaged ${output}`);
console.log(`  ${(size / 1024).toFixed(1)} KB, ${manifest.version}`);
