import { readFile, readdir, access, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
const missing = new Set()
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) await scan(file)
    else if (/\.(tsx?|css)$/.test(entry.name)) {
      const source = await readFile(file, 'utf8')
      for (const match of source.matchAll(/images\/([^'"`\r\n}]+\.(?:png|jpe?g|webp|svg|gif|avif))/g)) {
        if (source.slice(Math.max(0, match.index - 20), match.index).includes('https://')) continue
        try { await access(path.join('public/images', match[1])) } catch { missing.add(match[1]) }
      }
    }
  }
}
await scan('src')
for (const name of missing) {
  const file = `public/images/${name}`
  const bytes = execFileSync('git', ['show', `HEAD:${file}`], { maxBuffer: 30 * 1024 * 1024 })
  await writeFile(file, bytes)
}
console.log(`Restored ${missing.size} compatibility image paths; reorganized folders retained.`)
