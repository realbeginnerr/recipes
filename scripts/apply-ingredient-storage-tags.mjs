import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const groups = JSON.parse(await readFile(new URL('./ingredient-storage-tags.json', import.meta.url), 'utf8'))
const tags = new Map()
for (const [location, names] of Object.entries(groups)) {
  for (const name of names.split('|')) {
    if (tags.has(name)) throw new Error(`Duplicate mapping: ${name}`)
    tags.set(name, location)
  }
}
const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
async function request(suffix, body) {
  const response = await fetch(`${base}${suffix}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
const snapshot = await request(':runQuery', { structuredQuery: { from: [{ collectionId: 'ingredients' }] } })
const documents = snapshot.flatMap(row => row.document ? [row.document] : [])
const matched = new Set()
const writes = []
const counts = {}
for (const document of documents) {
  const name = document.fields.nameKo?.stringValue || document.fields.name?.stringValue
  if (!tags.has(name)) continue
  matched.add(name)
  const location = tags.get(name)
  counts[location || 'Unspecified'] = (counts[location || 'Unspecified'] ?? 0) + 1
  if (document.fields.storageLocation?.stringValue === location) continue
  writes.push({ update: { name: document.name, fields: { storageLocation: { stringValue: location } } }, updateMask: { fieldPaths: ['storageLocation'] }, currentDocument: { updateTime: document.updateTime } })
}
const missing = [...tags.keys()].filter(name => !matched.has(name))
console.log(JSON.stringify({ mappedNames: tags.size, matchedNames: matched.size, updates: writes.length, counts, missing }, null, 2))
if (missing.length) throw new Error('Some requested ingredients were not found; no changes applied.')
if (process.argv.includes('--apply') && writes.length) {
  await writeFile(new URL(`ingredient-storage-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(snapshot, null, 2))
  await request(':commit', { writes })
  const verified = await request(':runQuery', { structuredQuery: { from: [{ collectionId: 'ingredients' }] } })
  const actual = new Map(verified.flatMap(row => row.document ? [[row.document.name, row.document.fields.storageLocation?.stringValue]] : []))
  for (const write of writes) if (actual.get(write.update.name) !== write.update.fields.storageLocation.stringValue) throw new Error(`Verification failed: ${write.update.name}`)
  console.log(`Applied and verified ${writes.length} storage tags.`)
}
