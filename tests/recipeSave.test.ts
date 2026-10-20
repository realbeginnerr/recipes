import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recipe } from '../src/types'
import { ingredientById } from '../src/data/ingredientCache'

vi.mock('../src/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), addDoc: vi.fn(), doc: vi.fn(() => 'recipe-ref'),
  getDocs: vi.fn(), orderBy: vi.fn(), query: vi.fn(), setDoc: vi.fn(),
}))

import { setDoc } from 'firebase/firestore'
import { updateRecipeInFirestore } from '../src/services/recipeService'

const recipe = (): Recipe => ({
  id: 'eggplant', name: 'Eggplant Stir-Fry', nameKo: '가지볶음', imageUrl: '',
  items: [
    { ingredientId: 'green-onion', defaultAmount: NaN, defaultUnit: 'g' },
    { ingredientId: 'replacement-soy-sauce', defaultAmount: 80, defaultUnit: 'g' },
  ],
})

beforeEach(() => {
  vi.clearAllMocks()
  ingredientById.clear()
  for (const id of ['green-onion', 'replacement-soy-sauce']) {
    ingredientById.set(id, { id, name: id, baseAmount: 100, baseUnit: 'g', carbs: 10, protein: 0, fat: 0, conversions: { g: 1 }, allowedUnits: ['g'] })
  }
})

describe('saving a recipe with existing invalid quantities', () => {
  it('blocks a unit without a conversion before writing', async () => {
    const missing = recipe()
    missing.items[0].defaultAmount = 100
    missing.items[1].defaultUnit = 'T'
    await expect(updateRecipeInFirestore(missing)).rejects.toMatchObject({ code: 'recipe/missing-conversion' })
    expect(setDoc).not.toHaveBeenCalled()
  })
  it('rejects NaN with an identifiable error before writing to Firestore', async () => {
    await expect(updateRecipeInFirestore(recipe())).rejects.toMatchObject({ code: 'recipe/invalid-amount' })
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('saves the replacement ingredient after the invalid quantity is corrected', async () => {
    const corrected = recipe()
    corrected.items[0].defaultAmount = 30
    corrected.items[0].cookingGroup = ' 양념장 '
    await updateRecipeInFirestore(corrected)
    expect(setDoc).toHaveBeenCalledWith('recipe-ref', expect.objectContaining({ items: [
      { ingredientId: 'green-onion', amount: 30, unit: 'g', cookingGroup: '양념장' },
      { ingredientId: 'replacement-soy-sauce', amount: 80, unit: 'g' },
    ] }))
  })
})
