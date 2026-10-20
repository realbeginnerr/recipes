import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { RecipeDetailPage } from '../src/pages/RecipeDetailPage'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ingredientById } from '../src/data/ingredientCache'
import { recipeCookingGroups } from '../src/utils/recipeCookingGroups'

vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: false }) }))
vi.mock('../src/services/ingredientService', () => ({
  loadIngredientsFromFirestore: vi.fn(async () => {}), getIngredientById: (id: string) => ({ storageLocation: id === 'meat' ? '냉장실' : '실온보관' }),
}))
vi.mock('../src/services/recipeService', () => ({
  loadRecipesFromFirestore: vi.fn(async () => []), mergeStaticAndFirestoreRecipes: () => [{ id: 'test', name: 'Test', nameKo: '테스트', imageUrl: '', items: [
    { ingredientId: 'meat', defaultAmount: 100, defaultUnit: 'g' },
    { ingredientId: 'soy', defaultAmount: 20, defaultUnit: 'g', cookingGroup: '양념장' },
    { ingredientId: 'starch', defaultAmount: 50, defaultUnit: 'g', cookingGroup: '반죽' },
  ] }],
}))
vi.mock('../src/components/useIngredientColumnWidth', async () => {
  const { useRef } = await import('react')
  return { useIngredientColumnWidth: () => useRef(null) }
})
afterEach(() => ingredientById.clear())

it('switches between storage and authored cooking groups without losing quantities', async () => {
  for (const [id, name] of [['meat', '고기'], ['soy', '간장'], ['starch', '전분']]) ingredientById.set(id, { id, name, nameKo: name, baseAmount: 100, baseUnit: 'g', carbs: 10, protein: 0, fat: 0, conversions: { g: 1 }, allowedUnits: ['g'] })
  render(<MemoryRouter initialEntries={['/recipe/test']}><LanguageProvider><Routes><Route path="/recipe/:id" element={<RecipeDetailPage />} /></Routes></LanguageProvider></MemoryRouter>)
  const cooking = await screen.findByRole('tab', { name: '요리할 때' })
  expect(screen.getByRole('tab', { name: '재료 꺼낼 때' }).getAttribute('aria-selected')).toBe('true')
  const panel = screen.getByRole('tabpanel')
  expect(within(panel).getByRole('columnheader', { name: /냉장실/ })).toBeDefined()
  fireEvent.change(screen.getByLabelText('고기 양'), { target: { value: '150' } })
  fireEvent.click(cooking)
  expect(within(panel).getByRole('columnheader', { name: '양념장' })).toBeDefined()
  expect(within(panel).getByRole('columnheader', { name: '반죽' })).toBeDefined()
  expect(within(panel).getByRole('columnheader', { name: '기본 재료' })).toBeDefined()
  expect((screen.getByLabelText('고기 양') as HTMLInputElement).value).toBe('150')
  fireEvent.click(screen.getByRole('tab', { name: '재료 꺼낼 때' }))
  expect((screen.getByLabelText('고기 양') as HTMLInputElement).value).toBe('150')
})

it('keeps authored group order and original indices for quantity updates', () => {
  const rows = ['a', 'b', 'c'].map(ingredientId => ({ ingredientId, amount: 10, unit: 'g' }))
  const items = rows.map((row, i) => ({ ingredientId: row.ingredientId, defaultAmount: 10, defaultUnit: 'g', cookingGroup: i === 1 ? '반죽' : ' 양념장 ' }))
  const groups = recipeCookingGroups(rows, items)
  expect(groups.map(group => group.name)).toEqual(['양념장', '반죽'])
  expect(groups[0].entries.map(entry => entry.index)).toEqual([0, 2])
})
