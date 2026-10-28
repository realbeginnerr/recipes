import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { IngredientSearchModal } from '../src/components/IngredientSearchModal'
import { LanguageProvider } from '../src/context/LanguageContext'
import { cacheIngredient, ingredientById, ingredients } from '../src/data/ingredientCache'

vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn(async () => {}) }))

beforeEach(() => {
  ingredients.length = 0
  ingredientById.clear()
  cacheIngredient({ id: 'rice', name: 'Multigrain rice', nameKo: '잡곡밥', baseAmount: 100, baseUnit: 'g', carbs: 28.5, protein: 3.1, fat: 0.8, conversions: { g: 1 } })
})

it('selects, deselects, and confirms a searched side ingredient', async () => {
  const select = vi.fn()
  const close = vi.fn()
  render(<LanguageProvider><IngredientSearchModal isOpen onClose={close} onIngredientSelect={select} multiSelect /></LanguageProvider>)
  fireEvent.change(screen.getByPlaceholderText('식재료 검색...'), { target: { value: '잡곡밥' } })
  const rice = await screen.findByRole('button', { name: '잡곡밥' })
  fireEvent.click(rice)
  expect((screen.getByRole('button', { name: '추가 (1)' }) as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(rice)
  expect((screen.getByRole('button', { name: '추가 (0)' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(rice)
  fireEvent.click(screen.getByRole('button', { name: '추가 (1)' }))
  expect(select).toHaveBeenCalledExactlyOnceWith(ingredientById.get('rice'))
  expect(close).toHaveBeenCalledOnce()
})
