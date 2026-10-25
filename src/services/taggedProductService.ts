import { collection, doc, getDoc, getDocs, query, orderBy, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { TaggedProduct } from '../types/shoppable'

const COLLECTION = 'taggedProducts'
function webUrl(value: string) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}
export async function loadTaggedProduct(id: string): Promise<TaggedProduct | null> {
  if (import.meta.env.DEV && window.location.pathname.endsWith('/recipe/__shoppable-demo__') && id.startsWith('__demo-')) {
    const { demoProducts } = await import('../dev/shoppableDemo')
    return demoProducts[id] ?? null
  }
  const snapshot = await getDoc(doc(db, COLLECTION, id))
  if (!snapshot.exists()) return null
  const product = { ...snapshot.data(), id: snapshot.id } as TaggedProduct
  return product.deleted ? null : product
}
// Search locally after loading this small, shared product catalog.
export async function searchTaggedProducts(term = ''): Promise<TaggedProduct[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('productName')))
  const needle = term.trim().toLocaleLowerCase()
  return snapshot.docs.map(item => ({ ...item.data(), id: item.id } as TaggedProduct))
    .filter(item => !item.deleted && `${item.productName} ${item.brandName ?? ''}`.toLocaleLowerCase().includes(needle))
}
export async function saveTaggedProduct(input: Omit<TaggedProduct, 'id' | 'updatedAt' | 'deleted'>, id: string = crypto.randomUUID()): Promise<TaggedProduct> {
  if ((input.category && !['그릇', '수저', '매트', '기타'].includes(input.category)) || !input.productName.trim() || !webUrl(input.productUrl) || (input.thumbnailUrl && !webUrl(input.thumbnailUrl)) || (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0))) throw new Error('상품명, URL, 가격을 확인해 주세요.')
  const product: TaggedProduct = { id, category: input.category ?? '기타', productName: input.productName.trim(), thumbnailUrl: input.thumbnailUrl.trim(), productUrl: input.productUrl.trim(), deleted: false, updatedAt: Date.now(), ...(input.brandName?.trim() ? { brandName: input.brandName.trim() } : {}), ...(input.price !== undefined ? { price: input.price } : {}) }
  await setDoc(doc(db, COLLECTION, id), product)
  return product
}
// Keep references valid; readers omit deleted products rather than copying stale data.
export async function deleteTaggedProduct(id: string): Promise<void> {
  await setDoc(doc(db, COLLECTION, id), { deleted: true, updatedAt: Date.now() }, { merge: true })
}
