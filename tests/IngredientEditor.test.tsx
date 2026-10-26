import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { LanguageProvider } from '../src/context/LanguageContext'
import { AddIngredientPage } from '../src/pages/AddIngredientPage'
import { IngredientEditPage } from '../src/pages/IngredientEditPage'
import { saveIngredientToFirestore, updateIngredientInFirestore } from '../src/services/ingredientService'

vi.mock('../src/services/ingredientService', () => ({
  saveIngredientToFirestore: vi.fn(async () => 'new-id'), updateIngredientInFirestore: vi.fn(async () => {}),
  deleteIngredientFromFirestore: vi.fn(), loadIngredientsFromFirestore: vi.fn(async () => {}),
  getIngredientById: vi.fn(() => ({ id: 'existing', name: 'Soy sauce', nameKo: '간장', baseAmount: 100, baseUnit: 'g', carbs: 8, protein: 6, fat: 0, gramsPerCup: 200, conversionGrams: 100 })),
}))
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: vi.fn(), convertToRecipe: vi.fn() }))
// happy-dom does not implement the table geometry used by the width observer.
vi.mock('../src/components/useIngredientColumnWidth', async () => {
  const { useRef } = await import('react')
  return { useIngredientColumnWidth: () => useRef(null) }
})

beforeEach(() => vi.clearAllMocks())
function show(mode: 'create' | 'edit') {
  const router = createMemoryRouter([
    { path: '/add-ingredient', element: <AddIngredientPage /> },
    { path: '/ingredient/:id/edit', element: <IngredientEditPage /> },
    { path: '/ingredients', element: <h1>목록</h1> },
  ], { initialEntries: [mode === 'create' ? '/add-ingredient' : '/ingredient/existing/edit'] })
  render(<LanguageProvider><RouterProvider router={router} /></LanguageProvider>)
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

it('creates an ingredient with every optional unit conversion using the edit form', async () => {
  show('create')
  expect(screen.queryByRole('button', { name: '식재료 삭제' })).toBeNull()
  change('한글 이름', '새 간장')
  change('영문 이름', 'New soy sauce')
  change('탄수화물 (g)', '8')
  change('단백질 (g)', '6')
  const headers = screen.getAllByRole('columnheader').map(header => header.textContent)
  expect(headers).toEqual(['g', 'ml', 'T', 't', '컵', '개', '캔', '팩', '꼬집', '줌', 'oz', 'lbs', '선택안함'])
  expect((screen.getByLabelText('oz') as HTMLInputElement).readOnly).toBe(true)
  expect((screen.getByLabelText('oz') as HTMLInputElement).disabled).toBe(true)
  expect((screen.getByLabelText('oz') as HTMLInputElement).value).toBe('3.5')
  expect((screen.getByLabelText('lbs') as HTMLInputElement).disabled).toBe(true)
  expect((screen.getByLabelText('lbs') as HTMLInputElement).value).toBe('0.2')
  expect((screen.getByLabelText('선택안함') as HTMLInputElement).disabled).toBe(true)
  const units = ['T', 't', '컵', '개', '캔', '줌', '팩']
  units.forEach((unit, i) => change(unit, String(i + 1)))
  change('ml', '80')
  change('꼬집', '20')
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))
  await waitFor(() => expect(saveIngredientToFirestore).toHaveBeenCalledOnce())
  expect(saveIngredientToFirestore).toHaveBeenCalledWith(expect.objectContaining({
    name: 'New soy sauce', nameKo: '새 간장', carbs: 8, protein: 6, fat: 0,
    conversionGrams: 100, gramsPerTbsp: 100, gramsPerTsp: 50, gramsPerCup: 100 / 3,
    gramsPerEach: 25, gramsPerCan: 20, gramsPerHandful: 100 / 6, gramsPerPack: 100 / 7,
    gramsPerMl: 1.25, gramsPerPinch: 5,
  }))
  expect(updateIngredientInFirestore).not.toHaveBeenCalled()
  await screen.findByRole('heading', { name: '목록' })
})

it('blocks invalid conversions without creating a document', async () => {
  show('create')
  change('한글 이름', '새 재료')
  change('영문 이름', 'New ingredient')
  change('캔', '0')
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))
  expect((await screen.findByRole('alert')).textContent).toContain('단위 환산 값은 0보다 커야 합니다.')
  expect(saveIngredientToFirestore).not.toHaveBeenCalled()
})

it('keeps the edit workflow and its stored conversion values', async () => {
  show('edit')
  await screen.findByRole('heading', { name: '식재료 수정' })
  expect((screen.getByLabelText('컵') as HTMLInputElement).value).toBe('0.5')
  expect(screen.getByRole('button', { name: '식재료 삭제' })).toBeDefined()
  change('컵', '1')
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))
  await waitFor(() => expect(updateIngredientInFirestore).toHaveBeenCalledWith('existing', expect.objectContaining({ gramsPerCup: 100 })))
  expect(saveIngredientToFirestore).not.toHaveBeenCalled()
})

it('allows clearing numeric fields and saving replacement numbers', async () => {
  show('edit')
  await screen.findByRole('heading', { name: '식재료 수정' })
  const replacements = [
    ['기준량', '200'], ['탄수화물 (g)', '25.5'],
    ['단백질 (g)', '12'], ['지방 (g)', '0'],
  ]
  for (const [label, value] of replacements) {
    change(label, '')
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('')
    fireEvent.submit(screen.getByRole('button', { name: '저장', exact: true }).closest('form')!)
    expect(updateIngredientInFirestore).not.toHaveBeenCalled()
    change(label, value)
  }
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))
  await waitFor(() => expect(updateIngredientInFirestore).toHaveBeenCalledWith('existing', expect.objectContaining({
    baseAmount: 200, carbs: 25.5, protein: 12, fat: 0,
  })))
})
