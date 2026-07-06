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
import type { Recipe } from '../types'

export type FirestoreRecipeItem = {
  ingredientId: string
  amount: number
  unit: string
}

export type FirestoreRecipe = {
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
}

const COLLECTION = 'recipes'

export async function saveRecipeToFirestore(
  recipe: Omit<FirestoreRecipe, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...recipe,
    createdAt: Date.now(),
  })
  return docRef.id
}

export async function updateRecipeInFirestore(recipe: Recipe): Promise<void> {
  const { id, items, sideItems, ...rest } = recipe
  const data: Record<string, unknown> = {
    ...rest,
    items: items.map((item) => ({
      ingredientId: item.ingredientId,
      amount: item.defaultAmount,
      unit: item.defaultUnit,
    })),
    sideItems: (sideItems ?? []).map((item) => ({
      ingredientId: item.ingredientId,
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
  }))
}

export function convertToRecipe(fs: FirestoreRecipe): Recipe {
  return {
    id: fs.id ?? '',
    name: fs.name,
    nameKo: fs.nameKo || fs.name,
    imageUrl: fs.imageUrl || '',
    memo: fs.memo,
    tasteRating: fs.tasteRating,
    divisionCount: fs.divisionCount,
    createdAt: fs.createdAt,
    link: fs.link,
    items: fs.items.map((item) => ({
      ingredientId: item.ingredientId,
      defaultAmount: item.amount,
      defaultUnit: item.unit,
    })),
    sideItems: fs.sideItems?.map((item) => ({
      ingredientId: item.ingredientId,
      defaultAmount: item.amount,
      defaultUnit: item.unit,
    })),
  }
}
