import { defineConfig } from 'vite';

export default defineConfig({
  // Use repo-name-aware base for GitHub Pages.
  // Override with VITE_BASE env var to customise (e.g. '/' for custom domain).
  base: process.env.VITE_BASE ?? './',
  build: {
    outDir: 'dist',
    target: 'es2015',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Stable file names for caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
