import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export type IngredientReport = {
  id: string
  ingredientId: string
  ingredientName: string
  note: string
  reportedAt: number
}

const COLLECTION = 'ingredientReports'

export async function saveReport(ingredientId: string, ingredientName: string, note: string): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ingredientId,
    ingredientName,
    note,
    reportedAt: Date.now(),
  })
}

export async function loadReports(): Promise<IngredientReport[]> {
  const q = query(collection(db, COLLECTION), orderBy('reportedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IngredientReport, 'id'>) }))
}

export async function deleteReport(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}
