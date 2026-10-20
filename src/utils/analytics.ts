import * as amplitude from '@amplitude/analytics-browser'

export function trackRecipeView(recipeNameKo: string, recipeName: string) {
  amplitude.track('recipe_view', { recipe_name_ko: recipeNameKo, recipe_name: recipeName })
}

export function trackAddRecipeCompleted(mode: 'manual', recipeNameKo: string) {
  amplitude.track('add_recipe_completed', { mode, recipe_name_ko: recipeNameKo })
}

export function trackIngredientSearchOpened(context: 'main' | 'side') {
  amplitude.track('ingredient_search_opened', { context })
}
