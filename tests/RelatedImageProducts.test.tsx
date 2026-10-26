import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { RelatedImageProducts } from '../src/components/recipe/RelatedImageProducts'
import { loadTaggedProduct } from '../src/services/taggedProductService'
import { shopFeatures } from '../src/constants/shopFeatures'
vi.mock('../src/constants/shopFeatures', () => ({ shopFeatures: { enabled: true } }))
vi.mock('../src/services/taggedProductService', () => ({ loadTaggedProduct: vi.fn() }))
const tag = { id: 'tag', imageId: 'a', productId: 'cup', positionX: 50, positionY: 50 }
const product = { id: 'cup', productName: '컵', thumbnailUrl: 'https://example.com/cup.jpg', productUrl: 'https://example.com/buy', deleted: false, updatedAt: 0 }
beforeEach(() => { shopFeatures.enabled = true; vi.clearAllMocks(); vi.mocked(loadTaggedProduct).mockResolvedValue(product) })
it('keeps the title while Shop product cards are paused, even without tags', () => {
  shopFeatures.enabled = false
  const { rerender } = render(<RelatedImageProducts imageId="a" tags={[tag]} ko />)
  expect(screen.getByText('사진 속 상품')).toBeDefined()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByRole('list')).toBeNull()
  expect(loadTaggedProduct).not.toHaveBeenCalled()
  rerender(<RelatedImageProducts imageId="b" tags={[]} ko />)
  expect(screen.getByText('사진 속 상품')).toBeDefined()
})
it('renders the purchase URL as a named button link opening a new tab', () => {
  shopFeatures.enabled = false
  const { rerender } = render(<RelatedImageProducts imageId="a" tags={[]} ko purchaseUrl="https://example.com/buy" />)
  const link = screen.getByRole('link', { name: '상품 구매하기' })
  expect(link.getAttribute('href')).toBe('https://example.com/buy')
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(link.getAttribute('data-slot')).toBe('button')
  expect(link.getAttribute('data-variant')).toBe('outline')
  expect(screen.queryByText('https://example.com/buy')).toBeNull()
  rerender(<RelatedImageProducts imageId="a" tags={[]} ko purchaseUrl="javascript:alert(1)" />)
  expect(screen.queryByRole('link')).toBeNull()
  rerender(<RelatedImageProducts imageId="a" tags={[]} ko purchaseUrl="" />)
  expect(screen.queryByRole('link')).toBeNull()
})
it('shows multiline temporary product details with safe purchase links only while paused', async () => {
  shopFeatures.enabled = false
  const description = '컵 설명\nhttps://example.com/buy\n<script>alert(1)</script>'
  const { container, rerender } = render(<RelatedImageProducts imageId="a" tags={[tag]} ko description={description} />)
  expect(screen.getByRole('link').getAttribute('href')).toBe(product.productUrl)
  expect(screen.getByRole('link').getAttribute('rel')).toBe('noopener noreferrer')
  expect(container.querySelector('.related-image-products-description')?.textContent).toBe(description)
  expect(container.querySelector('script')).toBeNull()
  shopFeatures.enabled = true
  rerender(<RelatedImageProducts key="restored" imageId="a" tags={[tag]} ko description={description} purchaseUrl="https://example.com/temporary" />)
  await screen.findByRole('link', { name: /컵/ })
  expect(container.querySelector('.related-image-products-description')).toBeNull()
  expect(screen.queryByRole('link', { name: '상품 구매하기' })).toBeNull()
})
it('shows one secure purchase link per product and hides the list on an untagged photo', async () => {
  const { rerender } = render(<RelatedImageProducts imageId="a" tags={[tag, { ...tag, id: 'second' }]} ko />)
  const link = await screen.findByRole('link', { name: /컵/ })
  expect(screen.getAllByRole('link')).toHaveLength(1)
  expect(link.getAttribute('href')).toBe(product.productUrl)
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  fireEvent.error(link.querySelector('img')!)
  expect(link.querySelector('.shoppable-product-placeholder')).not.toBeNull()
  rerender(<RelatedImageProducts key="b" imageId="b" tags={[tag]} ko />)
  expect(screen.queryByRole('region')).toBeNull()
})
it('omits missing, deleted, and unsafe products', async () => {
  vi.mocked(loadTaggedProduct).mockImplementation(async id => id === 'missing' ? null : { ...product, id, deleted: id === 'deleted', productUrl: id === 'unsafe' ? 'javascript:alert(1)' : product.productUrl })
  render(<RelatedImageProducts imageId="a" tags={['missing', 'deleted', 'unsafe'].map(productId => ({ ...tag, id: productId, productId }))} ko />)
  await waitFor(() => expect(loadTaggedProduct).toHaveBeenCalledTimes(3))
  expect(screen.queryByRole('region')).toBeNull()
})
