import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { RelatedImageProducts } from '../src/components/recipe/RelatedImageProducts'
import { loadTaggedProduct } from '../src/services/taggedProductService'
vi.mock('../src/services/taggedProductService', () => ({ loadTaggedProduct: vi.fn() }))
const tag = { id: 'tag', imageId: 'a', productId: 'cup', positionX: 50, positionY: 50 }
const product = { id: 'cup', productName: '컵', thumbnailUrl: 'https://example.com/cup.jpg', productUrl: 'https://example.com/buy', deleted: false, updatedAt: 0 }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadTaggedProduct).mockResolvedValue(product) })
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
