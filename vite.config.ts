import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        contentScript: resolve(__dirname, 'src/contentScript.ts'),
        serviceWorker: resolve(__dirname, 'src/serviceWorker.ts'),
        options: resolve(__dirname, 'src/options/options.html'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        styles: resolve(__dirname, 'src/styles.css'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Optimize CSS
    cssMinify: true,
  },
  plugins: [
    {
      name: 'copy-assets',
      closeBundle() {
        // Ensure dist directory exists
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        
        // Copy manifest.json to dist
        if (existsSync('public/manifest.json')) {
          copyFileSync('public/manifest.json', 'dist/manifest.json');
          console.log('✓ Copied manifest.json');
        }
        
        // Copy HTML files from dist/src to dist root
        if (existsSync('dist/src/options/options.html')) {
          copyFileSync('dist/src/options/options.html', 'dist/options.html');
          console.log('✓ Moved options.html to dist root');
        }
        
        if (existsSync('dist/src/popup/popup.html')) {
          copyFileSync('dist/src/popup/popup.html', 'dist/popup.html');
          console.log('✓ Moved popup.html to dist root');
        }
        
        // Copy icons directory to dist
        const iconsDir = 'dist/icons';
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }
        
        // Copy icon files if they exist
        const iconSizes = ['16', '48', '128'];
        iconSizes.forEach(size => {
          const iconPath = `public/icons/icon${size}.png`;
          if (existsSync(iconPath)) {
            copyFileSync(iconPath, `dist/icons/icon${size}.png`);
            console.log(`✓ Copied icon${size}.png`);
          } else {
            console.warn(`⚠ Warning: icon${size}.png not found - please generate icons`);
          }
        });
      }
    }
  ]
});
