import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { ingredientById } from '../data/ingredients'

export type FirestoreIngredient = {
  id: string
  name: string
  nameKo: string
  baseAmount: number
  baseUnit: string
  carbs: number
  protein: number
  fat: number
}

const COLLECTION = 'ingredients'

// name(lowercase) 또는 nameKo → ingredient
export const ingredientByName = new Map<string, FirestoreIngredient>()

let loaded = false

export async function loadIngredientsFromFirestore(): Promise<void> {
  if (loaded) return
  const snapshot = await getDocs(collection(db, COLLECTION))
  for (const doc of snapshot.docs) {
    const data = doc.data() as Omit<FirestoreIngredient, 'id'>
    const ing: FirestoreIngredient = { id: doc.id, ...data }
    registerIngredient(ing)
  }
  loaded = true
}

export async function saveIngredientToFirestore(
  ing: Omit<FirestoreIngredient, 'id'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), ing)
  const saved: FirestoreIngredient = { id: docRef.id, ...ing }
  registerIngredient(saved)
  return docRef.id
}

export function findIngredientByName(name: string): FirestoreIngredient | undefined {
  return ingredientByName.get(name.trim().toLowerCase()) ?? ingredientByName.get(name.trim())
}

function registerIngredient(ing: FirestoreIngredient) {
  ingredientByName.set(ing.name.toLowerCase(), ing)
  if (ing.nameKo) ingredientByName.set(ing.nameKo, ing)
  ingredientById.set(ing.id, {
    id: ing.id,
    name: ing.name,
    nameKo: ing.nameKo || ing.name,
    baseUnit: ing.baseUnit,
    baseAmount: ing.baseAmount,
    carbs: ing.carbs,
    protein: ing.protein,
    fat: ing.fat,
    conversions: buildConversions(ing.baseUnit),
    allowedUnits: buildAllowedUnits(ing.baseUnit),
  })
}

function buildConversions(baseUnit: string): Record<string, number> {
  if (baseUnit === 'g' || baseUnit === 'ml') return { g: 1, ml: 1, oz: 28.35 }
  if (baseUnit === 'oz') return { g: 1, oz: 28.35 }
  return { [baseUnit]: 1 }
}

function buildAllowedUnits(baseUnit: string): string[] {
  if (baseUnit === 'g') return ['g', 'oz', 'ml']
  if (baseUnit === 'oz') return ['oz', 'g']
  if (baseUnit === 'ml') return ['ml', 'g', 'oz']
  return [baseUnit]
}
