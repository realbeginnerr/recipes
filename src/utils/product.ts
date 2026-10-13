import type { Product, ProductOption, ProductVariant } from '../types/product'
import { getTeaTags, teaCategories, type TeaTag } from './teaCategory'
import { emptyPolicies } from './shopPolicy'

export const MAX_PRODUCT_IMAGES = 12
export const MAX_VARIANTS = 200
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export function generatedSku() { return `TEA-${crypto.randomUUID().slice(0, 8).toUpperCase()}` }
export function productSlug(name: string) { return name.trim().toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '') }
export function productDateTime(value: string) { return new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+09:00` : value).getTime() }
export function emptyProduct(): Product {
  return {
    id: '', version: 0, createdAt: 0, updatedAt: 0, name: '', sku: generatedSku(), categories: ['', '', ''], teaTags: [], compositionType: 'single', groupBuy: { participants: null }, blend: { components: [], waterMl: 250 },
    brand: '', manufacturer: '', type: 'physical', summary: '', description: '', purchaseUrl: '', images: [],
    pricing: { regular: null, discount: null, discountStart: '', discountEnd: '', tax: 'taxable' },
    optionsEnabled: false, options: [], variants: [],
    inventory: { enabled: false, stock: 0, safetyStock: 0, soldOutThreshold: 0, stopWhenSoldOut: true, preorder: false, restockDate: '', status: 'available' },
    shipping: { type: 'parcel', feeType: 'paid', fee: null, freeThreshold: null, extraFee: null, leadDays: null, carrier: '', weight: null, width: null, depth: null, height: null, bundle: false },
    policySelection: { shipping: 'common', exchange: 'common', refund: 'common' }, policies: emptyPolicies(), policyVersion: 0,
    disclosure: { country: '', manufactureDate: '', expiryDate: '', material: '', capacity: '', contents: '', storage: '', precautions: '', certification: '', support: '', foodType: '', importer: '', nutrition: '', allergens: '', gmo: '', additional: '' },
    seo: { title: '', description: '', slug: '' }, saleStatus: 'active', visibility: 'private', publishAt: '', saleStart: '', saleEnd: '', exposureStart: '', exposureEnd: '',
    featured: false, newProduct: true, order: 0, minQuantity: 1, maxQuantity: null, perPersonLimit: null, draft: true, deleted: false, publicAfter: 0, publicUntil: 8640000000000000,
  }
}
export function validWebUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}
export function discountedPrice(product: Pick<Product, 'pricing'>, now = Date.now()) {
  const { regular, discount, discountStart, discountEnd } = product.pricing
  const inPeriod = (!discountStart || now >= productDateTime(discountStart)) && (!discountEnd || now <= productDateTime(discountEnd))
  return discount !== null && inPeriod ? discount : regular
}
export function priceSummary(product: Product, cost: number | null) {
  const regular = product.pricing.regular ?? 0
  const selling = product.pricing.discount ?? regular
  return {
    discountRate: regular > 0 && product.pricing.discount !== null ? (regular - selling) / regular * 100 : null,
    margin: cost === null ? null : selling - cost,
    marginRate: cost === null || selling === 0 ? null : (selling - cost) / selling * 100,
  }
}
export function generateVariants(options: ProductOption[], previous: ProductVariant[], sku: string): ProductVariant[] {
  const active = options.filter(option => option.name.trim() && option.values.length)
  if (!active.length) return []
  const count = active.reduce((total, option) => total * option.values.length, 1)
  if (count > MAX_VARIANTS) throw new Error(`옵션 조합은 최대 ${MAX_VARIANTS}개까지 만들 수 있어요. 옵션값을 줄여주세요.`)
  const combinations = active.reduce<string[][]>((rows, option) => rows.flatMap(row => option.values.map(value => [...row, value])), [[]])
  const existing = new Map(previous.map(variant => [JSON.stringify(variant.values), variant]))
  return combinations.map((values, index) => existing.get(JSON.stringify(values)) ?? { id: crypto.randomUUID(), values, sku: `${sku}-${String(index + 1).padStart(3, '0')}`, priceMode: 'additional', price: 0, stock: 0, status: 'active', imageId: '' })
}
export type ProductErrors = Record<string, string>
export function validateProduct(product: Product, cost: number | null, draft = false): ProductErrors {
  const errors: ProductErrors = {}
  if (product.groupBuy?.participants !== null && product.groupBuy?.participants !== undefined && (!Number.isInteger(product.groupBuy.participants) || product.groupBuy.participants < 2)) errors['groupBuy.participants'] = '참여 인원은 2명 이상의 정수로 입력해 주세요.'
  if (product.compositionType === 'blend') {
    const components = product.blend?.components ?? []
    if (components.length < 2) errors.blend = '단일차를 2개 이상 선택해 주세요.'
    if (new Set(components.map(item => item.productId)).size !== components.length || components.some(item => item.productId === product.id || item.unavailable)) errors.blend = '중복되거나 사용할 수 없는 구성 차를 확인해 주세요.'
    if (components.some(item => item.grams === null || !Number.isFinite(item.grams) || item.grams <= 0)) errors.blend = '각 차의 배합량을 0g보다 크게 입력해 주세요.'
    if (product.blend?.waterMl === null || product.blend?.waterMl === undefined || !Number.isFinite(product.blend.waterMl) || product.blend.waterMl <= 0) errors.blend = '물 양을 0ml보다 크게 입력해 주세요.'
    if (draft) delete errors.blend
  }
  if (product.purchaseUrl?.trim() && !validWebUrl(product.purchaseUrl.trim())) errors.purchaseUrl = '구매 링크는 http 또는 https 주소를 입력해 주세요.'
  const required = (key: string, value: unknown, message: string) => { if (!draft && (value === null || value === undefined || value === '')) errors[key] = message }
  required('name', product.name.trim(), '상품명을 입력해 주세요.')
  if (!product.sku.trim()) errors.sku = 'SKU를 입력하거나 자동 생성해 주세요.'
  else if (!/^[a-zA-Z0-9_-]{1,80}$/.test(product.sku)) errors.sku = 'SKU는 영문, 숫자, 하이픈, 밑줄로 80자 이내로 입력해 주세요.'
  if (!draft && !product.images.length) errors.images = '대표 이미지를 등록해 주세요.'
  if (product.images.some(image => !validWebUrl(image.url))) errors.images = '이미지 주소는 http 또는 https 주소여야 해요.'
  if (product.images.length > MAX_PRODUCT_IMAGES) errors.images = `이미지는 최대 ${MAX_PRODUCT_IMAGES}장까지 등록할 수 있어요.`
  required('pricing.regular', product.pricing.regular, '정상 판매가를 입력해 주세요.')
  const numbers: Record<string, number | null> = {
    'pricing.regular': product.pricing.regular, 'pricing.discount': product.pricing.discount, cost,
    'inventory.stock': product.inventory.stock, 'inventory.safetyStock': product.inventory.safetyStock, 'inventory.soldOutThreshold': product.inventory.soldOutThreshold,
    'shipping.fee': product.shipping.fee, 'shipping.freeThreshold': product.shipping.freeThreshold, 'shipping.extraFee': product.shipping.extraFee, 'shipping.leadDays': product.shipping.leadDays,
    'shipping.weight': product.shipping.weight, 'shipping.width': product.shipping.width, 'shipping.depth': product.shipping.depth, 'shipping.height': product.shipping.height,
    order: product.order, minQuantity: product.minQuantity, maxQuantity: product.maxQuantity, perPersonLimit: product.perPersonLimit,
  }
  for (const [key, value] of Object.entries(numbers)) {
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1e12)) errors[key] = '0 이상 1조 이하의 숫자로 입력해 주세요.'
    if (value !== null && !['shipping.weight', 'shipping.width', 'shipping.depth', 'shipping.height'].includes(key) && !Number.isInteger(value)) errors[key] = '정수로 입력해 주세요.'
  }
  if (product.pricing.discount !== null && product.pricing.regular !== null && product.pricing.discount > product.pricing.regular) errors['pricing.discount'] = '할인 판매가는 정상 판매가보다 높을 수 없어요.'
  const periods: [string, string, string, string][] = [
    ['pricing.discountStart', 'pricing.discountEnd', product.pricing.discountStart, product.pricing.discountEnd],
    ['saleStart', 'saleEnd', product.saleStart, product.saleEnd], ['exposureStart', 'exposureEnd', product.exposureStart, product.exposureEnd],
    ['disclosure.manufactureDate', 'disclosure.expiryDate', product.disclosure.manufactureDate, product.disclosure.expiryDate],
  ]
  for (const [, endKey, start, end] of periods) { if (start && end && productDateTime(end) < productDateTime(start)) errors[endKey] = '종료일은 시작일 이후여야 해요.' }
  for (const [key, value] of [...periods.flatMap(([startKey, endKey, start, end]) => [[startKey, start], [endKey, end]]), ['publishAt', product.publishAt], ['inventory.restockDate', product.inventory.restockDate]]) {
    if (value && !Number.isFinite(productDateTime(value))) errors[key] = '유효한 날짜를 입력해 주세요.'
  }
  if (!draft && product.visibility === 'scheduled' && !product.publishAt) errors.publishAt = '예약 공개 시간을 지정해 주세요.'
  if (product.visibility === 'scheduled' && product.publishAt && product.exposureEnd && productDateTime(product.exposureEnd) < productDateTime(product.publishAt)) errors.exposureEnd = '노출 종료일은 예약 공개일 이후여야 해요.'
  if (product.minQuantity < 1) errors.minQuantity = '최소 구매 수량은 1개 이상이어야 해요.'
  if (product.compositionType !== 'blend' && product.teaTags.filter(tag => ['카페인', '무카페인'].includes(tag)).length > 1) errors.teaTags = '카페인 분류는 하나만 지정해 주세요.'
  if (product.maxQuantity !== null && product.maxQuantity < product.minQuantity) errors.maxQuantity = '최대 수량은 최소 수량 이상이어야 해요.'
  if (product.perPersonLimit !== null && product.perPersonLimit < product.minQuantity) errors.perPersonLimit = '1인당 제한은 최소 구매 수량 이상이어야 해요.'
  if (product.seo.slug && !/^[\p{L}\p{N}_-]+$/u.test(product.seo.slug)) errors['seo.slug'] = '슬러그에는 문자, 숫자, 하이픈, 밑줄만 사용할 수 있어요.'
  if (product.type === 'physical' && product.shipping.type !== 'none' && product.shipping.type !== 'pickup') {
    if (product.shipping.feeType !== 'free') required('shipping.fee', product.shipping.fee, '배송비를 입력해 주세요. 무료 배송은 배송비 유형에서 선택할 수 있어요.')
    if (product.shipping.feeType === 'conditional') required('shipping.freeThreshold', product.shipping.freeThreshold, '무료 배송 기준 금액을 입력해 주세요.')
  }
  if (product.optionsEnabled) {
    if (!product.options.length || product.options.some(option => !option.name.trim() || !option.values.length)) errors.options = '각 옵션의 이름과 값을 입력해 주세요.'
    const optionNames = product.options.map(option => option.name.trim())
    if (new Set(optionNames).size !== optionNames.length) errors.options = '옵션명은 중복될 수 없어요.'
    const expected = product.options.reduce((count, option) => count * option.values.length, 1)
    if (expected > MAX_VARIANTS) errors.options = `옵션 조합은 최대 ${MAX_VARIANTS}개까지 만들 수 있어요.`
    if (product.variants.length !== expected || !product.variants.length) errors.options = '현재 옵션값으로 조합을 생성해 주세요.'
    const keys = new Set<string>()
    for (const [index, variant] of product.variants.entries()) {
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(variant.sku) || keys.has(variant.sku.toUpperCase()) || variant.sku.toUpperCase() === product.sku.toUpperCase()) errors[`variants.${index}.sku`] = '중복되지 않는 유효한 SKU를 입력해 주세요.'
      keys.add(variant.sku.toUpperCase())
      if (!Number.isInteger(variant.stock) || variant.stock < 0 || variant.stock > 1e12) errors[`variants.${index}.stock`] = '재고는 0 이상 1조 이하의 정수로 입력해 주세요.'
      if (!Number.isInteger(variant.price) || variant.price < 0 || variant.price > 1e12) errors[`variants.${index}.price`] = '금액은 0 이상 1조 이하의 정수로 입력해 주세요.'
      if (variant.values.length !== product.options.length || variant.values.some((value, i) => !product.options[i].values.includes(value))) errors.options = '옵션값이 변경되었어요. 조합을 다시 생성해 주세요.'
      if (variant.imageId && !product.images.some(image => image.id === variant.imageId)) errors[`variants.${index}.imageId`] = '옵션 이미지를 다시 지정해 주세요.'
    }
  }
  return errors
}

// Only the editor's allowlisted markup is retained in stored and previewed descriptions.
export function sanitizeProductHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE'])
  for (const element of Array.from(parsed.body.querySelectorAll('*'))) {
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(element.tagName)) { element.remove(); continue }
    if (!allowed.has(element.tagName)) { element.replaceWith(...element.childNodes); continue }
    const href = element.getAttribute('href')
    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name)
    if (element.tagName === 'A' && href && validWebUrl(href)) { element.setAttribute('href', href); element.setAttribute('target', '_blank'); element.setAttribute('rel', 'noopener noreferrer') }
  }
  return parsed.body.innerHTML
}

export function resolveBlend(product: Product, catalog: Product[]): Product {
  if (product.compositionType !== 'blend') return product
  const components = (product.blend?.components ?? []).map(item => {
    const source = catalog.find(candidate => candidate.id === item.productId && candidate.id !== product.id && candidate.compositionType !== 'blend' && !candidate.teaTags.includes('혼합차') && !candidate.deleted)
    return source ? { ...item, name: source.name, imageUrl: source.images[0]?.url ?? '', slug: source.seo.slug || source.id, unavailable: false } : { ...item, unavailable: true, imageUrl: '', slug: '' }
  })
  const prices = components.map(item => item.unavailable ? null : discountedPrice(catalog.find(candidate => candidate.id === item.productId)!))
  const total = components.length >= 2 && prices.every(value => value !== null) ? prices.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null
  const inheritedTags = new Set<TeaTag>(['혼합차', ...components.flatMap(item => { const source = item.unavailable ? undefined : catalog.find(candidate => candidate.id === item.productId); return source ? getTeaTags(source) : [] })])
  if (inheritedTags.has('카페인')) inheritedTags.delete('무카페인')
  const teaTags: TeaTag[] = product.teaTags.length === 1 && product.teaTags[0] === '기타' ? ['기타'] : teaCategories.filter((tag): tag is TeaTag => tag !== '전체' && inheritedTags.has(tag))
  return { ...product, teaTags, blend: { components, waterMl: product.blend?.waterMl ?? null }, pricing: { ...product.pricing, regular: total, discount: null, discountStart: '', discountEnd: '' } }
}

export function isExternalProduct(product: Product) {
  return product.compositionType !== 'blend' && !product.teaTags.includes('혼합차') && validWebUrl(product.purchaseUrl?.trim() ?? '')
}
export function isGroupBuyProduct(product: Product) {
  return product.compositionType === 'blend' || product.teaTags.includes('혼합차')
}
export function groupBuyPolicies(product: Product) {
  const policies = structuredClone(product.policies)
  policies.shipping.carrier = '편의점 반값택배'
  policies.shipping.type = 'parcel'; policies.shipping.feeType = 'paid'; policies.shipping.fee = null; policies.shipping.leadDays = null
  policies.shipping.guidance = '공동구매한 상품이 운영자 주소로 모두 도착한 날부터 2일 이내 발송합니다. 배송비는 포장 후 실제 무게에 따라 확정하며 참여자가 각각 부담합니다.'
  policies.exchange.days ??= 7; policies.refund.days ??= 7; policies.refund.refundDays ??= 3
  return policies
}
