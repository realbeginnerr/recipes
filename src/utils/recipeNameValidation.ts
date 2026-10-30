export type RecipeNames = { id?: string; name: string; nameKo: string; deleted?: boolean }
export type RecipeNameField = 'name' | 'nameKo'
export const duplicateRecipeNameMessage = '이미 존재하는 이름이에요. 다른 이름을 입력해 주세요.'
export function duplicateRecipeNameFields(error: unknown): RecipeNameField[] {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'recipe/duplicate-name' || !('fields' in error) || !Array.isArray(error.fields)) return []
  return error.fields.filter((field): field is RecipeNameField => field === 'name' || field === 'nameKo')
}

// Compare the trimmed values that the recipe forms actually save.
export function assertUniqueRecipeNames(candidate: RecipeNames, existing: RecipeNames[]) {
  const fields = (['nameKo', 'name'] as const).filter(field => candidate[field].trim() && existing.some(recipe =>
    !recipe.deleted && recipe.id !== candidate.id && recipe[field]?.trim() === candidate[field].trim(),
  ))
  if (fields.length) throw Object.assign(new Error(duplicateRecipeNameMessage), { code: 'recipe/duplicate-name', fields })
}
