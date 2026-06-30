import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { createConnection } from 'node:net'
import { join, resolve } from 'node:path'

// Backend dev port. NOTE: 8080 is occupied by an unrelated local service
// on this machine, so the unified backend runs on 8090 instead.
const BACKEND_PORT = 8090

function findPhpBinary() {
  if (process.env.PHP_BIN) return process.env.PHP_BIN
  const laragonRoot = 'C:/laragon/bin/php'
  if (process.platform === 'win32' && existsSync(laragonRoot)) {
    const versions = readdirSync(laragonRoot).sort().reverse()
    for (const version of versions) {
      const candidate = join(laragonRoot, version, 'php.exe')
      if (existsSync(candidate)) return candidate
    }
  }
  return 'php'
}

function portIsOpen(port) {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => { socket.destroy(); resolvePort(true) })
    socket.once('error', () => resolvePort(false))
    socket.setTimeout(500, () => { socket.destroy(); resolvePort(false) })
  })
}

function slimDevServer() {
  let backend = null
  let stopping = false

  return {
    name: 'fixit-slim-dev-server',
    async configureServer(server) {
      const startBackend = async () => {
        if (stopping || (await portIsOpen(BACKEND_PORT))) return
        backend = spawn(findPhpBinary(), ['-S', `127.0.0.1:${BACKEND_PORT}`, '-t', 'public', 'public/index.php'], {
          cwd: resolve(process.cwd(), '..', 'backend'),
          env: process.env,
          stdio: 'inherit',
        })
        backend.once('exit', () => {
          backend = null
          if (!stopping) setTimeout(startBackend, 1000)
        })
      }

      await startBackend()
      server.httpServer?.once('close', () => {
        stopping = true
        backend?.kill()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), slimDevServer()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': `http://127.0.0.1:${BACKEND_PORT}`,
    },
  },
})
