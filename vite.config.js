import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        email: resolve(import.meta.dirname, 'email/index.html'),
      },
    },
  },
  server: {
    open: '/email/',
  },
});
