import { afterEach, expect, it, vi } from 'vitest'
import { ingredientById } from '../src/data/ingredientCache'
import { saveIngredientToFirestore } from '../src/services/ingredientService'
import { amountToGrams, calculateMacros } from '../src/utils/nutrition'

vi.mock('../src/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), addDoc: vi.fn(async () => ({ id: 'unit-test-ingredient' })),
  getDocs: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn(), doc: vi.fn(),
}))
afterEach(() => ingredientById.clear())

it('registers ml and pinch conversions and supports fixed oz/lbs weights', async () => {
  await saveIngredientToFirestore({ name: 'Unit test ingredient', nameKo: '테스트 재료', baseAmount: 100, baseUnit: 'g', carbs: 80, protein: 0, fat: 0, gramsPerMl: 1.25, gramsPerPinch: 5 })
  const ingredient = ingredientById.get('unit-test-ingredient')!
  expect(ingredient.conversions.ml).toBe(1.25)
  expect(ingredient.conversions['꼬집']).toBe(5)
  expect(ingredient.conversions.pinch).toBe(5)
  expect(ingredient.conversions.lbs).toBe(453.592)
  expect(ingredient.allowedUnits).toContain('꼬집')
  expect(calculateMacros(amountToGrams(2, '꼬집', ingredient.conversions), ingredient).carbs).toBe(8)
  expect(calculateMacros(amountToGrams(80, 'ml', ingredient.conversions), ingredient).carbs).toBe(80)
})
