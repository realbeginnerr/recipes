import { readFile } from 'node:fs/promises'
import ts from 'typescript'

function evaluate(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const exports = {}
  new Function('exports', outputText)(exports)
  return exports
}
const read = async path => evaluate(await readFile(new URL(path, import.meta.url), 'utf8'))
const { ingredientCsvData } = await read('../src/data/ingredientCsvData.ts')
const { ingredients } = await read('../src/data/ingredients.ts')
const { ingredientNameOverrides, retiredIngredientIds } = await read('../src/data/ingredientCatalogOverrides.ts')
const response = await fetch('https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents:runQuery', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'ingredients' }] } }),
  signal: AbortSignal.timeout(30000),
})
if (!response.ok) throw new Error(await response.text())
const remote = (await response.json()).flatMap(row => row.document ? [{ id: row.document.name.split('/').pop(), ...Object.fromEntries(Object.entries(row.document.fields).map(([key, value]) => [key, value.stringValue ?? value.doubleValue ?? Number(value.integerValue)])) }] : [])
const catalog = new Map(ingredients.map(row => [row.id, row]))
for (const row of remote) catalog.set(row.id, row)
for (const row of ingredientCsvData) catalog.set(row.id, { ...catalog.get(row.id), ...row })
const { ingredientCategory: classify, reviewedIngredientCategory } = await read('../src/utils/ingredientCategory.ts')
const groups = {}
const unreviewed = []
for (const [id, row] of catalog) {
  if (retiredIngredientIds.has(id)) continue
  const ingredient = { ...row, ...ingredientNameOverrides[id] }
  const name = ingredient.nameKo || ingredient.name
  const category = classify(ingredient, row.category)
  ;(groups[category] ??= []).push(name)
  if (!reviewedIngredientCategory(ingredient)) unreviewed.push({ id, name })
}
console.log(JSON.stringify({ count: Object.values(groups).reduce((sum, names) => sum + names.length, 0), groups, unreviewed }, null, 2))
if (unreviewed.length) process.exitCode = 1
