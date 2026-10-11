import { describe, expect, it } from 'vitest'
import { emptyProduct, generateVariants, MAX_VARIANTS, priceSummary, sanitizeProductHtml, validateProduct } from '../src/utils/product'
import { effectivePolicies, emptyPolicies, emptyShopSettings, policySnapshotForOrder, validatePolicies } from '../src/utils/shopPolicy'

describe('product data and validation', () => {
  it('accepts optional web purchase links and rejects executable or malformed URLs', () => {
    const product = emptyProduct()
    for (const url of ['', 'https://shop.example.com/products/tea', 'http://shop.example.com']) {
      product.purchaseUrl = url
      expect(validateProduct(product, null, true).purchaseUrl).toBeUndefined()
    }
    for (const url of ['javascript:alert(1)', 'data:text/html,test', 'not-a-url']) {
      product.purchaseUrl = url
      expect(validateProduct(product, null, true).purchaseUrl).toBeDefined()
    }
  })
  it('requires name, representative image, and price, but supports incomplete private drafts', () => {
    const product = emptyProduct()
    const errors = validateProduct(product, null)
    expect(errors.name).toBeDefined(); expect(errors.images).toBeDefined(); expect(errors['pricing.regular']).toBeDefined()
    expect(validateProduct(product, null, true)).toEqual({})
  })
  it('calculates discounts and margins and rejects invalid discounts, dates, and quantities', () => {
    const product = emptyProduct()
    product.pricing.regular = 10000; product.pricing.discount = 8000
    expect(priceSummary(product, 4000)).toEqual({ discountRate: 20, margin: 4000, marginRate: 50 })
    product.pricing.discount = 11000
    product.pricing.discountStart = '2026-10-10T12:00'; product.pricing.discountEnd = '2026-10-09T12:00'
    product.maxQuantity = 0
    const errors = validateProduct(product, 4000)
    expect(errors['pricing.discount']).toBeDefined(); expect(errors['pricing.discountEnd']).toBeDefined(); expect(errors.maxQuantity).toBeDefined()
  })
  it('generates combinations without losing independent stock and limits combinatorial growth', () => {
    const options = [{ id: 'volume', name: '용량', values: ['20g', '50g'] }, { id: 'package', name: '포장', values: ['봉투', '틴'] }]
    const generated = generateVariants(options, [], 'TEA-QA')
    expect(generated).toHaveLength(4)
    generated[0].stock = 15
    const rebuilt = generateVariants(options, generated, 'TEA-QA')
    expect(rebuilt[0].stock).toBe(15); expect(new Set(rebuilt.map(variant => variant.sku)).size).toBe(4)
    expect(() => generateVariants([{ id: 'many', name: '많음', values: Array.from({ length: MAX_VARIANTS + 1 }, (_, index) => String(index)) }], [], 'QA')).toThrow()
  })
  it('rejects duplicate option SKUs and contradictory caffeine tags', () => {
    const product = emptyProduct(); product.optionsEnabled = true
    product.options = [{ id: 'size', name: '용량', values: ['20g', '50g'] }]
    product.variants = generateVariants(product.options, [], product.sku)
    product.variants[1].sku = product.variants[0].sku
    product.teaTags = ['카페인', '무카페인']
    const errors = validateProduct(product, null, true)
    expect(errors['variants.1.sku']).toBeDefined(); expect(errors.teaTags).toBeDefined()
  })
  it('strips executable HTML while preserving supported rich text and safe links', () => {
    const clean = sanitizeProductHtml('<p onclick="alert(1)">Tea <strong>bold</strong></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.com">safe</a>')
    expect(clean).not.toMatch(/onclick|onerror|javascript:|<script|<img/)
    expect(clean).toContain('<strong>bold</strong>'); expect(clean).toContain('rel="noopener noreferrer"')
  })
})
describe('shop policies', () => {
  it('rejects shorter withdrawal periods, late refunds, and charging for seller faults', () => {
    const policies = emptyPolicies()
    policies.refund.days = 3; policies.refund.refundDays = 5; policies.refund.defectFee = 1000
    const errors = validatePolicies(policies, false)
    expect(errors['refund.days']).toBeDefined(); expect(errors['refund.refundDays']).toBeDefined(); expect(errors['refund.defectFee']).toBeDefined()
  })
  it('requires exceptional restriction notices and separate custom-order consent', () => {
    const policies = emptyPolicies(); policies.refund.exceptions = ['custom']
    const errors = validatePolicies(policies, false)
    expect(errors['refund.exceptionNotice']).toBeDefined(); expect(errors['refund.customConsent']).toBeDefined()
  })
  it('keeps individual policies independent and captures immutable future order snapshots', () => {
    const product = emptyProduct(); const settings = emptyShopSettings()
    settings.version = 3; settings.policies.shipping.fee = 3000
    product.policySelection.shipping = 'individual'; product.policies.shipping.fee = 2000
    const resolved = effectivePolicies(product, settings)
    expect(resolved.shipping.fee).toBe(2000)
    const order = policySnapshotForOrder(product, settings)
    settings.policies.refund.days = 14; product.policies.shipping.fee = 5000
    expect(order.policies.shipping.fee).toBe(2000); expect(order.policies.refund.days).toBe(null)
  })
})
