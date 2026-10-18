import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const sourceId = 'Tm2NJxtbz7kzRt2aJfxg'
const copyId = `tea-${sourceId}`
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
async function request(suffix, options = {}) {
  const response = await fetch(`${base}${suffix}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
const source = await request(`/recipes/${sourceId}`)
assert.equal(source.fields.nameKo.stringValue, '조용히 있고 싶은 날 (차)')
assert.notEqual(source.fields.deleted?.booleanValue, true)
const fields = {
  ...source.fields,
  catalog: { stringValue: 'tea' },
  sourceRecipeId: { stringValue: sourceId },
  categories: { arrayValue: { values: [{ stringValue: '차' }] } },
  createdAt: { integerValue: String(Date.now()) },
}
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ sourceId, copyId, name: source.fields.nameKo.stringValue, ingredients: fields.items.arrayValue.values.length }))
  process.exit(0)
}
await request(':commit', {
  method: 'POST',
  body: JSON.stringify({ writes: [{ update: { name: `${source.name.slice(0, source.name.lastIndexOf('/') + 1)}${copyId}`, fields }, currentDocument: { exists: false } }] }),
})
const copy = await request(`/recipes/${copyId}`)
assert.deepEqual(copy.fields, fields)
const original = await request(`/recipes/${sourceId}`)
assert.equal(original.updateTime, source.updateTime)
console.log(`Copied and verified: ${source.fields.nameKo.stringValue} (${copyId}); original unchanged.`)
