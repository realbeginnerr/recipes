import { readFile, writeFile, access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

// Match the fallback currently used by the ingredient list; keep existing overrides.
const source = (await readFile(new URL('../src/data/ingredientPresentation.ts', import.meta.url), 'utf8'))
  .replace('import.meta.env.BASE_URL', JSON.stringify('/recipes/'))
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const exports = {}
new Function('exports', outputText)(exports)
const references = exports.ingredientPresentation
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
async function request(suffix, body) {
  const response = await fetch(`${base}${suffix}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
const snapshot = await request(':runQuery', { structuredQuery: { from: [{ collectionId: 'ingredients' }] } })
const documents = snapshot.flatMap(row => row.document ? [row.document] : [])
const changes = []
const writes = []
for (const document of documents) {
  if (Object.hasOwn(document.fields, 'imageUrl')) continue
  const name = document.fields.nameKo?.stringValue || document.fields.name?.stringValue || ''
  const reference = references[name] ?? Object.entries(references).find(([key]) => name.includes(key))?.[1]
  const imageUrl = reference?.image ?? ''
  if (imageUrl.startsWith('/recipes/images/')) {
    await access(new URL(`../public/${imageUrl.slice('/recipes/'.length)}`, import.meta.url))
  }
  changes.push({ id: document.name.split('/').pop(), name, imageUrl })
  writes.push({ update: { name: document.name, fields: { imageUrl: { stringValue: imageUrl } } },
    updateMask: { fieldPaths: ['imageUrl'] }, currentDocument: { updateTime: document.updateTime } })
}
await writeFile(new URL('ingredient-images-report.json', import.meta.url), JSON.stringify({ total: documents.length, preserved: documents.length - changes.length, changes }, null, 2))
console.log(JSON.stringify({ total: documents.length, preserved: documents.length - changes.length, addImage: changes.filter(c => c.imageUrl).length, emptyImage: changes.filter(c => !c.imageUrl).map(c => c.name) }, null, 2))
if (process.argv.includes('--apply') && writes.length) {
  if (writes.length > 500) throw new Error('Too many writes for an atomic commit')
  await writeFile(new URL(`ingredient-images-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(snapshot, null, 2))
  const result = await request(':commit', { writes })
  console.log(`Updated ${result.writeResults.length} imageUrl fields.`)
  const verified = await request(':runQuery', { structuredQuery: { from: [{ collectionId: 'ingredients' }] } })
  const actual = new Map(verified.flatMap(row => row.document ? [[row.document.name.split('/').pop(), row.document.fields.imageUrl?.stringValue]] : []))
  for (const change of changes) if (actual.get(change.id) !== change.imageUrl) throw new Error(`Verification failed: ${change.id}`)
  console.log('Verified all updated imageUrl fields.')
}
