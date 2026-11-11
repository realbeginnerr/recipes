import { ingredientById } from '../src/data/ingredientCache'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../src/context/LanguageContext'
import { AddRecipePage } from '../src/pages/AddRecipePage'
import { saveRecipeToFirestore } from '../src/services/recipeService'
import { loadIngredientsFromFirestore } from '../src/services/ingredientService'
import { uploadBytes } from 'firebase/storage'
import type { Ingredient } from '../src/types'

vi.mock('../src/firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: vi.fn((_storage, path) => ({ bucket: 'test', fullPath: path })),
  uploadBytes: vi.fn(async (ref) => ({ ref })),
  getDownloadURL: vi.fn(async (ref) => `https://example.com/${ref.fullPath}`),
}))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: true }) }))
vi.mock('../src/components/AddPageAccessProvider', () => ({ useAddPageAccess: () => ({ approvedPath: '/add-recipe' }) }))
vi.mock('../src/services/recipeService', () => ({ saveRecipeToFirestore: vi.fn(async () => 'new-recipe'), loadRecipesFromFirestore: vi.fn(async () => []) }))
vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn(async () => {}) }))
vi.mock('../src/utils/analytics', () => ({ trackAddRecipeCompleted: vi.fn() }))
vi.mock('../src/components/useIngredientColumnWidth', async () => {
  const { useRef } = await import('react')
  return { useIngredientColumnWidth: () => useRef(null) }
})
vi.mock('../src/components/IngredientSearchModal', () => ({
  IngredientSearchModal: ({ isOpen, onIngredientSelect }: { isOpen: boolean; onIngredientSelect: (ingredient: Ingredient) => void }) => isOpen
    ? <button onClick={() => onIngredientSelect(ingredientById.get('eggplant')!)}>가지 선택</button> : null,
}))

beforeEach(() => {
  vi.clearAllMocks()
  ingredientById.set('eggplant', { id: 'eggplant', name: 'Eggplant', nameKo: '가지', baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 1, fat: 0, allowedUnits: ['g'], conversions: { g: 1 } })
})
async function show() {
  render(<MemoryRouter initialEntries={['/add-recipe']}><LanguageProvider><Routes>
    <Route path="/add-recipe" element={<AddRecipePage />} />
    <Route path="/recipe/:id" element={<p>Saved recipe detail</p>} />
  </Routes></LanguageProvider></MemoryRouter>)
  await screen.findByLabelText('한글 이름')
}
function names() {
  fireEvent.change(screen.getByLabelText('한글 이름'), { target: { value: '가지볶음' } })
  fireEvent.change(screen.getByLabelText('영문 이름'), { target: { value: 'Eggplant Stir-Fry' } })
}
function save() { fireEvent.click(screen.getAllByRole('button', { name: '레시피 추가', exact: true })[0]) }

it('uses the edit form fields and saves ingredients, photos, dates, steps and notes to the detail route', async () => {
  await show()
  names()
  expect(screen.getByLabelText('링크')).toBeDefined()
  fireEvent.change(screen.getByLabelText('조리시간 (분)'), { target: { value: '25' } })
  fireEvent.click(screen.getByRole('button', { name: '+ 날짜 추가' }))
  fireEvent.change(screen.getByLabelText('요리한 날짜 1'), { target: { value: '2026-11-10' } })
  fireEvent.click(screen.getByRole('button', { name: '+ 날짜 추가' }))
  fireEvent.change(screen.getByLabelText('요리한 날짜 2'), { target: { value: '2026-11-01' } })
  fireEvent.change(screen.getByLabelText('사진 1 URL'), { target: { value: 'https://example.com/one.jpg' } })
  fireEvent.click(screen.getByRole('button', { name: '사진 추가' }))
  fireEvent.change(screen.getByLabelText('사진 2 URL'), { target: { value: 'https://example.com/two.jpg' } })
  fireEvent.click(screen.getByRole('button', { name: '대표 사진으로' }))
  fireEvent.change(screen.getByLabelText('메모'), { target: { value: '적게 볶기' } })
  fireEvent.click(screen.getByRole('button', { name: /주재료 추가/ }))
  fireEvent.click(screen.getByRole('button', { name: '가지 선택' }))
  fireEvent.change(screen.getByRole('spinbutton', { name: '가지 수량' }), { target: { value: '72' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: '인분 수' }), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('tab', { name: '요리할 때' }))
  fireEvent.change(screen.getByLabelText('가지 요리 그룹'), { target: { value: '반죽' } })
  fireEvent.click(screen.getByRole('button', { name: '단계 추가' }))
  fireEvent.change(screen.getByLabelText('1단계'), { target: { value: '가지를 볶는다' } })
  save()
  await screen.findByText('Saved recipe detail')
  expect(saveRecipeToFirestore).toHaveBeenCalledWith(expect.objectContaining({
    nameKo: '가지볶음', name: 'Eggplant Stir-Fry', divisionCount: 2, cookingGroupOrder: ['반죽'],
    items: [{ ingredientId: 'eggplant', amount: 72, unit: 'g', cookingGroup: '반죽' }],
    imageUrl: 'https://example.com/two.jpg', imageUrls: ['https://example.com/one.jpg'],
    cookedDates: ['2026-11-01', '2026-11-10'], lastCookedAt: '2026-11-10',
    cookingTimeMinutes: 25, memo: '적게 볶기', cookingSteps: [expect.objectContaining({ text: '가지를 볶는다' })],
  }))
})

it('allows correcting an invalid image URL and retrying after a save failure without losing the draft', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  await show()
  names()
  fireEvent.change(screen.getByLabelText('사진 1 URL'), { target: { value: 'invalid-url' } })
  save()
  expect(saveRecipeToFirestore).not.toHaveBeenCalled()
  expect(screen.getByLabelText('사진 1 URL').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getAllByRole('button', { name: '레시피 추가', exact: true })[0].hasAttribute('disabled')).toBe(false)
  fireEvent.change(screen.getByLabelText('사진 1 URL'), { target: { value: 'https://example.com/valid.jpg' } })
  vi.mocked(saveRecipeToFirestore).mockRejectedValueOnce(new Error('offline'))
  save()
  await screen.findByText(/레시피 저장에 실패했습니다/)
  expect((screen.getByLabelText('한글 이름') as HTMLInputElement).value).toBe('가지볶음')
  await waitFor(() => expect(screen.getAllByRole('button', { name: '레시피 추가', exact: true })[0].hasAttribute('disabled')).toBe(false))
  save()
  await screen.findByText('Saved recipe detail')
  expect(saveRecipeToFirestore).toHaveBeenCalledTimes(2)
})

it.each(['nameKo', 'name'] as const)('marks the duplicate %s field and keeps the draft', async field => {
  vi.mocked(saveRecipeToFirestore).mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 'recipe/duplicate-name', fields: [field] }))
  await show()
  names()
  save()
  const input = screen.getByLabelText(field === 'nameKo' ? '한글 이름' : '영문 이름') as HTMLInputElement
  await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'))
  expect(input.parentElement?.querySelector('[role="alert"]')?.textContent).toBe('이미 존재하는 이름이에요. 다른 이름을 입력해 주세요.')
  fireEvent.change(input, { target: { value: '수정한 이름' } })
  expect(input.getAttribute('aria-invalid')).toBeNull()
})

it('shows a retryable load error instead of an empty form', async () => {
  vi.mocked(loadIngredientsFromFirestore).mockRejectedValueOnce(new Error('offline'))
  render(<MemoryRouter><LanguageProvider><AddRecipePage /></LanguageProvider></MemoryRouter>)
  await screen.findByText('식재료를 불러오지 못했습니다.')
  expect(screen.queryByLabelText('한글 이름')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await screen.findByLabelText('한글 이름')
})

it('uploads multiple selected files and preserves their cover order', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200 })))
  await show()
  names()
  const selectFile = (index: number, name: string) => {
    const input = document.querySelectorAll<HTMLInputElement>('input[type=file]')[index]
    fireEvent.change(input, { target: { files: [new File(['image'], name, { type: 'image/png' })] } })
  }
  selectFile(0, 'first.png')
  fireEvent.click(screen.getByRole('button', { name: '사진 추가' }))
  selectFile(1, 'second.png')
  fireEvent.click(screen.getByRole('button', { name: '대표 사진으로' }))
  save()
  await screen.findByText('Saved recipe detail')
  expect(uploadBytes).toHaveBeenCalledTimes(2)
  const saved = vi.mocked(saveRecipeToFirestore).mock.calls[0][0]
  expect(saved.imageUrl).toContain('second.png')
  expect(saved.imageUrls?.[0]).toContain('first.png')
  vi.unstubAllGlobals()
})
