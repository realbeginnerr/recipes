import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Link, MemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RecipeTable } from '../src/components/RecipeTable'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ingredientById } from '../src/data/ingredientCache'
import { uploadBytes } from 'firebase/storage'
import { loadRecipesFromFirestore } from '../src/services/recipeService'
import type { Recipe } from '../src/types'

vi.mock('../src/firebase', () => ({ storage: {} }))
vi.mock('firebase/storage', () => ({
  ref: vi.fn((_storage, path) => ({ bucket: 'test', fullPath: path })),
  uploadBytes: vi.fn(async (ref) => ({ ref })),
  getDownloadURL: vi.fn(async (ref) => `https://example.com/${ref.fullPath}`),
}))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: true }) }))
vi.mock('../src/components/AddPageAccessProvider', () => ({ useAddPageAccess: () => ({ approvedPath: null }) }))
vi.mock('../src/components/useIngredientColumnWidth', async () => { const { useRef } = await import('react'); return { useIngredientColumnWidth: () => useRef(null) } })
vi.mock('../src/components/IngredientSearchModal', () => ({ IngredientSearchModal: () => null }))
vi.mock('../src/data/recipe', () => ({ recipes: [] }))
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: vi.fn(async () => []), mergeStaticAndFirestoreRecipes: (_static: unknown, docs: unknown) => docs }))

const original = (): Recipe => ({ id: 'audit', name: 'Audit recipe', nameKo: '점검 레시피', imageUrl: '', imageUrls: [], items: [{ ingredientId: 'flour', defaultAmount: 200, defaultUnit: 'g' }], memo: 'Keep this note' })
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200 })))
  ingredientById.set('flour', { id: 'flour', name: 'Flour', nameKo: '밀가루', baseAmount: 100, baseUnit: 'g', carbs: 10, protein: 1, fat: 0, allowedUnits: ['g', '컵'], conversions: { g: 1, '컵': 200 } })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
function editor(save = vi.fn(async () => {}), remove?: (id: string) => Promise<void>, recipe = original()) {
  return <RecipeTable defaultEditing recipe={recipe} rows={[]} appliedSearch="" divisionCount={4} onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={save} onDeleteRecipe={remove} />
}
function show(save = vi.fn(async () => {}), remove?: (id: string) => Promise<void>) {
  render(<MemoryRouter><LanguageProvider>{editor(save, remove)}</LanguageProvider></MemoryRouter>)
}
const saveClick = () => fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
it('keeps the edit draft and exposes recovery actions when a stale save conflicts', async () => {
  const save = vi.fn().mockRejectedValue(Object.assign(new Error('conflict'), { code: 'recipe/conflict' }))
  show(save)
  fireEvent.change(screen.getByLabelText('한글 이름'), { target: { value: '수정한 이름' } })
  saveClick()
  await screen.findByRole('button', { name: '초안 복사' })
  expect((screen.getByLabelText('한글 이름') as HTMLInputElement).value).toBe('수정한 이름')
  expect(screen.getByRole('link', { name: '최신 내용 확인 (새 탭)' }).getAttribute('target')).toBe('_blank')
  expect(screen.getAllByRole('button', { name: '저장', exact: true })[0].hasAttribute('disabled')).toBe(false)
})
it('excludes concurrent save and delete requests, then keeps input on delete failure and permits retry', async () => {
  let reject!: (error: Error) => void
  const remove = vi.fn().mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail })).mockResolvedValueOnce(undefined)
  const save = vi.fn(async () => {})
  show(save, remove)
  fireEvent.click(screen.getAllByRole('button', { name: '삭제', exact: true })[0])
  expect(await screen.findByText('삭제 중...')).toBeTruthy()
  expect(screen.getAllByRole('button', { name: '저장', exact: true })[0].hasAttribute('disabled')).toBe(true)
  reject(new Error('offline'))
  await screen.findByRole('button', { name: '다시 삭제' })
  expect((screen.getByLabelText('메모') as HTMLTextAreaElement).value).toBe('Keep this note')
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '다시 삭제' }))
  await waitFor(() => expect(remove).toHaveBeenCalledTimes(2))
})
it('reuses the first completed photo upload when the second upload fails and is retried', async () => {
  const save = vi.fn(async () => {})
  vi.mocked(uploadBytes).mockImplementationOnce(async ref => ({ ref } as never)).mockRejectedValueOnce(new Error('upload interrupted')).mockImplementationOnce(async ref => ({ ref } as never))
  show(save)
  const choose = (index: number, name: string) => fireEvent.change(document.querySelectorAll('input[type=file]')[index], { target: { files: [new File(['image'], name, { type: 'image/png' })] } })
  choose(0, 'first.png')
  fireEvent.click(screen.getByRole('button', { name: '사진 추가' }))
  choose(1, 'second.png')
  saveClick()
  await screen.findByText(/레시피 저장에 실패했습니다/)
  expect(uploadBytes).toHaveBeenCalledTimes(2)
  expect((screen.getByLabelText('사진 1 URL') as HTMLInputElement).value).toContain('first.png')
  expect(save).not.toHaveBeenCalled()
  saveClick()
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  expect(uploadBytes).toHaveBeenCalledTimes(3)
})
it('adds imported ingredients without mutating the original recipe and offers retry on list load failure', async () => {
  vi.mocked(loadRecipesFromFirestore).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ id: 'other', name: 'Imported', nameKo: '불러올 레시피', imageUrl: '', items: [{ ingredientId: 'flour', defaultAmount: 50, defaultUnit: 'g' }] }] as never)
  const recipe = original()
  render(<MemoryRouter><LanguageProvider>{editor(vi.fn(async () => {}), undefined, recipe)}</LanguageProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: '다른 레시피 불러오기' }))
  await screen.findByText('레시피 목록을 불러오지 못했습니다.')
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  fireEvent.click(await screen.findByLabelText('불러올 레시피'))
  fireEvent.click(screen.getByRole('button', { name: '선택한 1개 레시피의 재료 추가' }))
  expect((screen.getByRole('spinbutton', { name: '밀가루 수량' }) as HTMLInputElement).value).toBe('250')
  expect(recipe.items[0].defaultAmount).toBe(200)
})
it('blocks an unsaved app navigation and browser close, and keeps the draft when staying', async () => {
  const router = createMemoryRouter([
    { path: '/edit', element: <LanguageProvider>{editor()}<Link to="/other">다른 화면</Link></LanguageProvider> },
    { path: '/other', element: <p>Other page</p> },
  ], { initialEntries: ['/edit'] })
  render(<RouterProvider router={router} />)
  const clean = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(clean)
  expect(clean.defaultPrevented).toBe(false)
  fireEvent.change(screen.getByLabelText('한글 이름'), { target: { value: '미저장 이름' } })
  const dirty = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(dirty)
  expect(dirty.defaultPrevented).toBe(true)
  fireEvent.click(screen.getByRole('link', { name: '다른 화면' }))
  await screen.findByRole('button', { name: '계속 작성' })
  fireEvent.click(screen.getByRole('button', { name: '계속 작성' }))
  expect((screen.getByLabelText('한글 이름') as HTMLInputElement).value).toBe('미저장 이름')
  fireEvent.click(screen.getByRole('link', { name: '다른 화면' }))
  fireEvent.click(await screen.findByRole('button', { name: '저장하지 않고 나가기' }))
  await screen.findByText('Other page')
})
