import type { Ingredient, Recipe } from '../types'
import type { Language } from '../i18n/translations'

export function getIngredientDisplayName(
  ingredient: Ingredient,
  language: Language,
): string {
  if (language === 'ko' && ingredient.nameKo) {
    return ingredient.nameKo
  }
  return toTitleCase(ingredient.name)
}

export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getRecipeDisplayName(recipe: Recipe, language: Language): string {
  return language === 'ko' ? recipe.nameKo : toTitleCase(recipe.name)
}
