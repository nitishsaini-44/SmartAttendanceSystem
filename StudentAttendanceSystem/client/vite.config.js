import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — cached separately, changes rarely
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charts — large lib, cached until recharts updates
          'vendor-charts': ['recharts'],
          // Icons — large lib, cached until lucide-react updates
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  },
});