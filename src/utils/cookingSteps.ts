export type CookingStep = { id: string; text: string }

export function recipeCookingSteps(recipe: { cookingSteps?: CookingStep[]; cookingContent?: string }): CookingStep[] {
  return recipe.cookingSteps ?? (recipe.cookingContent ?? '').split(/\r?\n/).map((text, index) => ({ id: `legacy-${index}`, text: text.trim() })).filter(step => step.text)
}
