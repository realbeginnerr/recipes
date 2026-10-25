import { ingredientById } from './ingredientCache'

// Historical Firestore document ID for the mozzarella ingredient. The catalog
// import consolidated this record into the current cheese (mozzarella) entry.
const LEGACY_INGREDIENT_IDS: Record<string, string> = {
  PXOUpHYxTe4s8zIGKTaD: 'FToK9wdNj0aE6TkYUjRj',
}

export function canonicalIngredientId(id: string): string {
  return LEGACY_INGREDIENT_IDS[id] ?? ingredientById.get(id)?.id ?? id
}
