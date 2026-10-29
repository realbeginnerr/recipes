import { expect, it, vi } from 'vitest'
import { buildConversions } from '../src/services/ingredientService'
import { amountToGrams, calculateMacros } from '../src/utils/nutrition'
import { hasNutritionConversion } from '../src/utils/recipeUnitValidation'

vi.mock('../src/firebase', () => ({ db: {} }))

it('calculates gram-based nutrition from per-piece nutrition and grams per piece', () => {
  const ingredient = { id: 'fish', name: 'Mackerel', baseAmount: 1, baseUnit: '개', carbs: 0, protein: 40, fat: 20, allowedUnits: [], conversions: buildConversions({ baseUnit: '개', gramsPerEach: 200 }) }
  expect(hasNutritionConversion(ingredient, 'g')).toBe(true)
  expect(ingredient.conversions.each).toBe(200)
  expect(calculateMacros(amountToGrams(100, 'g', ingredient.conversions), ingredient)).toEqual({ carbs: 0, protein: 20, fat: 10 })
  expect(calculateMacros(amountToGrams(1, '개', ingredient.conversions), ingredient).protein).toBe(40)
})

it('does not invent gram conversion for a piece with no known weight', () => {
  expect(buildConversions({ baseUnit: '개' }).g).toBeUndefined()
  expect(buildConversions({ baseUnit: '개', gramsPerEach: 0 }).g).toBeUndefined()
  expect(buildConversions({ baseUnit: 'g', gramsPerEach: 200 }).g).toBe(1)
})
