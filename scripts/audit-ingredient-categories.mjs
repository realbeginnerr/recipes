import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

function evaluate(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
  const exports = {}
  new Function('exports', outputText)(exports)
  return exports
}
const read = async path => evaluate(await readFile(new URL(path, import.meta.url), 'utf8'))
const accessToken = execFileSync('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token',
], { encoding: 'utf8' }).trim()
const response = await fetch('https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents:runQuery', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'ingredients' }] } }),
  signal: AbortSignal.timeout(30000),
})
if (!response.ok) throw new Error(await response.text())
function decodeValue(value) {
  if ('stringValue' in value) return value.stringValue
  if ('doubleValue' in value) return value.doubleValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('booleanValue' in value) return value.booleanValue
  return undefined
}
const catalog = (await response.json()).flatMap(row => row.document ? [{
  id: row.document.name.split('/').pop(),
  ...Object.fromEntries(Object.entries(row.document.fields).map(([key, value]) => [key, decodeValue(value)])),
}] : []).filter(ingredient => !ingredient.retired)
const { ingredientCategory: classify, reviewedIngredientCategory } = await read('../src/utils/ingredientCategory.ts')
const groups = {}
const unreviewed = []
for (const ingredient of catalog) {
  const name = ingredient.nameKo || ingredient.name
  const category = classify(ingredient, ingredient.category)
  ;(groups[category] ??= []).push(name)
  if (!reviewedIngredientCategory(ingredient)) unreviewed.push({ id: ingredient.id, name })
}
console.log(JSON.stringify({ count: Object.values(groups).reduce((sum, names) => sum + names.length, 0), groups, unreviewed }, null, 2))
if (unreviewed.length) process.exitCode = 1
