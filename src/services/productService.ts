import { collection, doc, getDoc, getDocs, query, runTransaction, where } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db, storage } from '../firebase'
import { getTeaTags } from '../utils/teaCategory'
import type { Product, ProductAdminData, ShopSettings } from '../types/product'
import { MAX_IMAGE_BYTES, PRODUCT_IMAGE_TYPES, productDateTime, sanitizeProductHtml, resolveBlend, isGroupBuyProduct, groupBuyPolicies } from '../utils/product'

export class ProductSaveError extends Error {
  readonly reason: 'duplicate-sku' | 'duplicate-slug' | 'conflict'
  constructor(reason: 'duplicate-sku' | 'duplicate-slug' | 'conflict', message: string) { super(message); this.reason = reason }
}
export function newProductId() { return doc(collection(db, 'products')).id }
export async function loadProduct(id: string, admin = false) {
  const snapshot = await getDoc(doc(db, 'products', id))
  if (!snapshot.exists() || snapshot.data().deleted) return null
  let privateData: ProductAdminData = { cost: null }
  if (admin) {
    const privateSnapshot = await getDoc(doc(db, 'productAdmin', id))
    if (privateSnapshot.exists()) privateData = privateSnapshot.data() as ProductAdminData
  }
  const product = { ...snapshot.data(), id } as Product
  return { product: resolveBlend({ ...product, teaTags: getTeaTags(product) }, product.compositionType === 'blend' ? await loadProducts(admin) : []), privateData }
}
export async function loadProducts(admin = false) {
  const source = collection(db, 'products')
  const now = Date.now()
  // Keep a freshly-created query inside the server's request.time boundary.
  const snapshots = await getDocs(admin ? source : query(source, where('visibility', 'in', ['public', 'scheduled']), where('draft', '==', false), where('deleted', '==', false), where('publicAfter', '<=', now - 1000), where('publicUntil', '>=', now)))
  const products = snapshots.docs.map(snapshot => ({ ...snapshot.data(), id: snapshot.id } as Product)).filter(product => !product.deleted).map(product => ({ ...product, teaTags: getTeaTags(product) }))
  return products.map(product => resolveBlend(product, products))
}
export async function loadShopSettings(): Promise<ShopSettings | null> {
  const snapshot = await getDoc(doc(db, 'shopSettings', 'default'))
  return snapshot.exists() ? snapshot.data() as ShopSettings : null
}
const indexId = (value: string) => encodeURIComponent(value.trim().toUpperCase())
function skuList(product: Product) { return [product.sku, ...(product.optionsEnabled ? product.variants.map(variant => variant.sku) : [])] }
export async function saveProduct(input: Product, privateData: ProductAdminData, expectedVersion: number): Promise<Product> {
  if (input.compositionType === 'blend') input = resolveBlend(input, await loadProducts(true))
  if (isGroupBuyProduct(input)) input = { ...input, policies: groupBuyPolicies(input), policySelection: { shipping: 'individual', exchange: 'individual', refund: 'individual' } }
  const persisted = { ...input } as Product & { searchTags?: unknown; videoUrl?: unknown }
  persisted.purchaseUrl = input.purchaseUrl?.trim() ?? ''
  persisted.teaTags = getTeaTags(input)
  delete persisted.searchTags
  delete persisted.videoUrl
  const id = input.id || newProductId()
  const productRef = doc(db, 'products', id)
  const saved = await runTransaction(db, async transaction => {
    const currentSnapshot = await transaction.get(productRef)
    const current = currentSnapshot.exists() ? currentSnapshot.data() as Product : null
    if ((current?.version ?? 0) !== expectedVersion || current?.deleted) throw new ProductSaveError('conflict', '다른 관리자가 상품을 변경했어요. 현재 입력 내용을 임시 저장한 뒤 최신 상품을 불러와 주세요.')
    const skus = skuList(input).map(indexId)
    if (new Set(skus).size !== skus.length) throw new ProductSaveError('duplicate-sku', '상품과 옵션 SKU는 서로 달라야 해요.')
    const oldSkus = current ? skuList(current).map(indexId) : []
    const allSkus = [...new Set([...skus, ...oldSkus])]
    const skuSnapshots = await Promise.all(allSkus.map(sku => transaction.get(doc(db, 'productSkus', sku))))
    for (const sku of skus) {
      const snapshot = skuSnapshots[allSkus.indexOf(sku)]
      if (snapshot.exists() && snapshot.data().productId !== id) throw new ProductSaveError('duplicate-sku', `이미 사용 중인 SKU예요: ${decodeURIComponent(sku)}`)
    }
    const slug = input.seo.slug || id
    const oldSlug = current?.seo.slug || id
    const slugRef = doc(db, 'productSlugs', indexId(slug))
    const slugSnapshot = await transaction.get(slugRef)
    if (slugSnapshot.exists() && slugSnapshot.data().productId !== id) throw new ProductSaveError('duplicate-slug', '이미 사용 중인 상품 URL이에요. 슬러그를 변경해 주세요.')
    const now = Date.now()
    const product: Product = {
      ...persisted, id, version: expectedVersion + 1, createdAt: current?.createdAt ?? now, updatedAt: now,
      name: input.name.trim(), sku: input.sku.trim().toUpperCase(), description: sanitizeProductHtml(input.description),
      seo: { ...input.seo, slug },
      visibility: input.draft ? 'private' : input.visibility,
      inventory: { ...input.inventory, stock: input.optionsEnabled ? input.variants.reduce((sum, variant) => sum + variant.stock, 0) : input.inventory.stock },
      shipping: input.type === 'digital' ? { ...input.shipping, type: 'none' } : input.shipping,
      publicAfter: Math.max(input.visibility === 'scheduled' && input.publishAt ? productDateTime(input.publishAt) : 0, input.exposureStart ? productDateTime(input.exposureStart) : 0),
      publicUntil: input.exposureEnd ? productDateTime(input.exposureEnd) : 8640000000000000,
    }
    transaction.set(productRef, product)
    transaction.set(doc(db, 'productAdmin', id), privateData)
    for (const sku of skus) transaction.set(doc(db, 'productSkus', sku), { productId: id })
    for (const sku of oldSkus.filter(value => !skus.includes(value))) transaction.delete(doc(db, 'productSkus', sku))
    transaction.set(slugRef, { productId: id })
    if (oldSlug !== slug) transaction.delete(doc(db, 'productSlugs', indexId(oldSlug)))
    return product
  })
  return saved
}
export async function saveShopSettings(settings: ShopSettings, expectedVersion: number): Promise<ShopSettings> {
  const settingsRef = doc(db, 'shopSettings', 'default')
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(settingsRef)
    if ((snapshot.data()?.version ?? 0) !== expectedVersion) throw new ProductSaveError('conflict', '다른 관리자가 공통 정책을 변경했어요. 최신 설정을 다시 불러와 주세요.')
    const saved = { ...settings, version: expectedVersion + 1, updatedAt: Date.now() }
    transaction.set(settingsRef, saved)
    transaction.set(doc(db, 'shopPolicyHistory', String(saved.version)), saved)
    transaction.set(doc(db, 'shopPolicies', 'current'), saved)
    return saved
  })
}
export async function loadPublicShopSettings(): Promise<ShopSettings | null> {
  const snapshot = await getDoc(doc(db, 'shopPolicies', 'current'))
  return snapshot.exists() ? snapshot.data() as ShopSettings : null
}
export async function loadPolicyHistory() {
  const snapshots = await getDocs(collection(db, 'shopPolicyHistory'))
  return snapshots.docs.map(snapshot => snapshot.data() as ShopSettings).sort((a, b) => b.version - a.version)
}
export async function deleteProduct(product: Product) {
  const productRef = doc(db, 'products', product.id)
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(productRef)
    if (!snapshot.exists() || snapshot.data().version !== product.version) throw new ProductSaveError('conflict', '상품이 변경되었어요. 최신 상품을 불러온 뒤 삭제해 주세요.')
    transaction.update(productRef, { deleted: true, visibility: 'private', updatedAt: Date.now(), version: product.version + 1 })
    for (const sku of skuList(product)) transaction.delete(doc(db, 'productSkus', indexId(sku)))
    transaction.delete(doc(db, 'productSlugs', indexId(product.seo.slug || product.id)))
  })
}
export function uploadProductImage(productId: string, file: File, progress: (percent: number) => void) {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) throw new Error('JPG, PNG, WebP, AVIF 이미지를 선택해 주세요.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('이미지 한 장의 용량은 10MB 이하여야 해요.')
  const storagePath = `products/${productId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const task = uploadBytesResumable(ref(storage, storagePath), file)
  const promise = new Promise<{ url: string; storagePath: string }>((resolve, reject) => {
    task.on('state_changed', snapshot => progress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, async () => {
      try { resolve({ url: await getDownloadURL(task.snapshot.ref), storagePath }) } catch (error) { reject(error) }
    })
  })
  return { promise, cancel: () => task.cancel() }
}
