import { afterEach, describe, expect, it } from 'vitest'
import { ingredientById } from '../src/data/ingredientCache'
import { buildInitialRecipeStates, applyLanguageToRecipeStates } from '../src/utils/recipeState'
import type { Recipe } from '../src/types'

afterEach(() => ingredientById.clear())

describe('saved recipe units', () => {
  it('preserves pinches without a grams conversion when opening and changing language', () => {
    ingredientById.set('salt', { id: 'salt', name: 'Salt', baseUnit: 'g', baseAmount: 100, carbs: 0, protein: 0, fat: 0, allowedUnits: ['g', 'oz'], conversions: { g: 1, oz: 28.3495 } })
    const recipe: Recipe = { id: 'radish', name: 'Radish pancake', nameKo: '무전', imageUrl: '', items: [{ ingredientId: 'salt', defaultAmount: 2, defaultUnit: '꼬집' }] }
    const states = buildInitialRecipeStates('ko', [recipe])
    expect(states.radish[0]).toEqual({ ingredientId: 'salt', amount: 2, unit: '꼬집' })
    expect(applyLanguageToRecipeStates(states, 'en')).toEqual(states)
    expect(buildInitialRecipeStates('ko', [recipe])).toEqual(states)
  })
  it('keeps egg counts instead of converting them to grams', () => {
    ingredientById.set('egg', { id: 'egg', name: 'Egg', baseUnit: 'g', baseAmount: 100, carbs: 1, protein: 12, fat: 10, allowedUnits: ['g', '개'], conversions: { g: 1, 개: 50 } })
    const states = { shrimp: [{ ingredientId: 'egg', amount: 3, unit: '개' }] }
    expect(applyLanguageToRecipeStates(states, 'ko')).toEqual(states)
  })
})
