import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    legacy({
      targets: ['ios >= 13', 'safari >= 13'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  server: {
    host: true,   // escuta em 0.0.0.0 → acessível na rede local
  },
  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },
})
