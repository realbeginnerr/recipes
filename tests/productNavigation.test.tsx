import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { App } from '../src/App'

vi.mock('../src/context/AdminContext', () => {
  let loggedIn = false
  return { AdminProvider: ({ children }: { children: unknown }) => children, useAdmin: () => ({ isAdmin: loggedIn, authReady: true, login: async () => { loggedIn = true; return { ok: true } }, logout: async () => { loggedIn = false } }) }
})
vi.mock('../src/firebase', () => ({ auth: { currentUser: null } }))
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: async () => [], mergeStaticAndFirestoreRecipes: () => [] }))
vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: async () => [] }))
vi.mock('../src/services/productService', () => ({ loadProducts: async () => [{ id: 'catalog-price-qa', name: '목록 가격 테스트 차', pricing: { regular: 10000, discount: null, discountStart: '', discountEnd: '', tax: 'taxable' }, seo: { slug: 'catalog-price-qa' }, images: [], teaTags: ['홍차'], summary: '', createdAt: 0, order: 0, visibility: 'public', draft: false }], loadShopSettings: async () => null, newProductId: () => 'navigation-qa', ProductSaveError: class extends Error {}, saveProduct: vi.fn(), uploadProductImage: vi.fn(), deleteProduct: vi.fn() }))

it('routes the tea shop Add product button through admin login directly to the product form', async () => {
  render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <App /> }], { initialEntries: ['/blending-tea'] })} />)
  const add = await screen.findByRole('button', { name: '상품 추가', exact: true })
  expect(await screen.findByText('10,000원')).toBeDefined()
  fireEvent.click(add)
  await screen.findByRole('heading', { name: '관리자 로그인' })
  expect(screen.queryByRole('heading', { name: '상품 추가', level: 1 })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }))
  await screen.findByRole('heading', { name: '상품 추가', level: 1 })
  expect(screen.getByLabelText('상품명 (필수)')).toBeDefined()
  expect(screen.queryByText('어떤 방식으로 레시피를 추가하시겠어요?')).toBeNull()
})
