import { defineConfig } from 'vite';
import { shipDossier } from './tools/ship-dossier.mjs';
export default defineConfig({
  base: "./",
  plugins: [{ name: 'ship-design-dossier', closeBundle() { const report=shipDossier(); console.log('Dossier packaged:',JSON.stringify(report)); } }],
  build: { chunkSizeWarningLimit: 650, rollupOptions: { output: { manualChunks: { three: ['three'] } } } }
});
