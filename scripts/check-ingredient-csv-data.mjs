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
assert.equal(catalogOverrides.ingredientNameOverrides['jEqm93wSTmv5KCvkGM9q'].nameKo, '강력분 (백설. 밀가루)')
assert.equal(ingredientById.get('csv-24e179482ad1206b64c73ea1').nameKo, '강력분 (백설. 밀가루)')
assert.equal(ingredientById.get('csv-58680b03a814640efc4d31ee').nameKo, '깨 (들깨가루)')
assert.equal(ingredientById.has('csv-23e6f8fadaba3e987bdfc402'), false)
assert.ok(service.findIngredientByName('계란'))
console.log('CSV values, aliases, existing IDs/metadata, cleared N/A conversions, and recipe nutrition lookup verified.')

const keptGarlicId = 'KiclanzESLnu5nzgri5x'
const mergedGarlicId = 'PVB1l0VMQQh0Nmr1Sa7h'
assert.equal(ingredientById.has(mergedGarlicId), false)
assert.equal(service.findIngredientByName('다진마늘').id, keptGarlicId)
const originalRecipe = {
  name: 'Garlic recipe', nameKo: '마늘 레시피',
  items: [{ ingredientId: mergedGarlicId, amount: 2, unit: 'T' }],
  sideItems: [{ ingredientId: mergedGarlicId, amount: 5, unit: 'g' }],
}
let writtenRecipe
const recipes = await evaluate('../src/services/recipeService.ts', {
  '../firebase': { db: {} },
  '../data/ingredientCatalogOverrides': catalogOverrides,
  '../utils/recipeCategory': { getRecipeCategories: () => [] },
  'firebase/firestore': {
    collection: () => ({}), query: () => ({}), orderBy: () => ({}), doc: () => ({}),
    getDocs: async () => ({ docs: [{ id: 'recipe', data: () => originalRecipe }] }),
    setDoc: async (_ref, data) => { writtenRecipe = data },
    addDoc: async (_ref, data) => { writtenRecipe = data; return { id: 'new' } },
  },
})
const [linkedRecipe] = await recipes.loadRecipesFromFirestore()
assert.deepEqual(linkedRecipe.items, [{ ingredientId: keptGarlicId, amount: 2, unit: 'T' }])
assert.deepEqual(linkedRecipe.sideItems, [{ ingredientId: keptGarlicId, amount: 5, unit: 'g' }])
const converted = recipes.convertToRecipe({ id: 'recipe', ...originalRecipe })
const related = await evaluate('../src/utils/recipeIngredients.ts', { '../data/ingredientCatalogOverrides': catalogOverrides })
assert.equal(related.recipeContainsIngredient(converted, keptGarlicId), true)
await recipes.updateRecipeInFirestore(converted)
assert.deepEqual(writtenRecipe.items, linkedRecipe.items)
assert.deepEqual(writtenRecipe.sideItems, linkedRecipe.sideItems)
await recipes.saveRecipeToFirestore(originalRecipe)
assert.deepEqual(writtenRecipe.items, linkedRecipe.items)
assert.deepEqual(writtenRecipe.sideItems, linkedRecipe.sideItems)
assert.equal(originalRecipe.items[0].ingredientId, mergedGarlicId)
console.log('Duplicate garlic merged; recipe links, amounts, units, and saves verified.')
