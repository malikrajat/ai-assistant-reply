import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const copyManifest = (): Plugin => ({
  name: 'log-lens-copy-manifest',
  closeBundle() {
    copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'));
  },
});

/**
 * Extension pages and the module service worker. HTML entries let Vite emit the
 * pages, their CSS, and their dependencies automatically. The content script and
 * MAIN-world bridge cannot be part of this build because they are classic scripts;
 * they are built separately as self-contained IIFE bundles.
 */
export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  plugins: [copyManifest()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    // In watch mode the content/bridge passes write into the same folder, so the
    // main page watcher must not delete their output on every rebuild.
    emptyOutDir: process.env.LOG_LENS_DEV !== '1',
    target: 'chrome116',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        popup: resolve(__dirname, 'src/popup.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel.html'),
        options: resolve(__dirname, 'src/options.html'),
        logs: resolve(__dirname, 'src/logs.html'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker'
            ? 'service-worker.js'
            : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
