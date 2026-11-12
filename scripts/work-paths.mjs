import { mkdirSync } from 'node:fs'

// Local file paths only; importing this helper never reads or writes remote data.
export function backupFile(name) {
  if (!/^[a-z0-9-]+$/i.test(name)) throw new Error('Invalid backup name')
  const directory = new URL('../backups/', import.meta.url)
  mkdirSync(directory, { recursive: true })
  const stamp = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString()
    .replace('T', '-').replaceAll(':', '').replace('Z', '')
  return new URL(`${name}-${stamp}.json`, directory)
}
