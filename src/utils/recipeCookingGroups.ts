import type { RecipeItem, RecipeRowState } from '../types'

export function recipeCookingGroups(rows: RecipeRowState[], items: RecipeItem[]) {
  const groups = new Map<string, { row: RecipeRowState; index: number }[]>()
  rows.forEach((row, index) => {
    const name = items[index]?.cookingGroup?.trim() ?? ''
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push({ row, index })
  })
  return Array.from(groups, ([name, entries]) => ({ name, entries }))
}
