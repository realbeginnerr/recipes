import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const check = spawnSync(process.execPath, ['scripts/check-public-images.mjs'], { encoding: 'utf8' })
const names = [...new Set([...check.stderr.matchAll(/^src[^\r\n]*?: (.+)$/gm)].map(match => match[1]))]
const restored = [], failed = []
for (const name of names) {
  const filename = path.join('public/images', name)
  if (existsSync(filename)) continue
  try {
    const bytes = execFileSync('git', ['show', `HEAD:public/images/${name}`], { maxBuffer: 30 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    mkdirSync(path.dirname(filename), { recursive: true }); writeFileSync(filename, bytes); restored.push(name)
  } catch { failed.push(name) }
}
console.log(JSON.stringify({ restored: restored.length, failed }))
