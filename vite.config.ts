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
      '/posts': 'http://localhost:3003',
      '/reaction': 'http://localhost:3004',
      '/users': 'http://localhost:3001',
    }
  }
});
