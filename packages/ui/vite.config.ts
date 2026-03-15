import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5391',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../cli/dist/ui',
    emptyOutDir: true,
  },
});
