import { describe, expect, it } from 'vitest'
import { emptyProduct, resolveBlend, validateProduct } from '../src/utils/product'

function fixture() {
  const a = { ...emptyProduct(), id: 'a', name: 'Black tea', draft: false, teaTags: ['홍차' as const], images: [{ id: 'image', url: 'https://example.com/a.jpg', alt: '' }] }
  a.pricing.regular = 10000
  const b = { ...emptyProduct(), id: 'b', name: 'Green tea', draft: false }
  b.pricing.regular = 6000; b.pricing.discount = 5000
  const blend = { ...emptyProduct(), id: 'mix', compositionType: 'blend' as const, blend: { components: [{ productId: 'a', grams: 3 }, { productId: 'b', grams: 1 }], waterMl: 300 } }
  return { a, b, blend }
}
describe('blend composition and linked prices', () => {
  it('sums current unit prices without scaling them by grams and reads current source metadata', () => {
    const { a, b, blend } = fixture()
    const result = resolveBlend(blend, [a, b])
    expect(result.pricing.regular).toBe(15000)
    expect(result.blend?.components[0]).toMatchObject({ name: 'Black tea', imageUrl: a.images[0].url })
    a.name = 'Renamed tea'; a.images[0].url = 'https://example.com/new.jpg'; a.pricing.regular = 12000
    const updated = resolveBlend(result, [a, b])
    expect(updated.pricing.regular).toBe(17000)
    expect(updated.blend?.components[0]).toMatchObject({ name: 'Renamed tea', imageUrl: a.images[0].url })
    expect(updated.blend?.components.map(item => item.grams)).toEqual([3, 1])
    expect(updated.blend?.waterMl).toBe(300)
  })
  it('does not invent a price for a missing or unpriced source and preserves its last name', () => {
    const { a, b, blend } = fixture()
    const saved = resolveBlend(blend, [a, b])
    const missing = resolveBlend(saved, [b])
    expect(missing.pricing.regular).toBeNull()
    expect(missing.blend?.components[0]).toMatchObject({ name: 'Black tea', unavailable: true, slug: '', imageUrl: '' })
    expect(validateProduct(missing, null).blend).toBeDefined()
    a.pricing.regular = null
    expect(resolveBlend(blend, [a, b]).pricing.regular).toBeNull()
  })
  it('rejects duplicate sources, nested blends, zero grams and missing water', () => {
    const { a, b, blend } = fixture()
    blend.blend.components[1].productId = 'a'
    expect(validateProduct(resolveBlend(blend, [a, b]), null).blend).toBeDefined()
    blend.blend.components[1].productId = 'b'; blend.blend.components[0].grams = 0
    expect(validateProduct(blend, null).blend).toBeDefined()
    blend.blend.components[0].grams = 3; blend.blend.waterMl = 0
    expect(validateProduct(blend, null).blend).toBeDefined()
    a.compositionType = 'blend'
    expect(resolveBlend(blend, [a, b]).blend?.components[0].unavailable).toBe(true)
  })
})

it('unions current component tags in filter order and removes duplicates and stale tags', () => {
  const { a, b, blend } = fixture()
  a.teaTags = ['홍차', '카페인'] as typeof a.teaTags
  b.teaTags = ['녹차', '카페인', '무카페인']
  const result = resolveBlend(blend, [a, b])
  expect(result.teaTags).toEqual(['홍차', '녹차', '혼합차', '카페인'])
  expect(validateProduct(result, null).teaTags).toBeUndefined()
  b.teaTags = ['과일차', '무카페인']
  expect(resolveBlend(result, [a, b]).teaTags).toEqual(['홍차', '과일차', '혼합차', '카페인'])
})

it('keeps caffeine-free only when no component has caffeine', () => {
  const { a, b, blend } = fixture()
  a.teaTags = ['홍차', '무카페인'] as typeof a.teaTags
  b.teaTags = ['과일차', '무카페인']
  expect(resolveBlend(blend, [a, b]).teaTags).toContain('무카페인')
  a.teaTags = ['홍차', '카페인'] as typeof a.teaTags
  const tags = resolveBlend(blend, [a, b]).teaTags
  expect(tags).toContain('카페인')
  expect(tags).not.toContain('무카페인')
})
