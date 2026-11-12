import type { Ingredient, Recipe } from '../types'

export function assertNoRecipeIngredientCycle(recipeId: string, recipes: ReadonlyMap<string, Recipe>, ingredients: ReadonlyMap<string, Ingredient>, path = new Set<string>()) {
  if (path.has(recipeId)) throw new Error('레시피와 식재료가 서로를 참조하고 있습니다. 순환 연결을 해제해 주세요.')
  const next = new Set(path).add(recipeId)
  for (const item of recipes.get(recipeId)?.items ?? []) {
    const source = ingredients.get(item.ingredientId)?.sourceRecipeId
    if (source) assertNoRecipeIngredientCycle(source, recipes, ingredients, next)
  }
}

// A recipe's sideItems are serving accompaniments, not part of its finished batch.
export function recipeAsIngredient(recipeId: string, recipes: ReadonlyMap<string, Recipe>, ingredients: ReadonlyMap<string, Ingredient>, visiting = new Set<string>()): { carbs: number; protein: number; fat: number } {
  if (visiting.has(recipeId)) throw new Error('레시피와 식재료가 서로를 참조하고 있습니다. 순환 연결을 해제해 주세요.')
  const recipe = recipes.get(recipeId)
  if (!recipe) throw new Error('연결된 레시피를 찾을 수 없습니다.')
  if (!recipe.items.length) throw new Error('원본 레시피에 주재료가 없습니다.')
  const path = new Set(visiting).add(recipeId)
  const totals = { carbs: 0, protein: 0, fat: 0 }
  let ingredientWeight = 0
  for (const item of recipe.items) {
    const ingredient = ingredients.get(item.ingredientId)
    if (!ingredient) throw new Error('원본 레시피의 식재료 정보를 찾을 수 없습니다.')
    const nested = ingredient.sourceRecipeId ? recipeAsIngredient(ingredient.sourceRecipeId, recipes, ingredients, path) : null
    const factor = ingredient.conversions[item.defaultUnit]
    const base = nested ? 100 : ingredient.baseAmount * ingredient.conversions[ingredient.baseUnit]
    const amount = item.defaultAmount
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(factor) || factor <= 0 || !Number.isFinite(base) || base <= 0) throw new Error('원본 레시피의 수량·단위 환산 정보를 확인해 주세요.')
    ingredientWeight += amount * factor
    for (const key of ['carbs', 'protein', 'fat'] as const) {
      const value = (nested ?? ingredient)[key]
      if (!Number.isFinite(value) || value < 0) throw new Error('원본 식재료의 영양 정보를 확인해 주세요.')
      totals[key] += amount * factor / base * value
    }
  }
  // Reuse an existing measured yield, but never require or change it during selection.
  // Without a measured yield this is an input-weight estimate, not a cooked-weight claim.
  const weight = recipe.finishedWeightGrams && Number.isFinite(recipe.finishedWeightGrams) && recipe.finishedWeightGrams > 0 ? recipe.finishedWeightGrams : ingredientWeight
  if (!Number.isFinite(weight) || weight <= 0) throw new Error('원본 주재료의 합산 중량을 계산할 수 없습니다.')
  for (const key of ['carbs', 'protein', 'fat'] as const) {
    totals[key] *= 100 / weight
    if (!Number.isFinite(totals[key])) throw new Error('영양 값을 계산할 수 없습니다.')
  }
  return totals
}

export function scaleRecipeIngredientNutrition(macros: { carbs: number; protein: number; fat: number }, usageGrams: number) {
  if (!Number.isFinite(usageGrams) || usageGrams <= 0) throw new Error('사용중량은 0보다 큰 g 값으로 입력해 주세요.')
  const scaled = { carbs: macros.carbs * usageGrams / 100, protein: macros.protein * usageGrams / 100, fat: macros.fat * usageGrams / 100 }
  if (Object.values(scaled).some(value => !Number.isFinite(value))) throw new Error('사용중량에 맞는 영양 값을 계산할 수 없습니다.')
  return scaled
}
