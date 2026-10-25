import { ingredientById } from '../src/data/ingredientCache'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { LanguageProvider } from '../src/context/LanguageContext'
import { AddRecipePage } from '../src/pages/AddRecipePage'
import { saveRecipeToFirestore } from '../src/services/recipeService'
import type { Ingredient } from '../src/types'

vi.mock('../src/services/recipeService', () => ({ saveRecipeToFirestore: vi.fn(async () => 'new-recipe'), loadRecipesFromFirestore: vi.fn(async () => []) }))
vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn(async () => {}), saveIngredientToFirestore: vi.fn(), findIngredientByName: vi.fn(), ingredientByName: new Map() }))
vi.mock('../src/utils/analytics', () => ({ trackAddRecipeCompleted: vi.fn(), trackIngredientSearchOpened: vi.fn() }))
vi.mock('../src/components/useIngredientColumnWidth', async () => {
  const { useRef } = await import('react')
  return { useIngredientColumnWidth: () => useRef(null) }
})
vi.mock('../src/components/IngredientSearchModal', () => ({
  IngredientSearchModal: ({ isOpen, onIngredientSelect }: { isOpen: boolean; onIngredientSelect: (ingredient: Ingredient) => void }) => isOpen
    ? <button onClick={() => onIngredientSelect({ id: 'eggplant', name: 'Eggplant', nameKo: '가지', baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 1, fat: 0, allowedUnits: ['g'], conversions: { g: 1 } })}>가지 선택</button> : null,
}))

it('opens the recipe form directly and saves selected ingredients without SNS entry', async () => {
  ingredientById.set('eggplant', { id: 'eggplant', name: 'Eggplant', nameKo: '가지', baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 1, fat: 0, allowedUnits: ['g'], conversions: { g: 1 } })
  render(<LanguageProvider><RouterProvider router={createMemoryRouter([{ path: '/add-recipe', element: <AddRecipePage /> }], { initialEntries: ['/add-recipe'] })} /></LanguageProvider>)
  expect(screen.getByPlaceholderText('한글 이름')).toBeDefined()
  for (const row of document.querySelectorAll('.recipe-table__recommended')) {
    expect(Array.from(row.querySelectorAll('td.macro')).map(cell => cell.textContent)).toEqual(['60.0', '35.0', '20.0'])
  }
  expect(screen.queryByText('SNS에서 레시피 추가하기')).toBeNull()
  expect(screen.queryByText('어떤 방식으로 레시피를 추가하시겠어요?')).toBeNull()
  expect(screen.queryByRole('button', { name: '미리보기' })).toBeNull()
  fireEvent.change(screen.getByPlaceholderText('한글 이름'), { target: { value: '가지볶음' } })
  fireEvent.change(screen.getByPlaceholderText('English name'), { target: { value: 'Eggplant Stir-Fry' } })
  fireEvent.click(screen.getByRole('button', { name: /주재료 추가/ }))
  fireEvent.click(screen.getByRole('button', { name: '가지 선택' }))
  fireEvent.change(screen.getByLabelText('가지 요리 그룹'), { target: { value: '반죽' } })
  const portions = screen.getByRole('spinbutton', { name: '인분 수' }) as HTMLInputElement
  expect(portions.value).toBe('4')
  fireEvent.focus(portions)
  fireEvent.change(portions, { target: { value: '' } })
  expect(portions.value).toBe('')
  fireEvent.change(portions, { target: { value: '2' } })
  fireEvent.blur(portions)
  expect(portions.value).toBe('2')
  fireEvent.click(screen.getByRole('button', { name: '레시피 추가', exact: true }))
  await waitFor(() => expect(saveRecipeToFirestore).toHaveBeenCalledWith(expect.objectContaining({
    nameKo: '가지볶음', name: 'Eggplant Stir-Fry', divisionCount: 2, cookingGroupOrder: ['반죽'], items: [{ ingredientId: 'eggplant', amount: 100, unit: 'g', cookingGroup: '반죽' }],
  })))
  expect(screen.getByPlaceholderText('한글 이름')).toBeDefined()
})
