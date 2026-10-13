import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductEditPage } from '../src/pages/ProductEditPage'
import { emptyShopSettings } from '../src/utils/shopPolicy'

vi.mock('../src/firebase', () => ({ auth: { currentUser: { uid: 'qa-admin' } } }))
vi.mock('../src/services/productService', () => ({
  newProductId: () => 'qa-product', loadProducts: vi.fn(async () => []), loadShopSettings: vi.fn(async () => emptyShopSettings()), loadProduct: vi.fn(), saveProduct: vi.fn(), deleteProduct: vi.fn(),
  ProductSaveError: class extends Error { reason = 'conflict' }, uploadProductImage: vi.fn(),
}))
const { saveProduct } = await import('../src/services/productService')
beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks() })
async function showEditor() { render(<RouterProvider router={createMemoryRouter([{ path: '/products/new', element: <ProductEditPage /> }, { path: '/blending-tea', element: <h1>상품 목록</h1> }], { initialEntries: ['/products/new'] })} />); await screen.findByRole('heading', { name: '상품 추가', level: 1 }) }
describe('product editor flows', () => {
  it('registers a valid private product and returns to the product list', async () => {
    vi.mocked(saveProduct).mockImplementationOnce(async product => ({ ...product, version: 1 }))
    await showEditor()
    fireEvent.change(screen.getByLabelText('상품명 (필수)'), { target: { value: '새 홍차' } })
    fireEvent.change(screen.getByLabelText('정상 판매가 (필수)'), { target: { value: '10000' } })
    fireEvent.change(screen.getByLabelText('이미지 URL로 추가'), { target: { value: 'https://example.com/tea.png' } })
    fireEvent.click(screen.getByRole('button', { name: '이미지 추가', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '상품 등록' }))
    await screen.findByRole('heading', { name: '상품 목록' })
    expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({ name: '새 홍차', draft: false, visibility: 'private' }), { cost: null }, 0)
  })
  it('blocks navigation when unsaved changes are kept and preserves inputs when leaving', async () => {
    await showEditor()
    fireEvent.change(screen.getByLabelText('상품명 (필수)'), { target: { value: '보관할 차' } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('link', { name: '← Shop' }))
    expect(screen.getByRole('heading', { name: '상품 추가', level: 1 })).toBeDefined()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('link', { name: '← Shop' }))
    await screen.findByRole('heading', { name: '상품 목록' })
    expect(sessionStorage.getItem('tea-product-draft:qa-admin:new')).toContain('보관할 차')
    confirm.mockRestore()
  })
  it('opens the product form directly and focuses missing required input without saving', async () => {
    await showEditor()
    expect(screen.queryByLabelText('검색용 태그')).toBeNull()
    expect(screen.queryByLabelText('상품 동영상 URL')).toBeNull()
    expect(screen.getByRole('heading', { name: '차 종류·카페인 태그' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: '상품 등록' }))
    await screen.findByText('상품명을 입력해 주세요.')
    expect(saveProduct).not.toHaveBeenCalled()
    expect(screen.getByLabelText('상품명 (필수)').getAttribute('aria-invalid')).toBe('true')
  })
  it('formats prices and updates discount and margin calculations', async () => {
    await showEditor()
    fireEvent.change(screen.getByLabelText('정상 판매가 (필수)'), { target: { value: '10000' } })
    fireEvent.change(screen.getByLabelText('할인 판매가'), { target: { value: '8000' } })
    fireEvent.change(screen.getByLabelText('매입 원가 (관리자 전용)'), { target: { value: '4000' } })
    expect((screen.getByLabelText('정상 판매가 (필수)') as HTMLInputElement).value).toBe('10,000')
    expect(screen.getByText('20.0%')).toBeDefined(); expect(screen.getByText('50.0%')).toBeDefined()
  })
  it('opens a sanitized customer preview containing the current product name', async () => {
    await showEditor()
    fireEvent.change(screen.getByLabelText('상품명 (필수)'), { target: { value: '테스트 홍차' } })
    fireEvent.click(screen.getByRole('button', { name: '미리보기', exact: true }))
    await screen.findByRole('dialog')
    expect(screen.getByRole('heading', { name: '테스트 홍차' })).toBeDefined()
  })
  it('keeps common policy fields collapsed until an individual policy is selected', async () => {
    const user = userEvent.setup()
    await showEditor()
    const shipping = document.getElementById('shipping') as HTMLDetailsElement
    shipping.open = true
    expect(screen.queryByLabelText('기본 배송비 (필수)')).toBeNull()
    const triggers = screen.getAllByRole('combobox', { name: '정책 적용 방식' })
    await user.click(triggers[0])
    await screen.findByRole('option', { name: '개별 정책 사용' })
    await user.click(screen.getByRole('option', { name: '개별 정책 사용' }))
    await waitFor(() => expect(screen.getByLabelText('기본 배송비 (필수)')).toBeDefined())
  })
})
