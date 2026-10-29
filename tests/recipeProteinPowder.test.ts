import { afterEach, expect, it } from 'vitest'
import { ingredientById } from '../src/data/ingredientCache'
import { recipeProteinPowderGrams } from '../src/utils/recipeNutrition'
import type { Recipe } from '../src/types'

afterEach(() => ingredientById.clear())

it('shows powder weight per meal from sides, converts units, and ignores main ingredients', () => {
  ingredientById.set('powder', { id: 'powder', name: 'Protein powder', nameKo: '단백질 파우더', baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 80, fat: 5, conversions: { g: 1, scoop: 30 }, allowedUnits: ['g', 'scoop'] })
  ingredientById.set('milk', { id: 'milk', name: 'Milk', nameKo: '우유', baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 3, fat: 3, conversions: { g: 1 }, allowedUnits: ['g'] })
  const powder = { ingredientId: 'powder', defaultAmount: 2, defaultUnit: 'scoop' }
  const recipe: Recipe = { id: 'test', name: 'Test', nameKo: '테스트', imageUrl: '', divisionCount: 4, items: [powder], sideItems: [powder, { ingredientId: 'milk', defaultAmount: 100, defaultUnit: 'g' }] }
  expect(recipeProteinPowderGrams(recipe)).toBe(60)
  expect(recipeProteinPowderGrams({ ...recipe, sideItems: [] })).toBe(0)
  expect(recipeProteinPowderGrams({ ...recipe, sideItems: [{ ...powder, defaultAmount: 0 }] })).toBe(0)
})
