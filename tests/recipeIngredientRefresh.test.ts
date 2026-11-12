import { expect, it, vi } from 'vitest'
vi.mock('../src/firebase', () => ({ db: {} }))
vi.mock('../src/data/recipe', () => ({ recipes: [] }))
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), doc: vi.fn(), addDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(), getDocs: vi.fn(async () => ({ docs: [
  { id: 'sugar', data: () => ({ name: 'Sugar', nameKo: '설탕', baseAmount: 100, baseUnit: 'g', carbs: 100, protein: 0, fat: 0 }) },
  { id: 'paste-ingredient', data: () => ({ name: 'Paste', nameKo: '앙금', sourceRecipeId: 'paste', baseAmount: 200, baseUnit: 'g', carbs: 999, protein: 0, fat: 0 }) },
] })) }))
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: vi.fn(), mergeStaticAndFirestoreRecipes: (_static: unknown, docs: unknown) => docs }))
import { loadRecipesFromFirestore } from '../src/services/recipeService'
import { loadIngredientsFromFirestore, getIngredientById, saveIngredientToFirestore } from '../src/services/ingredientService'
import { addDoc } from 'firebase/firestore'
import { ingredientById } from '../src/data/ingredientCache'

it('refreshes linked nutrition on the next load, including source weight changes and deletion', async () => {
  const recipe = { id: 'paste', name: 'Paste', nameKo: '앙금', imageUrl: '', finishedWeightGrams: 500, items: [{ ingredientId: 'sugar', defaultAmount: 200, defaultUnit: 'g' }] }
  vi.mocked(loadRecipesFromFirestore).mockResolvedValue([recipe] as never)
  await loadIngredientsFromFirestore()
  expect(ingredientById.get('paste-ingredient')?.carbs).toBe(80)
  expect(ingredientById.get('paste-ingredient')?.baseAmount).toBe(200)
  recipe.finishedWeightGrams = 1000
  await loadIngredientsFromFirestore()
  expect(getIngredientById('paste-ingredient')?.carbs).toBe(40)
  expect(getIngredientById('paste-ingredient')?.baseAmount).toBe(200)
  vi.mocked(loadRecipesFromFirestore).mockResolvedValue([])
  await loadIngredientsFromFirestore()
  expect(Number.isNaN(ingredientById.get('paste-ingredient')?.carbs)).toBe(true)
  expect(ingredientById.get('paste-ingredient')?.recipeNutritionError).toContain('찾을 수')
})
it('persists the chosen usage weight and its nutrition rather than resetting to 100g', async () => {
  vi.mocked(loadRecipesFromFirestore).mockResolvedValue([{ id: 'paste', name: 'Paste', nameKo: '앙금', imageUrl: '', finishedWeightGrams: 1000, items: [{ ingredientId: 'sugar', defaultAmount: 200, defaultUnit: 'g' }] }] as never)
  vi.mocked(addDoc).mockResolvedValue({ id: 'new-paste' } as never)
  await saveIngredientToFirestore({ sourceRecipeId: 'paste', name: 'Paste', nameKo: '앙금', baseAmount: 250, baseUnit: 'g', carbs: 999, protein: 0, fat: 0 })
  expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({ sourceRecipeId: 'paste', baseAmount: 250, carbs: 50, baseUnit: 'g' }))
  expect(ingredientById.get('new-paste')?.baseAmount).toBe(250)
  expect(ingredientById.get('new-paste')?.carbs).toBe(50)
})
