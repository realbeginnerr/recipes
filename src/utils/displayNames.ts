import type { Ingredient, Recipe } from '../types'
import type { Language } from '../i18n/translations'
import { translateContent } from '../i18n/content'
import { INGREDIENT_UNITS } from '../constants/ingredientUnits'

export function getUnitDisplayName(unit: string, language: Language): string {
  const known = INGREDIENT_UNITS.find(value => value.ko === unit || value.en === unit)
  return known ? known[language] : unit
}

export function getIngredientDisplayName(
  ingredient: Pick<Ingredient, 'name' | 'nameKo'>,
  language: Language,
): string {
  if (language === 'ko' && ingredient.nameKo) {
    return ingredient.nameKo
  }
  return toTitleCase(translateContent(ingredient.name, language))
}

export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getRecipeDisplayName(recipe: Pick<Recipe, 'name' | 'nameKo'>, language: Language): string {
  if (language === 'ko') return recipe.nameKo || recipe.name
  const translated = translateContent(recipe.nameKo, language)
  return toTitleCase(translated !== recipe.nameKo ? translated : translateContent(recipe.name, language))
}
