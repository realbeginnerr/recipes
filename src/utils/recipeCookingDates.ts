type CookingHistory = { cookedDates?: string[]; lastCookedAt?: string }

export function recipeCookingDates(recipe: CookingHistory): string[] {
  const values = recipe.cookedDates ?? (recipe.lastCookedAt ? [recipe.lastCookedAt] : [])
  return [...new Set(values.filter(value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }))].sort()
}

export function recipeCookingHistory(recipe: CookingHistory) {
  const cookedDates = recipeCookingDates(recipe)
  return { cookedDates, lastCookedAt: cookedDates.at(-1) }
}
