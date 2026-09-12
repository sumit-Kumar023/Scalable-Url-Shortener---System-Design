import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // In local (non-Docker) dev, `npm run dev` proxies API calls to the
      // backend so the frontend can keep using relative `/api/...` paths
      // exactly as it does in production behind Nginx.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
