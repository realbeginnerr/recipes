import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Vite can rebuild its dependency cache before reporting an occupied port.
// Check first so a second dev command cannot invalidate the running server.
export function checkDevPort(port = 5173) {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen({ port, host: 'localhost', exclusive: true }, () => probe.close(error => error ? reject(error) : resolve()))
  })
}

async function main() {
  try {
    await checkDevPort()
  } catch (error) {
    console.error(error.code === 'EADDRINUSE'
      ? 'Port 5173 is already in use. Use the running server at http://localhost:5173/recipes/ or stop it before starting again.'
      : `Cannot start dev server: ${error.message}`)
    process.exitCode = 1
    return
  }
  const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--port', '5173', '--strictPort', ...process.argv.slice(2)], { stdio: 'inherit' })
  child.once('error', error => { console.error(error); process.exitCode = 1 })
  child.once('exit', code => { process.exitCode = code ?? 1 })
  process.on('SIGINT', () => child.kill('SIGINT'))
  process.on('SIGTERM', () => child.kill('SIGTERM'))
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) void main()
