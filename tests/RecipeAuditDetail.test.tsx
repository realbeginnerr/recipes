import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { RecipeDetailPage } from '../src/pages/RecipeDetailPage'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ingredientById } from '../src/data/ingredientCache'

vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: false }) }))
vi.mock('../src/data/recipe', () => ({ recipes: [] }))
vi.mock('../src/services/taggedProductService', () => ({ loadTaggedProduct: vi.fn(async () => null) }))
vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn(async () => {}), getIngredientById: () => undefined }))
vi.mock('../src/services/recipeService', () => ({
  loadRecipesFromFirestore: vi.fn(async () => []),
  mergeStaticAndFirestoreRecipes: () => [{ id: 'audit-detail', name: 'Audit detail', nameKo: '점검 상세', imageUrl: '', memo: '서버의 최신 메모', items: [
    { ingredientId: 'water', defaultAmount: 100, defaultUnit: 'g' },
    { ingredientId: 'missing', defaultAmount: 10, defaultUnit: 'g' },
  ] }],
}))
vi.mock('../src/components/useIngredientColumnWidth', async () => { const { useRef } = await import('react'); return { useIngredientColumnWidth: () => useRef(null) } })
afterEach(() => { ingredientById.clear(); localStorage.removeItem('recipe-note:audit-detail') })

it('distinguishes unavailable nutrition from genuine zero and keeps old browser notes separate from server notes', async () => {
  ingredientById.set('water', { id: 'water', name: 'Water', nameKo: '물', baseAmount: 100, baseUnit: 'g', carbs: 0, protein: 0, fat: 0, conversions: { g: 1 }, allowedUnits: ['g'] })
  localStorage.setItem('recipe-note:audit-detail', '브라우저의 이전 메모')
  render(<MemoryRouter initialEntries={['/recipe/audit-detail']}><LanguageProvider><Routes><Route path="/recipe/:id" element={<RecipeDetailPage />} /></Routes></LanguageProvider></MemoryRouter>)
  expect(await screen.findByText('서버의 최신 메모')).toBeTruthy()
  expect(screen.getByText('이 브라우저에 남아 있는 이전 메모')).toBeTruthy()
  expect(localStorage.getItem('recipe-note:audit-detail')).toBe('브라우저의 이전 메모')
  const missing = screen.getByText(/계산 불가:/).closest('tr')!
  expect(within(missing).getAllByText('—')).toHaveLength(3)
  const water = screen.getByText('물', { exact: true }).closest('tr')!
  expect(within(water).queryByText('—')).toBeNull()
  expect(screen.getAllByText(/일부 재료 제외/).length).toBeGreaterThan(0)
})
