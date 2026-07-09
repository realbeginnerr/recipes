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
  gramsPerTbsp?: number
  gramsPerTsp?: number
  gramsPerCup?: number
  gramsPerEach?: number
  gramsPerCan?: number
  gramsPerPack?: number
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
  const clean = Object.fromEntries(Object.entries(ing).filter(([, v]) => v !== undefined))
  const docRef = await addDoc(collection(db, COLLECTION), clean)
  const saved: FirestoreIngredient = { id: docRef.id, ...ing }
  registerIngredient(saved)
  return docRef.id
}

export async function updateIngredientInFirestore(
  id: string,
  data: Omit<FirestoreIngredient, 'id'>,
): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, COLLECTION, id), clean)
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
  for (const [key, val] of ingredientByName.entries()) {
    if (val.id === ing.id) ingredientByName.delete(key)
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
    conversions: buildConversions(ing),
    allowedUnits: buildAllowedUnits(ing),
  })
}

const OZ_TO_G = 28.3495

function buildConversions(ing: Pick<FirestoreIngredient, 'baseUnit' | 'gramsPerTbsp' | 'gramsPerTsp' | 'gramsPerCup' | 'gramsPerEach' | 'gramsPerCan' | 'gramsPerPack'>): Record<string, number> {
  const { baseUnit } = ing
  let base: Record<string, number>
  if (baseUnit === 'g' || baseUnit === 'ml') base = { g: 1, ml: 1, oz: OZ_TO_G }
  else if (baseUnit === 'oz') base = { g: 1, oz: OZ_TO_G }
  else if (baseUnit === '꼬집' || baseUnit === 'pinch') base = { '꼬집': 1, pinch: 1 }
  else if (baseUnit === '개' || baseUnit === 'each') base = { '개': 1, each: 1 }
  else if (baseUnit === '캔' || baseUnit === 'can') base = { '캔': 1, can: 1 }
  else if (baseUnit === '팩' || baseUnit === 'pack') base = { '팩': 1, pack: 1 }
  else if (baseUnit === '컵' || baseUnit === 'cup') base = { '컵': 1, cup: 1 }
  else if (baseUnit === 'T' || baseUnit === 'tbsp') base = { T: 1, tbsp: 1 }
  else if (baseUnit === 't' || baseUnit === 'tsp') base = { t: 1, tsp: 1 }
  else base = { [baseUnit]: 1 }

  if (ing.gramsPerTbsp) {
    base['T'] = ing.gramsPerTbsp
    base['tbsp'] = ing.gramsPerTbsp
  }
  if (ing.gramsPerTsp) {
    base['t'] = ing.gramsPerTsp
    base['tsp'] = ing.gramsPerTsp
  }
  if (ing.gramsPerCup) {
    base['컵'] = ing.gramsPerCup
    base['cup'] = ing.gramsPerCup
  }
  if (ing.gramsPerEach) {
    base['개'] = ing.gramsPerEach
    base['each'] = ing.gramsPerEach
  }
  if (ing.gramsPerCan) {
    base['캔'] = ing.gramsPerCan
    base['can'] = ing.gramsPerCan
  }
  if (ing.gramsPerPack) {
    base['팩'] = ing.gramsPerPack
    base['pack'] = ing.gramsPerPack
  }
  return base
}

function buildAllowedUnits(ing: Pick<FirestoreIngredient, 'baseUnit' | 'gramsPerTbsp' | 'gramsPerTsp' | 'gramsPerCup' | 'gramsPerEach' | 'gramsPerCan' | 'gramsPerPack'>): string[] {
  const { baseUnit } = ing
  let units: string[]
  if (baseUnit === 'g') units = ['g', 'oz', 'ml']
  else if (baseUnit === 'oz') units = ['oz', 'g']
  else if (baseUnit === 'ml') units = ['ml', 'g', 'oz']
  else if (baseUnit === '꼬집' || baseUnit === 'pinch') units = ['꼬집', 'pinch']
  else if (baseUnit === '개' || baseUnit === 'each') units = ['개', 'each']
  else if (baseUnit === '캔' || baseUnit === 'can') units = ['캔', 'can']
  else if (baseUnit === '팩' || baseUnit === 'pack') units = ['팩', 'pack']
  else if (baseUnit === '컵' || baseUnit === 'cup') units = ['컵', 'cup']
  else if (baseUnit === 'T' || baseUnit === 'tbsp') units = ['T', 'tbsp']
  else if (baseUnit === 't' || baseUnit === 'tsp') units = ['t', 'tsp']
  else units = [baseUnit]

  if (ing.gramsPerTbsp && !units.includes('T')) units.push('T')
  if (ing.gramsPerTsp && !units.includes('t')) units.push('t')
  if (ing.gramsPerCup && !units.includes('컵')) units.push('컵')
  if (ing.gramsPerEach && !units.includes('개')) units.push('개')
  if (ing.gramsPerCan && !units.includes('캔')) units.push('캔')
  if (ing.gramsPerPack && !units.includes('팩')) units.push('팩')
  return units
}
