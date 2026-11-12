import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AddIngredientPage } from '../src/pages/AddIngredientPage'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ingredientById } from '../src/data/ingredientCache'
import { saveIngredientToFirestore } from '../src/services/ingredientService'
import { loadRecipesFromFirestore, updateRecipeInFirestore } from '../src/services/recipeService'

vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn(async () => {}), saveIngredientToFirestore: vi.fn(async () => 'linked'), updateIngredientInFirestore: vi.fn(), deleteIngredientFromFirestore: vi.fn(), getIngredientById: vi.fn() }))
vi.mock('../src/data/recipe', () => ({ recipes: [] }))
vi.mock('../src/components/useIngredientColumnWidth', async () => { const { useRef } = await import('react'); return { useIngredientColumnWidth: () => useRef(null) } })
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: vi.fn(async () => []), updateRecipeInFirestore: vi.fn(async () => {}), convertToRecipe: (value: unknown) => value, mergeStaticAndFirestoreRecipes: (_static: unknown, docs: unknown) => docs }))
const paste = { id: 'paste', name: 'Red bean paste', nameKo: '팥앙금', imageUrl: '', finishedWeightGrams: 1000, items: [{ ingredientId: 'sugar', defaultAmount: 200, defaultUnit: 'g' }] }
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(loadRecipesFromFirestore).mockResolvedValue([paste] as never)
  ingredientById.clear()
  ingredientById.set('sugar', { id: 'sugar', name: 'Sugar', nameKo: '설탕', baseAmount: 100, baseUnit: 'g', carbs: 100, protein: 0, fat: 0, conversions: { g: 1 }, allowedUnits: ['g'] })
})
function show() { render(<MemoryRouter initialEntries={['/add-ingredient']}><LanguageProvider><Routes><Route path="/add-ingredient" element={<AddIngredientPage />} /><Route path="/ingredients" element={<p>Ingredient list</p>} /></Routes></LanguageProvider></MemoryRouter>) }
async function selectPaste() {
  fireEvent.click(screen.getByRole('button', { name: '등록된 레시피에서 선택' }))
  fireEvent.change(screen.getByLabelText('레시피 검색'), { target: { value: '팥앙금' } })
  fireEvent.click(await screen.findByRole('button', { name: '팥앙금', exact: true }))
}
function confirm() { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '확인', exact: true })) }

it('stages recipe and 200g usage until confirmation, calculates the portion, and never writes the original recipe', async () => {
  const before = structuredClone(paste)
  show()
  fireEvent.change(screen.getByLabelText('한글 이름'), { target: { value: '작성 중' } })
  await selectPaste()
  expect(screen.getByRole('dialog', { name: '레시피 선택' })).toBeTruthy()
  expect((screen.getByLabelText('한글 이름') as HTMLInputElement).value).toBe('작성 중')
  fireEvent.change(screen.getByLabelText('사용중량 (g)'), { target: { value: '200' } })
  confirm()
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect((screen.getByLabelText('기준량') as HTMLInputElement).value).toBe('200')
  expect((screen.getByLabelText('탄수화물 (g)') as HTMLInputElement).value).toBe('40')
  expect(updateRecipeInFirestore).not.toHaveBeenCalled()
  expect(paste).toEqual(before)
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))
  await screen.findByText('Ingredient list')
  expect(saveIngredientToFirestore).toHaveBeenCalledWith(expect.objectContaining({ sourceRecipeId: 'paste', baseAmount: 200, baseUnit: 'g', carbs: 40 }))
})
it('cancels both recipe and usage changes without writing either document', async () => {
  show()
  fireEvent.change(screen.getByLabelText('한글 이름'), { target: { value: '작성 중' } })
  await selectPaste()
  fireEvent.change(screen.getByLabelText('사용중량 (g)'), { target: { value: '250' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소', exact: true }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect((screen.getByLabelText('한글 이름') as HTMLInputElement).value).toBe('작성 중')
  expect((screen.getByLabelText('기준량') as HTMLInputElement).value).toBe('100')
  expect(updateRecipeInFirestore).not.toHaveBeenCalled()
  expect(saveIngredientToFirestore).not.toHaveBeenCalled()
})
it('puts red usage validation directly beside its input and keeps the dialog open for invalid amounts', async () => {
  show()
  await selectPaste()
  const input = screen.getByLabelText('사용중량 (g)')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(input.getAttribute('aria-describedby')).toBeNull()
  confirm()
  const alert = screen.getByRole('alert')
  expect(alert.textContent).toBe('사용중량을 입력해 주세요.')
  expect(input.parentElement).toBe(alert.parentElement)
  expect(alert.classList.contains('text-destructive')).toBe(true)
  expect(input.getAttribute('aria-describedby')).toBe(alert.id)
  for (const value of ['0', '-1']) {
    fireEvent.change(input, { target: { value } })
    confirm()
    expect(screen.getByRole('alert').textContent).toContain('0보다 큰')
    expect(screen.getByRole('dialog')).toBeTruthy()
  }
  expect(updateRecipeInFirestore).not.toHaveBeenCalled()
})
it('accepts a recipe without finished weight using a disclosed input-weight estimate', async () => {
  vi.mocked(loadRecipesFromFirestore).mockResolvedValue([{ ...paste, finishedWeightGrams: undefined }] as never)
  show()
  await selectPaste()
  expect(screen.queryByLabelText('완성 중량 (g)')).toBeNull()
  expect(screen.getByText(/조리 중 수분 변화는 반영되지 않습니다/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('사용중량 (g)'), { target: { value: '50' } })
  confirm()
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect((screen.getByLabelText('탄수화물 (g)') as HTMLInputElement).value).toBe('50')
  expect(updateRecipeInFirestore).not.toHaveBeenCalled()
})
it('preserves the draft and usage on calculation failure and shows the error beside the input', async () => {
  vi.mocked(loadRecipesFromFirestore).mockResolvedValue([{ ...paste, items: [{ ingredientId: 'missing', defaultAmount: 100, defaultUnit: 'g' }] }] as never)
  show()
  await selectPaste()
  fireEvent.change(screen.getByLabelText('사용중량 (g)'), { target: { value: '200' } })
  confirm()
  expect(screen.getByRole('alert').textContent).toContain('식재료')
  expect(screen.getByRole('alert').parentElement).toBe(screen.getByLabelText('사용중량 (g)').parentElement)
  expect((screen.getByLabelText('사용중량 (g)') as HTMLInputElement).value).toBe('200')
  expect(updateRecipeInFirestore).not.toHaveBeenCalled()
})
it('keeps entered fields on load failure and permits retry', async () => {
  vi.mocked(loadRecipesFromFirestore).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([paste] as never)
  show()
  fireEvent.change(screen.getByLabelText('한글 이름'), { target: { value: '작성 중' } })
  fireEvent.click(screen.getByRole('button', { name: '등록된 레시피에서 선택' }))
  await screen.findByText('레시피를 불러오지 못했습니다.')
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
  await screen.findByRole('button', { name: '팥앙금', exact: true })
  expect((screen.getByLabelText('한글 이름') as HTMLInputElement).value).toBe('작성 중')
})
