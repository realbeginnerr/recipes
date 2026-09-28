import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Use the same category defaults as the app, without loading browser modules.
const source = await readFile(new URL('../src/utils/recipeCategory.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { getRecipeCategories } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'

async function request(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}

const results = await request(`${base}:runQuery`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'recipes' }] } }),
})
let updated = 0
// Explicit recipe names update only those recipes to the current app defaults.
const targetNames = new Set(process.argv.slice(2))
for (const { document } of results) {
  if (!document) continue
  const nameKo = document.fields.nameKo?.stringValue ?? document.fields.name?.stringValue ?? ''
  if (targetNames.size ? !targetNames.has(nameKo) : document.fields.categories) continue
  const categories = getRecipeCategories({ nameKo })
  const params = new URLSearchParams({
    'updateMask.fieldPaths': 'categories',
    'currentDocument.updateTime': document.updateTime,
  })
  await request(`https://firestore.googleapis.com/v1/${document.name}?${params}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { categories: { arrayValue: { values: categories.map(stringValue => ({ stringValue })) } } } }),
  })
  updated++
  console.log(`Saved categories: ${nameKo} (${categories.join(', ')})`)
}
console.log(`Updated ${updated} recipes.`)
