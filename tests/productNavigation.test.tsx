vi.mock('../src/services/taggedProductService', () => ({ searchTaggedProducts: async () => [{ id: 'shared-cup', productName: '등록한 상품', thumbnailUrl: '', productUrl: 'https://example.com/buy', price: 10000, deleted: false, updatedAt: 0 }] }))
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { App } from '../src/App'

const adminState = vi.hoisted(() => ({ loggedIn: false, authorized: true }))
beforeEach(() => { adminState.loggedIn = false; adminState.authorized = true })
vi.mock('../src/context/AdminContext', () => ({
  AdminProvider: ({ children }: { children: unknown }) => children,
  useAdmin: () => ({ isAdmin: adminState.loggedIn, authReady: true, login: async () => {
    if (!adminState.authorized) return { ok: false, reason: 'not-admin' }
    adminState.loggedIn = true
    return { ok: true }
  }, logout: async () => { adminState.loggedIn = false } }),
}))
vi.mock('../src/firebase', () => ({ auth: { currentUser: null } }))
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: async () => [], mergeStaticAndFirestoreRecipes: () => [] }))
vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: async () => [] }))
vi.mock('../src/services/productService', () => ({ loadProducts: async () => [{ id: 'catalog-price-qa', name: '목록 가격 테스트 차', pricing: { regular: 10000, discount: null, discountStart: '', discountEnd: '', tax: 'taxable' }, seo: { slug: 'catalog-price-qa' }, images: [], teaTags: ['홍차'], summary: '', createdAt: 0, order: 0, visibility: 'public', draft: false }], loadShopSettings: async () => null, newProductId: () => 'navigation-qa', ProductSaveError: class extends Error {}, saveProduct: vi.fn(), uploadProductImage: vi.fn(), deleteProduct: vi.fn() }))

it('opens all management actions through the Admin menu after Google login', async () => {
  render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/blending-tea'] })} />)
  expect(await screen.findByText('10,000원')).toBeDefined()
  expect(screen.queryByRole('button', { name: '상품 추가', exact: true })).toBeNull()
  const admin = screen.getByRole('button', { name: '관리자', exact: true })
  fireEvent.click(admin)
  await screen.findByRole('heading', { name: '관리자 로그인' })
  expect(screen.queryByRole('heading', { name: '상품 추가', level: 1 })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }))
  await screen.findByRole('heading', { name: '관리자', level: 1 })
  expect(screen.getByRole('link', { name: '레시피 추가', exact: true }).getAttribute('href')).toBe('/add-recipe')
  expect(screen.getByRole('link', { name: '식재료 추가', exact: true }).getAttribute('href')).toBe('/add-ingredient')
  expect(screen.getByRole('link', { name: '배송·교환·반품 정책 설정' }).getAttribute('href')).toBe('/shop-settings')
  fireEvent.click(screen.getByRole('link', { name: '상품 추가', exact: true }))
  await screen.findByRole('heading', { name: '상품 추가', level: 1 })
  expect(screen.getByLabelText('상품명 (필수)')).toBeDefined()
  expect(screen.queryByText('어떤 방식으로 레시피를 추가하시겠어요?')).toBeNull()
})

it('keeps management actions protected when a non-admin signs in at the admin URL', async () => {
  adminState.authorized = false
  render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/admin'] })} />)
  await screen.findByRole('heading', { name: '관리자 로그인' })
  expect(screen.queryByRole('link', { name: '레시피 추가', exact: true })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }))
  expect((await screen.findByRole('alert')).textContent).toContain('허용된 관리자 계정')
  expect(screen.queryByRole('link', { name: '레시피 추가', exact: true })).toBeNull()
})
