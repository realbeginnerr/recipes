import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { emptyProduct, groupBuyPolicies, isExternalProduct } from '../src/utils/product'
import { FulfillmentPolicyPreview } from '../src/components/product/FulfillmentPolicyPreview'
it('shows external seller policy without suggesting we ship the single tea', () => {
 const product = { ...emptyProduct(), purchaseUrl: 'https://shop.example.com/tea' }
 expect(isExternalProduct(product)).toBe(true)
 render(<FulfillmentPolicyPreview product={product} />)
 expect(screen.getByText(/해당 판매처의 안내/)).toBeDefined()
 expect(screen.queryByText(/2일 이내/)).toBeNull()
})
it('shows equal shares, zero packing fee and measured shipping for group buys', () => {
 const product = { ...emptyProduct(), compositionType: 'blend' as const, groupBuy: { participants: 4 } }
 product.pricing.regular = 40000
 render(<FulfillmentPolicyPreview product={product} />)
 expect(screen.getByText(/1인 예상 부담금: 10,000원/)).toBeDefined()
 expect(screen.getByText(/모두 도착한 날부터 2일/)).toBeDefined()
 expect(screen.getByText(/포장비 0원/)).toBeDefined()
 expect(screen.getByText(/실제 무게와 택배 요금/)).toBeDefined()
 const policies=groupBuyPolicies(product)
 expect(policies.shipping.fee).toBeNull()
 expect(policies.shipping.leadDays).toBeNull()
 expect(policies.refund.days).toBe(7)
 expect(policies.refund.refundDays).toBe(3)
})
