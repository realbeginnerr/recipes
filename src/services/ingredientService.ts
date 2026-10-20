import { collection, addDoc, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { cacheIngredient, removeCachedIngredient } from '../data/ingredientCache'
import { canonicalIngredientId } from '../data/ingredientCatalogOverrides'
import type { Ingredient } from '../types'
import { ingredientPresentation } from '../data/ingredientPresentation'
import { CONVERSION_FIELDS, INGREDIENT_UNITS } from '../constants/ingredientUnits'

export type FirestoreIngredient = {
  gramsPerMl?: number
  gramsPerPinch?: number
  id: string
  name: string
  nameKo: string
  baseAmount: number
  baseUnit: string
  carbs: number
  protein: number
  fat: number
  addedSugar?: number
  isRefinedCarb?: boolean
  imageUrl?: string
  legacyIds?: string[]
  retired?: boolean
  storageLocation?: '냉장실' | '냉동실' | '실온보관' | ''
  category?: string
  createdAt?: number
  gramsPerTbsp?: number
  conversionGrams?: number
  gramsPerTsp?: number
  gramsPerCup?: number
  gramsPerEach?: number
  gramsPerCan?: number
  gramsPerHandful?: number
  gramsPerPack?: number
}

const COLLECTION = 'ingredients'

// name(lowercase) 또는 nameKo → ingredient
export const ingredientByName = new Map<string, FirestoreIngredient>()
const ingredientByDocumentId = new Map<string, FirestoreIngredient>()

let loaded = false

export async function loadIngredientsFromFirestore(): Promise<void> {
  if (loaded) return
  const snapshot = await getDocs(collection(db, COLLECTION))
  const firestoreIngredients = snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<FirestoreIngredient, 'id'>),
  }))
  const legacyIds = new Set(firestoreIngredients.flatMap((ingredient) => ingredient.legacyIds ?? []))
  for (const ingredient of firestoreIngredients) {
    if (legacyIds.has(ingredient.id) || canonicalIngredientId(ingredient.id) !== ingredient.id) continue
    registerIngredient(ingredient)
  }
  loaded = true
}

export async function saveIngredientToFirestore(
  ing: Omit<FirestoreIngredient, 'id'>
): Promise<string> {
  ing = { ...ing, imageUrl: ing.imageUrl ?? defaultIngredientImage(ing.nameKo || ing.name) }
  const clean = Object.fromEntries(Object.entries(ing).filter(([, v]) => v !== undefined))
  const docRef = await addDoc(collection(db, COLLECTION), clean)
  const saved: FirestoreIngredient = { id: docRef.id, ...ing }
  registerIngredient(saved)
  return docRef.id
}

function defaultIngredientImage(name: string): string {
  return (ingredientPresentation[name] ?? Object.entries(ingredientPresentation).find(([key]) => name.includes(key))?.[1])?.image ?? ''
}

export async function updateIngredientInFirestore(
  id: string,
  data: Omit<FirestoreIngredient, 'id'>,
): Promise<void> {
  const { id: _id, ...ingredientData } = data as Omit<FirestoreIngredient, 'id'> & { id?: string }
  const clean = Object.fromEntries(Object.entries(ingredientData).filter(([, value]) => value !== undefined))
  await setDoc(doc(db, COLLECTION, id), clean)
  registerIngredient({ id, ...ingredientData })
}

export async function deleteIngredientFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
  for (const [key, val] of ingredientByName.entries()) {
    if (val.id === id) ingredientByName.delete(key)
  }
  removeCachedIngredient(id)
  ingredientByDocumentId.delete(id)
}

export function getIngredientById(id: string): FirestoreIngredient | undefined {
  return ingredientByDocumentId.get(id)
}

export function findIngredientByName(name: string): FirestoreIngredient | undefined {
  return ingredientByName.get(name.trim().toLowerCase()) ?? ingredientByName.get(name.trim())
}

function registerIngredient(ing: FirestoreIngredient) {
  if (canonicalIngredientId(ing.id) !== ing.id) return
  if (!ing.name) {
    console.warn('Skipping ingredient with missing name:', ing.id)
    return
  }
  const normalized = ing
  ingredientByDocumentId.set(ing.id, normalized)
  for (const legacyId of normalized.legacyIds ?? []) ingredientByDocumentId.set(legacyId, normalized)
  for (const [key, val] of ingredientByName.entries()) {
    if (val.id === ing.id) ingredientByName.delete(key)
  }
  if (!normalized.retired) {
    ingredientByName.set(normalized.name.toLowerCase(), normalized)
    if (normalized.nameKo) ingredientByName.set(normalized.nameKo, normalized)
  }
  const cached: Ingredient = {
    id: ing.id,
    name: normalized.name,
    nameKo: normalized.nameKo || normalized.name,
    baseUnit: ing.baseUnit,
    baseAmount: ing.baseAmount,
    carbs: ing.carbs,
    protein: ing.protein,
    fat: ing.fat,
    addedSugar: ing.addedSugar,
    isRefinedCarb: ing.isRefinedCarb,
    conversions: buildConversions(ing),
    allowedUnits: buildAllowedUnits(ing),
  }
  cacheIngredient(cached, normalized.legacyIds, normalized.retired)
}

const OZ_TO_G = 28.3495

function buildConversions(ing: Pick<FirestoreIngredient, 'baseUnit' | 'gramsPerMl' | 'gramsPerPinch' | 'gramsPerTbsp' | 'gramsPerTsp' | 'gramsPerCup' | 'gramsPerEach' | 'gramsPerCan' | 'gramsPerPack' | 'gramsPerHandful'>): Record<string, number> {
  const { baseUnit } = ing
  let base: Record<string, number>
  if (baseUnit === 'g' || baseUnit === 'ml') base = { g: 1, ml: 1, oz: OZ_TO_G }
  else if (baseUnit === 'oz') base = { g: 1, oz: OZ_TO_G }
  else if (baseUnit === '줌' || baseUnit === 'handful') base = { '줌': 1, handful: 1 }
  else if (baseUnit === '꼬집' || baseUnit === 'pinch') base = { '꼬집': 1, pinch: 1 }
  else if (baseUnit === '개' || baseUnit === 'each') base = { '개': 1, each: 1 }
  else if (baseUnit === '캔' || baseUnit === 'can') base = { '캔': 1, can: 1 }
  else if (baseUnit === '팩' || baseUnit === 'pack') base = { '팩': 1, pack: 1 }
  else if (baseUnit === '컵' || baseUnit === 'cup') base = { '컵': 1, cup: 1 }
  else if (baseUnit === 'T' || baseUnit === 'tbsp') base = { T: 1, tbsp: 1 }
  else if (baseUnit === 't' || baseUnit === 'tsp') base = { t: 1, tsp: 1 }
  else base = { [baseUnit]: 1 }

  if (base.g === 1) base.lbs = 453.592
  for (const { key, labelKo, labelEn } of CONVERSION_FIELDS) {
    const factor = ing[key]
    if (factor !== undefined && Number.isFinite(factor) && factor > 0) {
      base[labelKo] = factor
      base[labelEn] = factor
    }
  }
  return base
}

function buildAllowedUnits(ing: Pick<FirestoreIngredient, 'baseUnit' | 'gramsPerMl' | 'gramsPerPinch' | 'gramsPerTbsp' | 'gramsPerTsp' | 'gramsPerCup' | 'gramsPerEach' | 'gramsPerCan' | 'gramsPerPack' | 'gramsPerHandful'>): string[] {
  const conversions = buildConversions(ing)
  const units: string[] = INGREDIENT_UNITS.flatMap(unit => unit.ko && conversions[unit.ko] > 0 ? [unit.ko, unit.en] : [])
  if (!units.includes(ing.baseUnit)) units.push(ing.baseUnit)
  return [...new Set(units)]
}
