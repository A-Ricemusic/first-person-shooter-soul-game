import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
export default defineConfig({
  base: "./",
  plugins: [{ name: 'ship-design-dossier', closeBundle() { cpSync('docs', 'dist/docs', { recursive: true }); } }],
  build: { chunkSizeWarningLimit: 650, rollupOptions: { output: { manualChunks: { three: ['three'] } } } }
});
