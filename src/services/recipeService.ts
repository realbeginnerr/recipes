import type { RecipeImage, RecipeProductTag } from '../types/shoppable'
import { reconcileRecipeGallery } from '../utils/recipeGallery'
import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  runTransaction,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '../firebase'
import { assertRecipeUnits } from '../utils/recipeUnitValidation'
import { canonicalIngredientId } from '../data/ingredientCatalogOverrides'
import type { Recipe } from '../types'
import { getRecipeCategories, type RecipeCategory } from '../utils/recipeCategory'
import type { TeaTag } from '../utils/teaCategory'
import { recipes as staticRecipes } from '../data/recipe'
import { assertUniqueRecipeNames } from '../utils/recipeNameValidation'

export type FirestoreRecipeItem = {
  cookingGroup?: string
  ingredientId: string
  amount: number
  unit: string
}

export type FirestoreRecipe = {
  catalog?: 'tea'
  sourceRecipeId?: string
  teaTags?: TeaTag[]
  categories?: RecipeCategory[]
  deleted?: boolean
  id?: string
  name: string
  nameKo: string
  imageUrl: string
  imageUrls?: string[]
  images?: RecipeImage[]
  productTags?: RecipeProductTag[]
  photoProductDescription?: string
  photoProductUrl?: string
  link?: string
  memo: string
  cookingGroupOrder?: string[]
  cookingContent?: string
  cookingSteps?: import('../utils/cookingSteps').CookingStep[]
  platingBlocks?: { id: string; type: 'text' | 'image'; value: string }[]
  mealContent?: string
  mealImages?: string[]
  tasteRating: number
  divisionCount?: number
  cookingTimeMinutes?: number
  lastCookedAt?: string
  createdAt: number
  items: FirestoreRecipeItem[]
  sideItems?: FirestoreRecipeItem[]
  hidden?: boolean
}

const COLLECTION = 'recipes'

// No createdAt: this deleted metadata document is excluded from the ordered
// recipe list. Reading/writing it serializes name scans across concurrent saves
// without requiring a new collection or a production security-rule change.
// Firestore reserves document IDs matching __.*__; use an ordinary ID.
const NAME_GUARD = 'recipe-name-guard'
async function writeRecipeWithUniqueNames(id: string, data: Record<string, unknown> & { name: string; nameKo: string }) {
  await runTransaction(db, async transaction => {
    const guardRef = doc(db, COLLECTION, NAME_GUARD)
    const guard = await transaction.get(guardRef)
    // Use the server, never an offline cache, for the duplicate check. All app
    // recipe writes update the guard so a concurrent commit retries this scan.
    const snapshot = await getDocsFromServer(collection(db, COLLECTION))
    const stored = snapshot.docs.filter(item => item.id !== NAME_GUARD).map(item => ({ ...item.data(), id: item.id } as FirestoreRecipe))
    assertUniqueRecipeNames({ id, name: data.name, nameKo: data.nameKo }, [
      ...staticRecipes.filter(item => !stored.some(saved => saved.id === item.id || (saved.name === item.name && saved.nameKo === item.nameKo))), ...stored,
    ])
    transaction.set(guardRef, { deleted: true, items: [], revision: (guard.data()?.revision ?? 0) + 1 })
    transaction.set(doc(db, COLLECTION, id), data)
  })
}

export async function saveRecipeToFirestore(
  recipe: Omit<FirestoreRecipe, 'id' | 'createdAt'>
): Promise<string> {
  assertRecipeUnits([...recipe.items, ...(recipe.sideItems ?? [])])
  const docRef = doc(collection(db, COLLECTION))
  await writeRecipeWithUniqueNames(docRef.id, {
    ...recipe,
    ...reconcileRecipeGallery({ ...recipe, id: '' }),
    items: recipe.items.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })),
    ...(recipe.sideItems ? { sideItems: recipe.sideItems.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })) } : {}),
    categories: getRecipeCategories(recipe),
    createdAt: Date.now(),
  })
  return docRef.id
}

export async function updateRecipeInFirestore(recipe: Recipe): Promise<void> {
  if ([...recipe.items, ...(recipe.sideItems ?? [])].some(item => !Number.isFinite(item.defaultAmount) || item.defaultAmount < 0)) {
    throw Object.assign(new Error('수량을 확인해 주세요. 계산할 수 없는 값은 저장할 수 없습니다.'), { code: 'recipe/invalid-amount' })
  }
  const { id, items, sideItems, ...rest } = recipe
  assertRecipeUnits([...items, ...(sideItems ?? [])].map(item => ({ ingredientId: item.ingredientId, unit: item.defaultUnit })))
  const data: Record<string, unknown> = {
    ...rest,
    ...reconcileRecipeGallery(recipe),
    categories: getRecipeCategories(recipe),
    items: items.map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      amount: item.defaultAmount,
      unit: item.defaultUnit,
      ...(item.cookingGroup?.trim() ? { cookingGroup: item.cookingGroup.trim() } : {}),
    })),
    sideItems: (sideItems ?? []).map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      amount: item.defaultAmount,
      unit: item.defaultUnit,
      ...(item.cookingGroup?.trim() ? { cookingGroup: item.cookingGroup.trim() } : {}),
    })),
  }
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key]
  }
  await writeRecipeWithUniqueNames(id, { ...data, name: recipe.name.trim(), nameKo: recipe.nameKo.trim() })
}

export async function deleteRecipeFromFirestore(id: string): Promise<void> {
  await runTransaction(db, async transaction => {
    const guardRef = doc(db, COLLECTION, NAME_GUARD)
    const guard = await transaction.get(guardRef)
    transaction.set(guardRef, { deleted: true, items: [], revision: (guard.data()?.revision ?? 0) + 1 })
    transaction.set(doc(db, COLLECTION, id), { deleted: true }, { merge: true })
  })
}

export async function loadRecipesFromFirestore(): Promise<FirestoreRecipe[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<FirestoreRecipe, 'id'>),
  })).map(recipe => ({
    ...recipe,
    ...reconcileRecipeGallery({ ...recipe, id: '' }),
    items: recipe.items.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })),
    sideItems: recipe.sideItems?.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })),
  }))
}

export function convertToRecipe(fs: FirestoreRecipe): Recipe {
  return {
    id: fs.id ?? '',
    catalog: fs.catalog,
    sourceRecipeId: fs.sourceRecipeId,
    teaTags: fs.teaTags,
    categories: getRecipeCategories(fs),
    name: fs.name,
    nameKo: fs.nameKo || fs.name,
    imageUrl: fs.imageUrl || '',
    imageUrls: fs.imageUrls,
    ...reconcileRecipeGallery({ ...fs, id: fs.id ?? '' }),
    memo: fs.memo,
    photoProductDescription: fs.photoProductDescription,
    photoProductUrl: fs.photoProductUrl,
    cookingGroupOrder: fs.cookingGroupOrder,
    cookingContent: fs.cookingContent,
    cookingSteps: fs.cookingSteps,
    platingBlocks: fs.platingBlocks,
    mealContent: fs.mealContent,
    mealImages: fs.mealImages,
    tasteRating: fs.tasteRating,
    divisionCount: fs.divisionCount,
    cookingTimeMinutes: fs.cookingTimeMinutes,
    lastCookedAt: fs.lastCookedAt,
    createdAt: fs.createdAt,
    link: fs.link,
    hidden: fs.hidden,
    items: fs.items.map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      defaultAmount: item.amount,
      defaultUnit: item.unit,
      ...(item.cookingGroup ? { cookingGroup: item.cookingGroup } : {}),
    })),
    sideItems: fs.sideItems?.map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      defaultAmount: item.amount,
      defaultUnit: item.unit,
      ...(item.cookingGroup ? { cookingGroup: item.cookingGroup } : {}),
    })),
  }
}

export function mergeStaticAndFirestoreRecipes(
  staticRecipes: Recipe[],
  firestoreRecipes: FirestoreRecipe[],
): Recipe[] {
  const merged = [...staticRecipes]
  for (const firestoreRecipe of firestoreRecipes) {
    const duplicateIndex = merged.findIndex((existing) =>
      existing.id === firestoreRecipe.id || (
        existing.catalog === firestoreRecipe.catalog &&
        existing.name.toLocaleLowerCase() === firestoreRecipe.name.toLocaleLowerCase() &&
        existing.nameKo.toLocaleLowerCase() === firestoreRecipe.nameKo.toLocaleLowerCase()
      ),
    )
    if (firestoreRecipe.deleted) {
      if (duplicateIndex !== -1) merged.splice(duplicateIndex, 1)
      continue
    }
    const recipe = convertToRecipe(firestoreRecipe)
    if (duplicateIndex === -1) merged.push(recipe)
    else merged[duplicateIndex] = recipe
  }
  return merged
}
