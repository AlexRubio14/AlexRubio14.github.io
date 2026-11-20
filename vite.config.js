import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import htmlPartials from './config/vite-plugin-html-partials.js';

const root = import.meta.dirname;

export default defineConfig({
  // User site (AlexRubio14.github.io) is served from the domain root.
  base: '/',

  plugins: [htmlPartials({ dir: 'src/partials' })],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Multi-page app: every HTML file is its own entry point.
    rollupOptions: {
      input: {
        home: resolve(root, 'index.html'),
        networkMiddleware: resolve(root, 'projects/network-middleware.html'),
        lyra: resolve(root, 'projects/lyra.html'),
        notFound: resolve(root, '404.html'),
      },
    },
  },
});
