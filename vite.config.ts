import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    allowedHosts: ['ustypology.github.io', 'localhost', '127.0.0.1'],
    headers: {
      // Enable SharedArrayBuffer for WebAssembly threading
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    target: 'es2020', // Ensure modern browser features are supported
    rollupOptions: {
      onwarn(warning, warn) {
        // All warnings are now processed normally
        warn(warning);
      },
    },
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'], // Exclude transformers.js from pre-bundling to avoid issues with WASM
  },
  // define: {
  //   global: 'globalThis', // Commented out to avoid breaking module name resolution
  // },
});
