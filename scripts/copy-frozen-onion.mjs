import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
async function request(path, body) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
const rows = await request(':runQuery', { structuredQuery: { from: [{ collectionId: 'ingredients' }] } })
const active = rows.flatMap(row => row.document && !row.document.fields.retired?.booleanValue ? [row.document] : [])
const matches = active.filter(doc => doc.fields.nameKo?.stringValue === '양파 (냉장)')
assert.equal(matches.length, 1, 'Expected exactly one refrigerated onion')
assert.equal(active.filter(doc => doc.fields.nameKo?.stringValue === '양파 (냉동)').length, 0, 'Frozen onion already exists')
const source = matches[0]
const fields = structuredClone(source.fields)
delete fields.id
delete fields.legacyIds
fields.nameKo = { stringValue: '양파 (냉동)' }
fields.name = { stringValue: 'Onion (frozen)' }
fields.storageLocation = { stringValue: '냉동실' }
fields.createdAt = { integerValue: String(Date.now()) }
const target = `${source.name}-frozen`
console.log(JSON.stringify({ source: source.fields.nameKo.stringValue, target: fields.nameKo.stringValue, id: target.split('/').at(-1) }))
if (process.argv.includes('--apply')) {
  await request(':commit', { writes: [{ update: { name: target, fields }, currentDocument: { exists: false } }] })
  const saved = await request(`/ingredients/${target.split('/').at(-1)}`)
  assert.deepEqual(saved.fields, fields)
  console.log('Created and verified frozen onion.')
}
