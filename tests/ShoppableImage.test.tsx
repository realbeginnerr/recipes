import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShoppableImage } from '../src/components/recipe/ShoppableImage'
import { loadTaggedProduct } from '../src/services/taggedProductService'
vi.mock('../src/services/taggedProductService', () => ({ loadTaggedProduct: vi.fn() }))
const image = { id: 'photo', url: 'https://example.com/photo.jpg' }
const tag = { id: 'tag', imageId: 'photo', productId: 'product', positionX: 25, positionY: 80 }
const product = { id: 'product', productName: '긴 상품 이름 '.repeat(10), brandName: 'Brand', thumbnailUrl: 'https://example.com/product.jpg', productUrl: 'https://example.com/buy', price: 12000, deleted: false, updatedAt: 0 }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadTaggedProduct).mockResolvedValue(product) })
const view = (tags = [tag]) => <ShoppableImage image={image} tags={tags} alt="Recipe" ko />
describe('shoppable image', () => {
  it('uses percentage coordinates and changes tags when the photo changes', async () => {
    const { rerender } = render(view())
    const trigger = await screen.findByRole('button', { name: /상품 정보/ })
    expect(trigger.style.left).toBe('25%'); expect(trigger.style.top).toBe('80%')
    rerender(<div style={{ width: 200 }}>{view()}</div>)
    expect((await screen.findByRole('button', { name: /상품 정보/ })).style.left).toBe('25%')
    rerender(<ShoppableImage image={{ id: 'other', url: 'https://example.com/other.jpg' }} tags={[tag]} alt="Other" ko />)
    await waitFor(() => expect(screen.queryByRole('button', { name: /상품 정보/ })).toBeNull())
  })
  it('opens by keyboard, exposes a secure purchase link and closes with Escape', async () => {
    const user = userEvent.setup()
    render(view())
    const trigger = await screen.findByRole('button', { name: /상품 정보/ })
    trigger.focus(); await user.keyboard('{Enter}')
    const link = await screen.findByRole('link')
    expect(link.getAttribute('href')).toBe(product.productUrl)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByText('Brand')).toBeDefined()
    expect(screen.getByText('12,000원')).toBeDefined()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
    trigger.focus(); await user.keyboard(' ')
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'))
  })
  it('opens on mouse hover and stays open while entering the popup', async () => {
    const user = userEvent.setup()
    render(view())
    const trigger = await screen.findByRole('button', { name: /상품 정보/ })
    await user.hover(trigger)
    const link = await screen.findByRole('link')
    await user.hover(link)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })
  it('touch opens one popup at a time and outside click dismisses it', async () => {
    const user = userEvent.setup()
    render(view([tag, { ...tag, id: 'second', positionX: 70 }]))
    const buttons = await screen.findAllByRole('button', { name: /상품 정보/ })
    await user.pointer([{ keys: '[TouchA>]', target: buttons[0] }, { keys: '[/TouchA]' }])
    await waitFor(() => expect(buttons[0].getAttribute('aria-expanded')).toBe('true'))
    await user.pointer([{ keys: '[TouchA>]', target: buttons[1] }, { keys: '[/TouchA]' }])
    await waitFor(() => expect(buttons[1].getAttribute('aria-expanded')).toBe('true'))
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false')
    await user.click(document.body)
    await waitFor(() => expect(buttons[1].getAttribute('aria-expanded')).toBe('false'))
  })
  it('hides tags for unavailable products, unsafe URLs or failed main images', async () => {
    vi.mocked(loadTaggedProduct).mockResolvedValue(null)
    const { rerender } = render(view())
    await waitFor(() => expect(loadTaggedProduct).toHaveBeenCalled())
    expect(screen.queryByRole('button')).toBeNull()
    vi.mocked(loadTaggedProduct).mockResolvedValue({ ...product, productUrl: 'javascript:alert(1)' })
    rerender(<ShoppableImage key="unsafe" image={image} tags={[tag]} alt="Recipe" ko />)
    await waitFor(() => expect(loadTaggedProduct).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button')).toBeNull()
    vi.mocked(loadTaggedProduct).mockResolvedValue(product)
    rerender(<ShoppableImage key="valid" image={image} tags={[tag]} alt="Recipe" ko />)
    await screen.findByRole('button', { name: /상품 정보/ })
    fireEvent.error(screen.getByAltText('Recipe'))
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('provides a placeholder if the product thumbnail fails', async () => {
    const user = userEvent.setup(); render(view())
    await user.click(await screen.findByRole('button', { name: /상품 정보/ }))
    const link = await screen.findByRole('link')
    fireEvent.error(link.querySelector('img')!)
    expect(link.querySelector('img')).toBeNull()
    expect(link.querySelector('.shoppable-product-placeholder')).not.toBeNull()
  })
})

it('정사각형 중앙 크롭에 맞춰 원본 상품 좌표를 변환한다', async () => {
  const { squareTagPosition } = await import('../src/components/recipe/ShoppableImage')
  expect(squareTagPosition(25, 50, 2)).toEqual({ x: 0, y: 50 })
  expect(squareTagPosition(50, 25, 0.5)).toEqual({ x: 50, y: 0 })
  expect(squareTagPosition(50, 50, 2)).toEqual({ x: 50, y: 50 })
})
