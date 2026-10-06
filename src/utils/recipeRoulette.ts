export const RECENT_RECIPE_EXCLUSION_COUNT = 5
export const ROULETTE_SPIN_DURATION_MS = 4200
export const ROULETTE_TRAVEL_CARDS = 24

export function chooseRecipe<T extends { id: string }>(recipes: readonly T[], recentIds: readonly string[], random = Math.random): T | undefined {
  if (!recipes.length) return undefined
  // Retain the newest exclusions first; always leave at least one candidate.
  const liveIds = new Set(recipes.map(recipe => recipe.id))
  const excluded = new Set([...new Set(recentIds.filter(id => liveIds.has(id)))].slice(0, Math.min(RECENT_RECIPE_EXCLUSION_COUNT, recipes.length - 1)))
  const candidates = recipes.filter(recipe => !excluded.has(recipe.id))
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]
}

export const rouletteProgress = (progress: number) => 1 - (1 - progress) ** 3
