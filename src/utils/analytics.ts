import * as amplitude from '@amplitude/analytics-browser'

export function trackSignupClick() {
  amplitude.track('signup_click')
}

export function trackRecipeView(recipeNameKo: string, recipeName: string) {
  amplitude.track('recipe_view', { recipe_name_ko: recipeNameKo, recipe_name: recipeName })
}

export function trackAddRecipeModeSelected(mode: 'sns' | 'manual') {
  amplitude.track('add_recipe_mode_selected', { mode })
}

export function trackAddRecipeCompleted(mode: 'sns' | 'manual', recipeNameKo: string) {
  amplitude.track('add_recipe_completed', { mode, recipe_name_ko: recipeNameKo })
}

export function trackIngredientSearchOpened(context: 'main' | 'side') {
  amplitude.track('ingredient_search_opened', { context })
}
