import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { canonicalIngredientId } from '../data/ingredientCatalogOverrides'
import type { Recipe } from '../types'
import { getRecipeCategories, type RecipeCategory } from '../utils/recipeCategory'

export type FirestoreRecipeItem = {
  ingredientId: string
  amount: number
  unit: string
}

export type FirestoreRecipe = {
  categories?: RecipeCategory[]
  id?: string
  name: string
  nameKo: string
  imageUrl: string
  link?: string
  memo: string
  tasteRating: number
  divisionCount?: number
  createdAt: number
  items: FirestoreRecipeItem[]
  sideItems?: FirestoreRecipeItem[]
  hidden?: boolean
}

const COLLECTION = 'recipes'

export async function saveRecipeToFirestore(
  recipe: Omit<FirestoreRecipe, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...recipe,
    items: recipe.items.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })),
    ...(recipe.sideItems ? { sideItems: recipe.sideItems.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })) } : {}),
    categories: getRecipeCategories(recipe),
    createdAt: Date.now(),
  })
  return docRef.id
}

export async function updateRecipeInFirestore(recipe: Recipe): Promise<void> {
  const { id, items, sideItems, ...rest } = recipe
  const data: Record<string, unknown> = {
    ...rest,
    categories: getRecipeCategories(recipe),
    items: items.map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      amount: item.defaultAmount,
      unit: item.defaultUnit,
    })),
    sideItems: (sideItems ?? []).map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      amount: item.defaultAmount,
      unit: item.defaultUnit,
    })),
  }
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key]
  }
  await setDoc(doc(db, COLLECTION, id), data)
}

export async function deleteRecipeFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

export async function loadRecipesFromFirestore(): Promise<FirestoreRecipe[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<FirestoreRecipe, 'id'>),
  })).map(recipe => ({
    ...recipe,
    items: recipe.items.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })),
    sideItems: recipe.sideItems?.map(item => ({ ...item, ingredientId: canonicalIngredientId(item.ingredientId) })),
  }))
}

export function convertToRecipe(fs: FirestoreRecipe): Recipe {
  return {
    id: fs.id ?? '',
    categories: getRecipeCategories(fs),
    name: fs.name,
    nameKo: fs.nameKo || fs.name,
    imageUrl: fs.imageUrl || '',
    memo: fs.memo,
    tasteRating: fs.tasteRating,
    divisionCount: fs.divisionCount,
    createdAt: fs.createdAt,
    link: fs.link,
    hidden: fs.hidden,
    items: fs.items.map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      defaultAmount: item.amount,
      defaultUnit: item.unit,
    })),
    sideItems: fs.sideItems?.map((item) => ({
      ingredientId: canonicalIngredientId(item.ingredientId),
      defaultAmount: item.amount,
      defaultUnit: item.unit,
    })),
  }
}
