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
  expect(screen.getByLabelText('Black tea 배합량')).toBeDefined()
  fireEvent.change(screen.getByLabelText('Black tea 배합량'), { target: { value: '1' } })
  expect(screen.getAllByText('50.0%')).toHaveLength(2)
  fireEvent.change(screen.getByLabelText('물 양'), { target: { value: '500' } })
  expect((screen.getByLabelText('물 양') as HTMLInputElement).value).toBe('500')
  expect(screen.queryByText('15,000원')).toBeNull()
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

it('renders the authored article instead of automatic tea brewing and selling sections', () => {
  const base = emptyProduct()
  const product = { ...base, name: '블로그 글', summary: '소개', description: '<h2>소제목</h2><p>직접 쓴 글</p>', compositionType: 'blend' as const, pricing: { ...base.pricing, regular: 10000 } }
  render(<MemoryRouter><ProductPreview product={product} settings={null} /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: '블로그 글' })).toBeDefined()
  expect(screen.getByText('직접 쓴 글')).toBeDefined()
  expect(screen.queryByRole('heading', { name: '차 우리는 방법' })).toBeNull()
  expect(screen.queryByText('10,000원')).toBeNull()
  expect(screen.queryByText('공동구매 모집 중')).toBeNull()
})

it('keeps authored inline images in article order without duplicating the gallery photo', () => {
  const photo = 'https://example.com/photo.jpg'
  const product = { ...emptyProduct(), description: `<p>앞 글</p><img src="${photo}" alt="본문 사진"><p>뒤 글</p>`, images: [{ id: 'photo', url: photo, alt: '사진' }] }
  const { container } = render(<MemoryRouter><ProductPreview product={product} settings={null} /></MemoryRouter>)
  expect(container.querySelectorAll('img')).toHaveLength(1)
  expect(screen.getByAltText('본문 사진')).toBeDefined()
  expect(container.querySelector('.shop-journal-content')!.textContent).toBe('앞 글뒤 글')
})

it('does not render purchase controls in the blog layout', () => {
  const base = emptyProduct()
  const product = { ...base, purchaseUrl: 'https://example.com/buy', pricing: { ...base.pricing, regular: 10000 } }
  render(<MemoryRouter><ProductPreview product={product} settings={null} /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: '구매하기' })).toBeNull()
  expect(screen.queryByRole('link', { name: /구매하기|공동 구매/ })).toBeNull()
})
it('renders detail tea tags with the same chip classes as catalog cards', () => {
  const product = { ...emptyProduct(), teaTags: ['홍차', '카페인'] as const }
  const { container } = render(<MemoryRouter><ProductPreview product={{ ...product, teaTags: [...product.teaTags] }} settings={null} /></MemoryRouter>)
  expect(Array.from(container.querySelectorAll('.catalog-card-categories .catalog-category')).map(node => node.textContent)).toEqual(['홍차', '카페인'])
})
