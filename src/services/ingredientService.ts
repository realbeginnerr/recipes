import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
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

export async function updateIngredientInFirestore(
  id: string,
  data: Omit<FirestoreIngredient, 'id'>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { ...data })
  registerIngredient({ id, ...data })
}

export async function deleteIngredientFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
  for (const [key, val] of ingredientByName.entries()) {
    if (val.id === id) ingredientByName.delete(key)
  }
  ingredientById.delete(id)
}

export function findIngredientByName(name: string): FirestoreIngredient | undefined {
  return ingredientByName.get(name.trim().toLowerCase()) ?? ingredientByName.get(name.trim())
}

function registerIngredient(ing: FirestoreIngredient) {
  if (!ing.name) {
    console.warn('Skipping ingredient with missing name:', ing.id)
    return
  }
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

const OZ_TO_G = 28.3495

function buildConversions(baseUnit: string): Record<string, number> {
  if (baseUnit === 'g' || baseUnit === 'ml') return { g: 1, ml: 1, oz: OZ_TO_G }
  if (baseUnit === 'oz') return { g: 1, oz: OZ_TO_G }
  if (baseUnit === '꼬집' || baseUnit === 'pinch') return { '꼬집': 1, pinch: 1 }
  if (baseUnit === '개' || baseUnit === 'each') return { '개': 1, each: 1 }
  if (baseUnit === '캔' || baseUnit === 'can') return { '캔': 1, can: 1 }
  if (baseUnit === '팩' || baseUnit === 'pack') return { '팩': 1, pack: 1 }
  if (baseUnit === '컵' || baseUnit === 'cup') return { '컵': 1, cup: 1 }
  if (baseUnit === 'T' || baseUnit === 'tbsp') return { T: 1, tbsp: 1 }
  if (baseUnit === 't' || baseUnit === 'tsp') return { t: 1, tsp: 1 }
  return { [baseUnit]: 1 }
}

function buildAllowedUnits(baseUnit: string): string[] {
  if (baseUnit === 'g') return ['g', 'oz', 'ml']
  if (baseUnit === 'oz') return ['oz', 'g']
  if (baseUnit === 'ml') return ['ml', 'g', 'oz']
  if (baseUnit === '꼬집' || baseUnit === 'pinch') return ['꼬집', 'pinch']
  if (baseUnit === '개' || baseUnit === 'each') return ['개', 'each']
  if (baseUnit === '캔' || baseUnit === 'can') return ['캔', 'can']
  if (baseUnit === '팩' || baseUnit === 'pack') return ['팩', 'pack']
  if (baseUnit === '컵' || baseUnit === 'cup') return ['컵', 'cup']
  if (baseUnit === 'T' || baseUnit === 'tbsp') return ['T', 'tbsp']
  if (baseUnit === 't' || baseUnit === 'tsp') return ['t', 'tsp']
  return [baseUnit]
}
