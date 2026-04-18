import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Lee PORT desde server/.env para que el proxy coincida aunque no exista .env en la raíz. */
function readServerApiPort(cwd = process.cwd()) {
  const envFile = path.join(cwd, 'server', '.env')
  try {
    const raw = fs.readFileSync(envFile, 'utf8')
    const line = raw.split(/\r?\n/).find((l) => /^\s*PORT\s*=/.test(l))
    if (line) {
      const val = line
        .replace(/^\s*PORT\s*=\s*/, '')
        .trim()
        .replace(/^["']|["']$/g, '')
      const n = parseInt(val, 10)
      if (!Number.isNaN(n) && n > 0) return n
    }
  } catch {
    // server/.env ausente o ilegible
  }
  return 3002
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const port = readServerApiPort()
  const apiProxyTarget =
    (env.VITE_API_PROXY_TARGET && String(env.VITE_API_PROXY_TARGET).trim()) ||
    `http://127.0.0.1:${port}`

  return {
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // Celular y PC usan el mismo origen (puerto 5173); /api va al backend (syncManager).
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        configure(proxy) {
          let warned = false
          proxy.on('error', (err) => {
            const code = err && err.code
            if (warned || (code !== 'ECONNREFUSED' && code !== 'ENOTFOUND')) return
            warned = true
            console.error(
              `\n[vite proxy] Sin conexión al API (${apiProxyTarget}). Ejecuta en otra terminal: npm run api   o usa: npm run dev:full\n`
            )
          })
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'vite.svg'],
      manifest: {
        name: '2Arbolitos POS',
        short_name: '2Arbolitos',
        description: 'Aplicación de Punto de Venta para 2Arbolitos',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  }
})
