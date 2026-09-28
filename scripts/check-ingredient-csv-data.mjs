import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import ts from 'typescript'

async function evaluate(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const exports = {}
  new Function('exports', 'require', outputText)(exports, name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`)
    return imports[name]
  })
  return exports
}
const csv = await evaluate('../src/data/ingredientCsvData.ts')
const catalogOverrides = await evaluate('../src/data/ingredientCatalogOverrides.ts')
const ingredientById = new Map()
const eggplant = csv.ingredientCsvData.find(row => row.nameKo === '가지')
const service = await evaluate('../src/services/ingredientService.ts', {
  '../data/ingredientCsvData': csv,
  '../data/ingredients': { ingredientById },
  '../data/ingredientCatalogOverrides': catalogOverrides,
  '../firebase': { db: {} },
  'firebase/firestore': {
    collection: () => ({}),
    getDocs: async () => ({ docs: [{ id: eggplant.id, data: () => ({ name: 'Eggplant', nameKo: '가지 (중)', baseAmount: 100, baseUnit: 'g', carbs: 99, protein: 99, fat: 99, gramsPerTbsp: 99, gramsPerEach: 999, imageUrl: 'existing-image.jpg' }) }] }),
  },
})
const egg = service.findIngredientByName('계란')
assert.equal(egg.baseAmount / egg.gramsPerEach, 1)
assert.deepEqual([egg.baseAmount, egg.carbs, egg.protein, egg.fat], [55, 0.4, 6.3, 5.3])
await service.loadIngredientsFromFirestore()
const loaded = service.findIngredientByName('가지')
assert.equal(loaded.id, eggplant.id)
assert.equal(loaded.baseAmount, 130)
assert.equal(loaded.gramsPerEach, 130)
assert.equal(loaded.gramsPerTbsp, undefined)
assert.equal(loaded.imageUrl, 'existing-image.jpg')
assert.equal(ingredientById.get(eggplant.id).carbs, 3.8)
assert.equal(ingredientById.get(eggplant.id).conversions['개'], 130)
assert.equal(ingredientById.get('9WeXrM3WaIuTgQLipEdZ').nameKo, '양파')
assert.ok(service.findIngredientByName('계란'))
console.log('CSV values, aliases, existing IDs/metadata, cleared N/A conversions, and recipe nutrition lookup verified.')
