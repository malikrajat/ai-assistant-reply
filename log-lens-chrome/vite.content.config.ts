import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/** The isolated-world content script must be one classic, self-contained file. */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome116',
    minify: 'esbuild',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/content/content-script.ts'),
      formats: ['iife'],
      name: 'LogLensContentScript',
      fileName: () => 'content-script.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
  },
});
