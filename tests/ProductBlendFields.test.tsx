import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { emptyProduct, resolveBlend } from '../src/utils/product'
import { ProductBlendFields } from '../src/components/product/ProductBlendFields'
import { ProductPreview } from '../src/components/product/ProductPreview'

it('updates grams, water, ratios and renders linked composition in the customer preview', () => {
  const a = { ...emptyProduct(), id: 'a', name: 'Black tea', draft: false }
  const b = { ...emptyProduct(), id: 'b', name: 'Green tea', draft: false }
  a.pricing.regular = 10000; b.pricing.regular = 5000
  const catalog = [a, b]
  function Harness() {
    const [product, setProduct] = useState(resolveBlend({ ...emptyProduct(), compositionType: 'blend', blend: { components: [{ productId: 'a', grams: 3 }, { productId: 'b', grams: 1 }], waterMl: 300 } }, catalog))
    return <><ProductBlendFields product={product} catalog={catalog} loadError={false} onChange={next => setProduct(resolveBlend(next, catalog))} /><ProductPreview product={product} settings={null} /></>
  }
  render(<MemoryRouter><Harness /></MemoryRouter>)
  expect(screen.getByText('75.0%')).toBeDefined()
  expect(screen.getByText('25.0%')).toBeDefined()
  expect(screen.getByRole('link', { name: 'Black tea' }).getAttribute('href')).toBe('/product/a')
  fireEvent.change(screen.getByLabelText('Black tea 배합량'), { target: { value: '1' } })
  expect(screen.getAllByText('50.0%')).toHaveLength(2)
  fireEvent.change(screen.getByLabelText('물 양'), { target: { value: '500' } })
  expect(screen.getByText('총 배합량 2g · 물 500ml')).toBeDefined()
  expect(screen.getByText('15,000원')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Black tea 제거' }))
  expect(screen.queryByRole('link', { name: 'Black tea' })).toBeNull()
})

it('preserves the decimal point while typing fractional blend grams one key at a time', async () => {
  const source = { ...emptyProduct(), id: 'a', name: 'Tea', draft: false }
  source.pricing.regular = 1000
  function Harness() {
    const [product, setProduct] = useState(resolveBlend({ ...emptyProduct(), compositionType: 'blend', blend: { components: [{ productId: 'a', grams: null }], waterMl: 300 } }, [source]))
    return <><ProductBlendFields product={product} catalog={[source]} loadError={false} onChange={next => setProduct(resolveBlend(next, [source]))} /><output data-testid="saved-grams">{product.blend?.components[0].grams}</output></>
  }
  render(<Harness />)
  const user = userEvent.setup()
  const field = screen.getByLabelText('Tea 배합량') as HTMLInputElement
  expect(field.inputMode).toBe('decimal')
  await user.type(field, '2')
  await user.type(field, '.')
  expect(field.value).toBe('2.')
  await user.type(field, '4')
  expect(field.value).toBe('2.4')
  expect(screen.getByTestId('saved-grams').textContent).toBe('2.4')
  await user.clear(field)
  await user.type(field, '0.5')
  await user.tab()
  expect(field.value).toBe('0.5')
  expect(screen.getByTestId('saved-grams').textContent).toBe('0.5')
})

it('shows the one-cup leaf basis and default brewing instructions without a custom description', () => {
  const product = { ...emptyProduct(), compositionType: 'blend' as const, blend: { components: [], waterMl: 250 } }
  render(<MemoryRouter><ProductPreview product={product} settings={null} /></MemoryRouter>)
  expect(screen.getByText('아래 찻잎 양은 한 잔(물 250ml) 기준으로 작성했습니다.')).toBeDefined()
  expect(screen.getByRole('heading', { name: '차 우리는 방법' })).toBeDefined()
  expect(screen.getByText('재료를 넣고 계속 끓이는 것이 아닙니다.')).toBeDefined()
})

it('shows group-buy recruitment only for blended tea and keeps the purchase link on single tea', () => {
  const product = { ...emptyProduct(), purchaseUrl: 'https://shop.example.com/tea' }
  const { rerender } = render(<MemoryRouter><ProductPreview product={product} settings={null} /></MemoryRouter>)
  expect(screen.queryByText('판매 중')).toBeNull()
  expect(screen.queryByText('공동구매 모집 중')).toBeNull()
  const link = screen.getByRole('link', { name: /구매하기/ })
  expect(link.getAttribute('href')).toBe(product.purchaseUrl)
  expect(link.className).toBe('product-purchase-link')
  rerender(<MemoryRouter><ProductPreview product={{ ...product, compositionType: 'blend' }} settings={null} /></MemoryRouter>)
  expect(screen.getByText('공동구매 모집 중')).toBeDefined()
  const groupLink = screen.getByRole('link', { name: /공동 구매/ })
  expect(groupLink.getAttribute('href')).toBe('https://open.kakao.com/o/paZVDnRi')
  expect(groupLink.getAttribute('target')).toBe('_blank')
  expect(groupLink.className).toBe('product-purchase-link')
  expect(screen.queryByText('판매 중')).toBeNull()
})

it('renders detail tea tags with the same chip classes as catalog cards', () => {
  const product = { ...emptyProduct(), teaTags: ['홍차', '카페인'] as const }
  const { container } = render(<MemoryRouter><ProductPreview product={{ ...product, teaTags: [...product.teaTags] }} settings={null} /></MemoryRouter>)
  expect(Array.from(container.querySelectorAll('.catalog-card-categories .catalog-category')).map(node => node.textContent)).toEqual(['홍차', '카페인'])
})
