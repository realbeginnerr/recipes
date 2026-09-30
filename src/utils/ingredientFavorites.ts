const FAVORITES_KEY = 'ingredient_favorites'
const FAVORITES_DEFAULTS_MIGRATED_KEY = 'ingredient_favorites_defaults_v2'
const DEFAULT_FAVORITE_IDS = [
  '4mQc6rR1uVANftIkGSmc',
  '73jxlRA7fzKJm2JLdzMP',
  'RmjGbcCJBOM2zSueqnyW',
]

export function loadFavoriteIngredientIds(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const saved: unknown = raw ? JSON.parse(raw) : []
    const favorites = new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [])
    if (localStorage.getItem(FAVORITES_DEFAULTS_MIGRATED_KEY) !== 'true') {
      DEFAULT_FAVORITE_IDS.forEach(id => favorites.add(id))
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)))
      localStorage.setItem(FAVORITES_DEFAULTS_MIGRATED_KEY, 'true')
    }
    return new Set([...favorites].map(canonicalIngredientId))
  } catch {
    return new Set(DEFAULT_FAVORITE_IDS)
  }
}

export function saveFavoriteIngredientIds(ids: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)))
  localStorage.setItem(FAVORITES_DEFAULTS_MIGRATED_KEY, 'true')
}
import { canonicalIngredientId } from '../data/ingredientCatalogOverrides'
