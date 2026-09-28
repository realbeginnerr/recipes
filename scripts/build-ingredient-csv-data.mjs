import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const report = JSON.parse(await readFile(new URL('ingredients-import-report.json', import.meta.url), 'utf8'))
assert.equal(report.pending.length, 0, 'Resolve pending CSV rows first')
const rows = report.changes.map(change => ({ id: change.id, nameKo: change.csvName, ...change.data }))
assert.equal(new Set(rows.map(row => row.nameKo)).size, report.uniqueRows)
for (const row of rows) {
  assert.equal(row.baseUnit, 'g')
  assert.ok(row.baseAmount > 0)
  for (const field of ['carbs', 'protein', 'fat']) assert.ok(Number.isFinite(row[field]) && row[field] >= 0)
}
const egg = rows.find(row => row.nameKo === '계란')
assert.equal(egg.baseAmount, 55)
assert.equal(egg.baseAmount / egg.gramsPerEach, 1)
assert.deepEqual([egg.carbs, egg.protein, egg.fat], [0.4, 6.3, 5.3])
const pepper = rows.find(row => row.nameKo === '고춧가루')
assert.equal(pepper.baseAmount / pepper.gramsPerTbsp, 1)
assert.equal(pepper.baseAmount / pepper.gramsPerTsp, 3)
const cream = rows.find(row => row.nameKo.startsWith('크림소스 (폰타나.'))
assert.equal(cream.baseAmount, 100)
assert.deepEqual([cream.carbs, cream.protein, cream.fat], [8, 2, 13])
await writeFile(new URL('../src/data/ingredientCsvData.ts', import.meta.url),
  '// Generated from scripts/ingredients-import.csv via the reviewed import report.\n' +
  'export const ingredientCsvData = ' + JSON.stringify(rows, null, 2) + '\n')
console.log(`Validated and generated ${report.uniqueRows} CSV ingredients across ${rows.length} preserved/new IDs.`)
