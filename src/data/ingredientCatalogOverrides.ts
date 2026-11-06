import { ingredientById } from './ingredientCache'

// Historical Firestore document ID for the mozzarella ingredient. The catalog
// import consolidated this record into the current cheese (mozzarella) entry.
const LEGACY_INGREDIENT_IDS: Record<string, string> = {
  PXOUpHYxTe4s8zIGKTaD: 'FToK9wdNj0aE6TkYUjRj',
  // Historical onion and potato records still referenced by older recipes.
  myqweahoroS1k1eaTQmi: '9WeXrM3WaIuTgQLipEdZ',
  THpcK1CLYcnCS3ZEilmj: 'csv-33f260e0ceece725d98ebfbe',
}

export function legacyIngredientIdsFor(id: string): string[] {
  return Object.entries(LEGACY_INGREDIENT_IDS)
    .filter(([, canonicalId]) => canonicalId === id)
    .map(([legacyId]) => legacyId)
}

export function canonicalIngredientId(id: string): string {
  return LEGACY_INGREDIENT_IDS[id] ?? ingredientById.get(id)?.id ?? id
}
