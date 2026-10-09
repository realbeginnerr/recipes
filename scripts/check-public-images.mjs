import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const imageRoot = path.join(root, 'public/images')
const images = new Set()
async function collectImages(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) await collectImages(filename)
    else images.add(path.relative(imageRoot, filename).split(path.sep).join('/'))
  }
}
await collectImages(imageRoot)
const missing = []
let checked = 0

async function checkDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) await checkDirectory(filename)
    else if (/\.(tsx?|css)$/.test(entry.name)) {
      const source = await readFile(filename, 'utf8')
      for (const match of source.matchAll(/images\/([^'"`\r\n}]+\.(?:png|jpe?g|webp|svg|gif|avif))/g)) {
        if (source.slice(Math.max(0, match.index - 20), match.index).includes('https://')) continue
        checked++
        if (!images.has(match[1])) missing.push(`${path.relative(root, filename)}: ${match[1]}`)
      }
    }
  }
}

await checkDirectory(path.join(root, 'src'))
if (missing.length) {
  console.error('Missing local images (filenames are case-sensitive):\n' + missing.join('\n'))
  process.exitCode = 1
} else console.log(`Verified ${checked} local image references.`)
