import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RecipePage } from '../src/pages/RecipePage'
import { LanguageProvider } from '../src/context/LanguageContext'
import { SearchProvider } from '../src/context/SearchContext'

const fixtures = vi.hoisted(() => Array.from({ length: 35 }, (_, i) => ({
  id: `recipe-${i}`, name: `Dish ${i}`, nameKo: `요리 ${i}`, imageUrl: '', items: [], categories: ['한식'],
})))
vi.mock('../src/data/recipe', () => ({ recipes: [] }))
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: vi.fn(async () => fixtures), mergeStaticAndFirestoreRecipes: (_static: unknown, docs: unknown) => docs }))
vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn(async () => {}) }))
vi.mock('../src/services/productService', () => ({ loadProducts: vi.fn(async () => []) }))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: false }) }))
vi.mock('../src/components/AddPageAccessProvider', () => ({ useAddPageAccess: () => ({ requestAccess: vi.fn() }) }))
vi.mock('../src/utils/analytics', () => ({ trackRecipeView: vi.fn() }))

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())
it.each([false, true])('adds three rows only on click and preserves earlier cards (desktop=%s)', async desktop => {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: desktop, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }))
  const observer = vi.fn()
  vi.stubGlobal('IntersectionObserver', observer)
  render(<MemoryRouter><LanguageProvider><SearchProvider><RecipePage /></SearchProvider></LanguageProvider></MemoryRouter>)
  const batch = desktop ? 12 : 6
  const cards = () => screen.getAllByRole('link', { name: /^요리 \d+$/ })
  await screen.findByRole('button', { name: '레시피 더 보기' })
  expect(cards()).toHaveLength(batch)
  expect(cards()[0].getAttribute('href')).toBe('/recipe/recipe-0')
  expect(screen.queryByRole('button', { name: /^요리 \d+$/ })).toBeNull()
  fireEvent.scroll(window)
  expect(cards()).toHaveLength(batch)
  expect(observer).not.toHaveBeenCalled()
  const first = cards()[0]
  fireEvent.click(screen.getByRole('button', { name: '레시피 더 보기' }))
  expect(cards()).toHaveLength(batch * 2)
  expect(cards()[0]).toBe(first)
  while (screen.queryByRole('button', { name: '레시피 더 보기' })) fireEvent.click(screen.getByRole('button', { name: '레시피 더 보기' }))
  expect(cards()).toHaveLength(35)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '요리 34' } })
  await waitFor(() => expect(cards()).toHaveLength(1))
  vi.unstubAllGlobals()
})

function ReturnFromDetail() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>목록으로 뒤로</button>
}
it('restores category, expanded cards and scroll after returning from detail', async () => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(420)
  render(<MemoryRouter initialEntries={['/recipes']}><LanguageProvider><SearchProvider><Routes>
    <Route path="/recipes" element={<RecipePage />} />
    <Route path="/recipe/:id" element={<ReturnFromDetail />} />
  </Routes></SearchProvider></LanguageProvider></MemoryRouter>)
  await screen.findByRole('button', { name: '레시피 더 보기' })
  fireEvent.click(screen.getByRole('button', { name: '한식', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: '레시피 더 보기' }))
  const count = screen.getAllByRole('link', { name: /^요리 \d+$/ }).length
  fireEvent.click(screen.getAllByRole('link', { name: /^요리 \d+$/ })[0])
  fireEvent.click(await screen.findByRole('button', { name: '목록으로 뒤로' }))
  await screen.findByRole('button', { name: '레시피 더 보기' })
  expect(screen.getByRole('button', { name: '한식', exact: true }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getAllByRole('link', { name: /^요리 \d+$/ })).toHaveLength(count)
  await waitFor(() => expect(scroll).toHaveBeenCalledWith(0, 420))
})
