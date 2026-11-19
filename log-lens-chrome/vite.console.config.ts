import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/** Optional MAIN-world console capture bridge. */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome116',
    minify: 'esbuild',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/content/page-console-bridge.ts'),
      formats: ['iife'],
      name: 'LogLensConsoleBridge',
      fileName: () => 'page-console-bridge.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
  },
});
