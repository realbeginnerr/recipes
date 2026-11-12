import { beforeEach, expect, it } from 'vitest'
import { ingredientById } from '../src/data/ingredientCache'
import { changeRecipeItemUnit } from '../src/utils/recipeUnitChange'
import { canCalculateRecipeRow } from '../src/utils/recipeNutritionStatus'

beforeEach(() => {
  ingredientById.set('audit-ingredient', { id: 'audit-ingredient', name: 'Flour', nameKo: '밀가루', baseAmount: 100, baseUnit: 'g', carbs: 0, protein: 0, fat: 0, conversions: { g: 1, '컵': 200 }, allowedUnits: ['g', '컵'] })
})
it('preserves physical weight in a 200g to cup to gram round trip', () => {
  const initial = { ingredientId: 'audit-ingredient', defaultAmount: 200, defaultUnit: 'g', cookingGroup: '반죽' }
  const cup = changeRecipeItemUnit(initial, '컵')
  expect(cup.defaultAmount).toBe(1)
  expect(changeRecipeItemUnit(cup, 'g')).toEqual(initial)
  expect(initial.defaultAmount).toBe(200)
})
it('rejects unconvertible units without modifying the original quantity', () => {
  const initial = { ingredientId: 'audit-ingredient', defaultAmount: 200, defaultUnit: 'g' }
  expect(() => changeRecipeItemUnit(initial, 'oz')).toThrow()
  expect(initial).toEqual({ ingredientId: 'audit-ingredient', defaultAmount: 200, defaultUnit: 'g' })
})
it('distinguishes genuine zero nutrition from missing ingredient or conversion information', () => {
  expect(canCalculateRecipeRow({ ingredientId: 'audit-ingredient', amount: 0, unit: 'g' })).toBe(true)
  expect(canCalculateRecipeRow({ ingredientId: 'audit-ingredient', amount: 200, unit: 'g' })).toBe(true)
  expect(canCalculateRecipeRow({ ingredientId: 'missing', amount: 200, unit: 'g' })).toBe(false)
  expect(canCalculateRecipeRow({ ingredientId: 'audit-ingredient', amount: 200, unit: 'oz' })).toBe(false)
  expect(canCalculateRecipeRow({ ingredientId: 'audit-ingredient', amount: Infinity, unit: 'g' })).toBe(false)
})
