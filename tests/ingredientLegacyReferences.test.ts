import { expect, it, vi } from 'vitest'
vi.mock('../src/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), addDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [
    { id: '9WeXrM3WaIuTgQLipEdZ', data: () => ({ name: 'Onion', nameKo: '양파 (냉장)', baseAmount: 100, baseUnit: 'g', carbs: 9.3, protein: 1.1, fat: 0.1, gramsPerEach: 170 }) },
    { id: 'csv-33f260e0ceece725d98ebfbe', data: () => ({ name: 'Potato', nameKo: '감자 (실온)', baseAmount: 150, baseUnit: 'g', carbs: 25, protein: 3, fat: 0.1, gramsPerEach: 150 }) },
  ] })),
}))
import { loadIngredientsFromFirestore, getIngredientById } from '../src/services/ingredientService'
import { ingredientById } from '../src/data/ingredientCache'
import { canonicalIngredientId } from '../src/data/ingredientCatalogOverrides'
import { buildInitialRecipeStates } from '../src/utils/recipeState'

it('resolves the old dakgalbi ingredient IDs without changing quantities or units', async () => {
  await loadIngredientsFromFirestore()
  const cases = [
    { oldId: 'myqweahoroS1k1eaTQmi', id: '9WeXrM3WaIuTgQLipEdZ', name: '양파 (냉장)', amount: 75, unit: 'g' },
    { oldId: 'THpcK1CLYcnCS3ZEilmj', id: 'csv-33f260e0ceece725d98ebfbe', name: '감자 (실온)', amount: 3, unit: '개' },
  ]
  for (const item of cases) {
    expect(ingredientById.get(item.oldId)?.nameKo).toBe(item.name)
    expect(ingredientById.get(item.oldId)).toBe(ingredientById.get(item.id))
    expect(canonicalIngredientId(item.oldId)).toBe(item.id)
    expect(getIngredientById(item.oldId)?.nameKo).toBe(item.name)
  }
  expect(ingredientById.get(cases[1].oldId)?.conversions['개']).toBe(150)
  const recipe = { id: 'dakgalbi', name: 'Dakgalbi', imageUrl: '', items: cases.map(item => ({ ingredientId: item.oldId, defaultAmount: item.amount, defaultUnit: item.unit })) }
  expect(buildInitialRecipeStates('ko', [recipe]).dakgalbi).toEqual(cases.map(item => ({ ingredientId: item.oldId, amount: item.amount, unit: item.unit })))
})
