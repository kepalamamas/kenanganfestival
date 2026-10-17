import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'festival-static-files',
        generateBundle() {
          for (const name of ['robots.txt', 'sitemap.xml']) {
            this.emitFile({
              type: 'asset',
              fileName: name,
              source: readFileSync(new URL(name, import.meta.url)),
            })
          }
        },
      },
    ],
    root: '.',
    base: '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Optimize assets
      minify: 'terser',
      sourcemap: false,
      // Handle large chunks
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.DEV_API_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/testSetup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/main.jsx', 'src/testSetup.js', 'src/**/*.test.*'],
        thresholds: { statements: 80, lines: 80, functions: 80, branches: 80 },
      },
    },
    // Preserve static assets structure
    publicDir: 'public',
  }
})
