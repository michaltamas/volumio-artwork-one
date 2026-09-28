import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The interface is static files: Volumio serves them from the folder registered as a
// third-party UI (same origin as the socket and the REST API). In development the app runs on
// this machine and talks to the player named in VITE_VOLUMIO_HOST.
export default defineConfig({
  plugins: [react()],
  base: '/',
  // socket.io-client 1.x reaches for Node's `global`
  define: { global: 'globalThis' },
  build: {
    target: 'es2019',
    // the minifier rewrote the stylesheet (dropped calc() inside min(), kept only the prefixed
    // backdrop-filter of a pair): the CSS ships as written
    cssMinify: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/socket.io-client') || id.includes('node_modules/engine.io')) { return 'socket'; }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) { return 'firebase'; }   // MyVolumio only, loaded on demand
          if (id.includes('node_modules/hls.js')) { return 'hls'; }   // Play in this browser only, loaded on demand
          if (id.includes('node_modules')) { return 'vendor'; }
          return undefined;
        },
      },
    },
  },
  server: { port: 5173, host: true },
});
