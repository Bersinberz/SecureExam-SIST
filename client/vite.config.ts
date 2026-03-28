import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

const isElectron = process.env.ELECTRON === 'true'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Only load Electron plugins when running electron:dev
    ...(isElectron ? [
      electron([
        {
          entry: 'electron/main.ts',
          onstart(args) {
            args.startup()
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(args) {
            args.reload()
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron'],
              },
            },
          },
        },
      ]),
      renderer(),
    ] : []),
  ],

  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor':     ['react-bootstrap', 'bootstrap'],
          'editor-vendor': ['@monaco-editor/react'],
        }
      }
    }
  },

  base: mode === 'production' ? '/' : '/',
}))
