import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
async function request(suffix, options = {}) {
  const response = await fetch(`${base}${suffix}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
  if (typeof value === 'string') return value.replace(/\uBE14\uB80C\uB529\s*\uD2F0/g, '차').replace(/blending tea/gi, 'Tea')
  return value
}
async function scan() {
  const documents = []
  for (const collectionId of ['recipes', 'ingredients']) {
    const results = await request(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId }] } }) })
    documents.push(...results.flatMap(row => row.document ? [row.document] : []))
  }
  return documents.flatMap(document => {
    const fields = normalize(document.fields)
    const changed = Object.keys(fields).filter(key => JSON.stringify(fields[key]) !== JSON.stringify(document.fields[key]))
    return changed.length ? [{ document, fields, changed }] : []
  })
}
const updates = await scan()
console.log(JSON.stringify(updates.map(({ document, fields, changed }) => ({ id: document.name.split('/').at(-1), name: fields.nameKo?.stringValue ?? fields.name?.stringValue, changed })), null, 2))
if (process.argv.includes('--apply') && updates.length) {
  await writeFile(new URL(`tea-terminology-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(updates.map(row => row.document), null, 2))
  await request(':commit', { method: 'POST', body: JSON.stringify({ writes: updates.map(({ document, fields, changed }) => ({ update: { name: document.name, fields: Object.fromEntries(changed.map(key => [key, fields[key]])) }, updateMask: { fieldPaths: changed }, currentDocument: { updateTime: document.updateTime } })) }) })
  if ((await scan()).length) throw new Error('Terminology verification failed')
  console.log(`Updated and verified ${updates.length} documents.`)
}
