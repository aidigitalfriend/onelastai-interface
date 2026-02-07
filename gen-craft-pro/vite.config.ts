import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/gen-craft-pro/',
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api/': {
        target: 'http://localhost:3200',
        changeOrigin: true,
        ws: true,
      },
      '/auth/': {
        target: 'http://localhost:3200',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
