import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { IngredientSearchModal } from '../src/components/IngredientSearchModal'
import { LanguageProvider } from '../src/context/LanguageContext'
import { loadIngredientsFromFirestore } from '../src/services/ingredientService'

vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn(async () => {}) }))
vi.mock('../src/data/ingredientCache', () => {
  const ingredient = { id: 'butter', name: 'Butter', nameKo: '버터', baseAmount: 100, baseUnit: 'g', carbs: 0, protein: 0, fat: 80, allowedUnits: ['g'], conversions: { g: 1 } }
  return { ingredients: [ingredient], ingredientById: new Map([['butter', ingredient]]) }
})
it('selects, deselects, and confirms a searched side ingredient', async () => {
  const select = vi.fn()
  const close = vi.fn()
  render(<LanguageProvider><IngredientSearchModal isOpen onClose={close} onIngredientSelect={select} multiSelect /></LanguageProvider>)
  fireEvent.change(screen.getByPlaceholderText('식재료 검색...'), { target: { value: '버터' } })
  const butter = await screen.findByRole('button', { name: '버터' })
  fireEvent.click(butter)
  expect((screen.getByRole('button', { name: '추가 (1)' }) as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(butter)
  expect((screen.getByRole('button', { name: '추가 (0)' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(butter)
  fireEvent.click(screen.getByRole('button', { name: '추가 (1)' }))
  expect(select).toHaveBeenCalledOnce()
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 'butter' }))
  expect(close).toHaveBeenCalledOnce()
})
it('shows a retryable failure instead of an empty result or stale ingredient list', async () => {
  vi.mocked(loadIngredientsFromFirestore).mockRejectedValueOnce(new Error('offline'))
  render(<MemoryRouter><LanguageProvider><IngredientSearchModal isOpen onClose={vi.fn()} onIngredientSelect={vi.fn()} multiSelect countSelection /></LanguageProvider></MemoryRouter>)
  await screen.findByText('식재료를 불러오지 못했습니다.')
  expect(screen.queryByText('검색 결과가 없습니다.')).toBeNull()
  expect(screen.queryByText('버터')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(await screen.findByText('버터')).toBeTruthy()
  expect(screen.queryByText('식재료를 불러오지 못했습니다.')).toBeNull()
})
