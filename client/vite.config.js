import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api/* is proxied to the Express server, so no CORS and no VITE_API_URL needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4100';
  return {
    plugins: [react()],
    server: {
      port: Number(env.CLIENT_PORT) || 5180,
      proxy: { '/api': apiTarget },
    },
  };
});
