import type { TeaTag } from '../utils/teaCategory'
import type { PolicySelection, ShopPolicies } from './shopPolicy'

export type ProductImage = { id: string; url: string; alt: string; storagePath?: string }
export type ProductOption = { id: string; name: string; values: string[] }
export type ProductVariant = {
  id: string; values: string[]; sku: string; priceMode: 'additional' | 'individual'; price: number
  stock: number; status: 'active' | 'paused' | 'sold-out'; imageId: string
}
export type Product = {
  id: string
  version: number
  createdAt: number
  updatedAt: number
  name: string
  sku: string
  categories: [string, string, string]
  teaTags: TeaTag[]
  groupBuy?: { participants: number | null }
  compositionType?: 'single' | 'blend'
  blend?: { components: { productId: string; grams: number | null; name?: string; imageUrl?: string; slug?: string; unavailable?: boolean }[]; waterMl: number | null }
  brand: string
  manufacturer: string
  type: 'physical' | 'digital'
  summary: string
  purchaseUrl?: string
  description: string
  images: ProductImage[]
  pricing: { regular: number | null; discount: number | null; discountStart: string; discountEnd: string; tax: 'taxable' | 'exempt' }
  optionsEnabled: boolean
  options: ProductOption[]
  variants: ProductVariant[]
  inventory: { enabled: boolean; stock: number; safetyStock: number; soldOutThreshold: number; stopWhenSoldOut: boolean; preorder: boolean; restockDate: string; status: 'available' | 'sold-out' | 'restocking' }
  shipping: { type: 'parcel' | 'direct' | 'pickup' | 'none'; feeType: 'free' | 'paid' | 'conditional'; fee: number | null; freeThreshold: number | null; extraFee: number | null; leadDays: number | null; carrier: string; weight: number | null; width: number | null; depth: number | null; height: number | null; bundle: boolean }
  policySelection: PolicySelection
  policies: ShopPolicies
  policyVersion: number
  disclosure: { country: string; manufactureDate: string; expiryDate: string; material: string; capacity: string; contents: string; storage: string; precautions: string; certification: string; support: string; foodType: string; importer: string; nutrition: string; allergens: string; gmo: string; additional: string }
  seo: { title: string; description: string; slug: string }
  saleStatus: 'active' | 'paused' | 'sold-out'
  visibility: 'public' | 'private' | 'scheduled'
  publishAt: string
  saleStart: string
  saleEnd: string
  exposureStart: string
  exposureEnd: string
  featured: boolean
  newProduct: boolean
  order: number
  minQuantity: number
  maxQuantity: number | null
  perPersonLimit: number | null
  draft: boolean
  deleted: boolean
  publicAfter: number
  publicUntil: number
}
export type ProductAdminData = { cost: number | null }
export type ShopSettings = {
  version: number
  updatedAt: number
  categoryPaths: [string, string, string][]
  policies: ShopPolicies
}
