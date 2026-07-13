import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' keeps asset paths relative so the same build can be dropped
// into a Capacitor iOS shell later without a hosting-root assumption.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
