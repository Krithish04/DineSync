import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'export-libs';
            }
            if (id.includes('recharts')) {
              return 'charting-libs';
            }
            if (id.includes('lucide-react')) {
              return 'ui-icons';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('zustand') || id.includes('axios')) {
              return 'vendor-core';
            }
          }
        },
      },
    },
  },
});
