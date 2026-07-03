import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '../firebase'
import { ingredientById } from '../data/ingredients'
import type { Recipe } from '../types'

export type FirestoreRecipeItem = {
  name: string
  nameKo: string
  amount: number
  unit: string
  carbs: number
  protein: number
  fat: number
}

export type FirestoreRecipe = {
  id?: string
  name: string
  nameKo: string
  imageUrl: string
  link?: string
  memo: string
  tasteRating: number
  timeRating: number
  items: FirestoreRecipeItem[]
  createdAt: number
}

const COLLECTION = 'recipes'

export async function saveRecipeToFirestore(recipe: Omit<FirestoreRecipe, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...recipe,
    createdAt: Date.now(),
  })
  return docRef.id
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
  const items = fs.items.map((item, index) => {
    const ingredientId = `fs-${fs.id}-${index}`
    if (!ingredientById.has(ingredientId)) {
      ingredientById.set(ingredientId, {
        id: ingredientId,
        name: item.name,
        nameKo: item.nameKo || item.name,
        baseUnit: item.unit || 'g',
        baseAmount: item.amount || 100,
        carbs: item.carbs,
        protein: item.protein,
        fat: item.fat,
        conversions: { g: 1, oz: 28.35 },
        allowedUnits: [item.unit || 'g'],
      })
    }
    return {
      ingredientId,
      defaultAmount: item.amount,
      defaultUnit: item.unit || 'g',
    }
  })

  return {
    id: fs.id ?? '',
    name: fs.name,
    nameKo: fs.nameKo || fs.name,
    imageUrl: fs.imageUrl || '',
    memo: fs.memo,
    tasteRating: fs.tasteRating,
    timeRating: fs.timeRating,
    createdAt: fs.createdAt,
    link: fs.link,
    items,
  }
}
