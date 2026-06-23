import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const BFF_PORT = process.env.BFF_PORT || '8090';
const BFF_TARGET = `http://localhost:${BFF_PORT}`;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: BFF_TARGET,
          changeOrigin: false,
          secure: false,
        },
        '/oauth2': {
          target: BFF_TARGET,
          changeOrigin: false,
          secure: false,
        },
        '/login': {
          target: BFF_TARGET,
          changeOrigin: false,
          secure: false,
        },
        '/logout': {
          target: BFF_TARGET,
          changeOrigin: false,
          secure: false,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
