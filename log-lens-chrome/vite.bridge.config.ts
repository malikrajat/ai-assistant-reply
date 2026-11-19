import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/** MAIN-world page bridge: classic script, no imports, no chunks. */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome116',
    minify: 'esbuild',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/content/page-error-bridge.ts'),
      formats: ['iife'],
      name: 'LogLensPageBridge',
      fileName: () => 'page-error-bridge.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
  },
});
