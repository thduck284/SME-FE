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
      '/comments': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/posts': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/reaction': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false, // cho phép http
      },
      '/relationships': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  }
  
});
