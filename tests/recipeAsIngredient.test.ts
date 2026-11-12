import { expect, it } from 'vitest'
import type { Ingredient, Recipe } from '../src/types'
import { recipeAsIngredient, assertNoRecipeIngredientCycle } from '../src/utils/recipeAsIngredient'

const sugar: Ingredient = { id: 'sugar', name: 'Sugar', baseAmount: 100, baseUnit: 'g', carbs: 100, protein: 0, fat: 0, conversions: { g: 1, cup: 200 }, allowedUnits: ['g', 'cup'] }
function batch(): Recipe { return { id: 'paste', name: 'Paste', nameKo: '앙금', imageUrl: '', finishedWeightGrams: 500, divisionCount: 4, items: [{ ingredientId: 'sugar', defaultAmount: 1, defaultUnit: 'cup' }], sideItems: [{ ingredientId: 'sugar', defaultAmount: 999, defaultUnit: 'g' }] } }
it('uses the full main batch and finished weight, excluding portions and accompaniments', () => {
  const recipe = batch()
  const recipes = new Map([[recipe.id, recipe]])
  const ingredients = new Map([[sugar.id, sugar]])
  expect(recipeAsIngredient('paste', recipes, ingredients)).toEqual({ carbs: 40, protein: 0, fat: 0 })
  recipe.items[0].defaultAmount = 2
  expect(recipeAsIngredient('paste', recipes, ingredients).carbs).toBe(80)
  recipe.finishedWeightGrams = 1000
  expect(recipeAsIngredient('paste', recipes, ingredients).carbs).toBe(40)
})
it('resolves nested recipe ingredients and rejects cycles', () => {
  const recipe = batch()
  const linked = { ...sugar, id: 'paste-ingredient', sourceRecipeId: 'paste', carbs: 999 }
  const bread: Recipe = { ...batch(), id: 'bread', finishedWeightGrams: 200, items: [{ ingredientId: linked.id, defaultAmount: 100, defaultUnit: 'g' }] }
  const recipes = new Map([['paste', recipe], ['bread', bread]])
  const ingredients = new Map([[sugar.id, sugar], [linked.id, linked]])
  expect(recipeAsIngredient('bread', recipes, ingredients).carbs).toBe(20)
  recipe.items[0].ingredientId = linked.id
  expect(() => recipeAsIngredient('paste', recipes, ingredients)).toThrow(/순환/)
  expect(() => assertNoRecipeIngredientCycle('bread', recipes, ingredients)).toThrow(/순환/)
})
it('estimates from ingredient weight without a measured yield and rejects deleted source or missing nutrition', () => {
  const recipe = batch()
  const recipes = new Map([[recipe.id, recipe]])
  const ingredients = new Map([[sugar.id, sugar]])
  recipe.finishedWeightGrams = undefined
  expect(recipeAsIngredient('paste', recipes, ingredients).carbs).toBe(100)
  recipe.finishedWeightGrams = 500
  expect(() => recipeAsIngredient('deleted', recipes, ingredients)).toThrow(/찾을 수/)
  expect(() => recipeAsIngredient('paste', recipes, new Map())).toThrow(/식재료/)
  expect(() => recipeAsIngredient('paste', recipes, new Map([[sugar.id, { ...sugar, carbs: NaN }]]))).toThrow(/영양/)
})
