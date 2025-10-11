import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/comments': 'http://localhost:3013',
      '/posts': 'http://localhost:3013',
      '/reaction': 'http://localhost:3004',
      '/users': 'http://localhost:3001',
      '/relationships': 'http://localhost:3002',
      '/auth': 'http://localhost:3011',
    }
  }
});
