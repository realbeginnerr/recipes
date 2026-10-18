import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const targets = new Map([['대파', '냉동실'], ['참치액', '냉장실'], ['깨 (참깨. 통깨)', '냉장실']])
const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
async function request(suffix, body) {
  const response = await fetch(`${base}${suffix}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
const query = { structuredQuery: { from: [{ collectionId: 'ingredients' }] } }
const snapshot = await request(':runQuery', query)
const documents = snapshot.flatMap(row => row.document ? [row.document] : [])
const selected = []
for (const [name, location] of targets) {
  const matches = documents.filter(document => !document.fields.retired?.booleanValue && (document.fields.nameKo?.stringValue || document.fields.name?.stringValue) === name)
  assert.equal(matches.length, 1, `Expected one active ingredient: ${name}`)
  selected.push({ document: matches[0], name, location })
}
console.log(JSON.stringify(selected.map(({ document, name, location }) => ({ name, before: document.fields.storageLocation?.stringValue, after: location })), null, 2))
if (process.argv.includes('--apply')) {
  await writeFile(`scripts/requested-storage-backup-${Date.now()}.json`, JSON.stringify(selected, null, 2))
  const writes = selected.filter(({ document, location }) => document.fields.storageLocation?.stringValue !== location).map(({ document, location }) => ({ update: { name: document.name, fields: { storageLocation: { stringValue: location } } }, updateMask: { fieldPaths: ['storageLocation'] }, currentDocument: { updateTime: document.updateTime } }))
  if (writes.length) await request(':commit', { writes })
  const verified = await request(':runQuery', query)
  for (const { document, location } of selected) assert.equal(verified.find(row => row.document?.name === document.name)?.document.fields.storageLocation?.stringValue, location)
  const path = new URL('./ingredient-storage-tags.json', import.meta.url)
  const groups = JSON.parse(await readFile(path, 'utf8'))
  for (const location of Object.keys(groups)) groups[location] = groups[location].split('|').filter(name => !targets.has(name)).join('|')
  for (const [name, location] of targets) groups[location] = [groups[location], name].filter(Boolean).join('|')
  await writeFile(path, `${JSON.stringify(groups, null, 2)}\n`)
  console.log(`Applied and verified ${selected.length} storage tags.`)
}
