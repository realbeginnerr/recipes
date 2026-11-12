import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { RecipeTable } from '../src/components/RecipeTable'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ingredientById } from '../src/data/ingredientCache'

vi.mock('../src/firebase', () => ({ storage: {}, db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'recipes'),
  doc: vi.fn((_db, collection, id) => {
    if (/^__.*__$/.test(id)) throw Object.assign(new Error('Reserved document ID'), { code: 'invalid-argument' })
    return `${collection}/${id}`
  }),
  getDocs: vi.fn(), orderBy: vi.fn(), query: vi.fn(),
  getDocsFromServer: vi.fn(async () => ({ docs: [] })),
  runTransaction: vi.fn(async (_db, callback) => callback({
    get: async () => ({ data: () => ({ revision: 0 }) }),
    set: vi.fn(),
  })),
}))
import { runTransaction } from 'firebase/firestore'
import { updateRecipeInFirestore } from '../src/services/recipeService'

it('saves gamjatang after deleting potato from the ingredient editor', async () => {
  const items = ['potato', 'pork'].map(id => {
    ingredientById.set(id, { id, name: id, nameKo: id === 'potato' ? '감자' : '돼지고기', baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 1, fat: 0, allowedUnits: ['g'], conversions: { g: 1 } })
    return { ingredientId: id, defaultAmount: 100, defaultUnit: 'g' }
  })
  const set = vi.fn()
  vi.mocked(runTransaction).mockImplementationOnce(async (_db, callback) => callback({
    get: async () => ({ data: () => ({ revision: 0 }) }), set,
  } as never))
  const onSaveRecipe = vi.fn(updateRecipeInFirestore)
  render(<MemoryRouter><LanguageProvider><RecipeTable defaultEditing
    recipe={{ id: 'gamjatang', name: 'Gamjatang', nameKo: '감자탕', imageUrl: '', items }}
    rows={items.map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: 'g' }))}
    appliedSearch="" divisionCount={4} onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={onSaveRecipe}
  /></LanguageProvider></MemoryRouter>)
  fireEvent.click(within(screen.getByText('감자').closest('tr')!).getByRole('button', { name: '✕' }))
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  await waitFor(() => expect(set).toHaveBeenCalledWith('recipes/gamjatang', expect.objectContaining({
    items: [{ ingredientId: 'pork', amount: 100, unit: 'g' }],
  })))
  await waitFor(() => expect(screen.queryByRole('button', { name: '저장', exact: true })).toBeNull())
  expect(onSaveRecipe).toHaveBeenCalledTimes(1)
})
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: true }) }))
vi.mock('../src/components/AddPageAccessProvider', () => ({ useAddPageAccess: () => ({ approvedPath: null }) }))
vi.mock('../src/components/IngredientSearchModal', () => ({ IngredientSearchModal: () => null }))
vi.mock('../src/components/useIngredientColumnWidth', async () => {
  const { useRef } = await import('react')
  return { useIngredientColumnWidth: () => useRef(null) }
})
afterEach(() => ingredientById.clear())

it('adds and removes cooking dates and keeps them when reopening the editor', async () => {
  const recipe = { id: 'history', name: 'History', nameKo: '기록', imageUrl: '', items: [], lastCookedAt: '2026-11-01' }
  const onSaveRecipe = vi.fn(async () => {})
  const editor = (value: typeof recipe) => <MemoryRouter><LanguageProvider><RecipeTable defaultEditing recipe={value} rows={[]}
    appliedSearch="" divisionCount={4} onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={onSaveRecipe}
  /></LanguageProvider></MemoryRouter>
  const first = render(editor(recipe))
  expect((screen.getByLabelText('요리한 날짜 1') as HTMLInputElement).value).toBe('2026-11-01')
  fireEvent.click(screen.getByRole('button', { name: '+ 날짜 추가' }))
  fireEvent.change(screen.getByLabelText('요리한 날짜 2'), { target: { value: '2026-11-09' } })
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  await waitFor(() => expect(screen.queryByRole('button', { name: '저장', exact: true })).toBeNull())
  const saved = (onSaveRecipe.mock.calls as unknown as [typeof recipe & { cookedDates: string[] }][]) [0][0]
  expect(saved.cookedDates).toEqual(['2026-11-01', '2026-11-09'])
  expect(saved.lastCookedAt).toBe('2026-11-09')
  first.unmount()
  render(editor(saved))
  expect((screen.getByLabelText('요리한 날짜 2') as HTMLInputElement).value).toBe('2026-11-09')
  fireEvent.click(screen.getByRole('button', { name: '요리한 날짜 2 삭제' }))
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  await waitFor(() => expect(onSaveRecipe).toHaveBeenCalledTimes(2))
  expect(onSaveRecipe).toHaveBeenLastCalledWith(expect.objectContaining({ cookedDates: ['2026-11-01'], lastCookedAt: '2026-11-01' }), expect.any(Function))
})

it('keeps the two butter quantities distinct after saving and reopening the salt bread editor', async () => {
  ingredientById.set('butter', { id: 'butter', name: 'Butter', nameKo: '버터', baseAmount: 100, baseUnit: 'g', carbs: 0, protein: 0, fat: 80, allowedUnits: ['g'], conversions: { g: 1 } })
  const original = { id: 'salt-bread', name: 'Salt bread', nameKo: '소금빵', imageUrl: '', items: [
    { ingredientId: 'butter', defaultAmount: 100, defaultUnit: 'g', cookingGroup: 'dough' },
    { ingredientId: 'butter', defaultAmount: 100, defaultUnit: 'g', cookingGroup: 'filling' },
  ] }
  const onSaveRecipe = vi.fn(updateRecipeInFirestore)
  const editor = (recipe: typeof original) => <MemoryRouter><LanguageProvider><RecipeTable defaultEditing
    recipe={recipe} rows={recipe.items.map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: item.defaultUnit }))}
    appliedSearch="" divisionCount={4} onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={onSaveRecipe}
  /></LanguageProvider></MemoryRouter>
  const amounts = () => screen.getAllByRole('row').filter(row => within(row).queryByRole('link', { name: '버터' })).map(row => within(row).getByRole('spinbutton') as HTMLInputElement)
  const first = render(editor(original))
  fireEvent.change(amounts()[0], { target: { value: '20' } })
  fireEvent.change(amounts()[1], { target: { value: '72' } })
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  await waitFor(() => expect(onSaveRecipe).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(screen.queryByRole('button', { name: '저장', exact: true })).toBeNull())
  const saved = onSaveRecipe.mock.calls[0][0] as typeof original
  expect(saved.items.map(item => item.defaultAmount)).toEqual([20, 72])
  first.unmount()
  render(editor(saved))
  expect(amounts().map(input => input.value)).toEqual(['20', '72'])
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  await waitFor(() => expect(onSaveRecipe).toHaveBeenCalledTimes(2))
  expect(onSaveRecipe.mock.calls[1][0].items.map(item => item.defaultAmount)).toEqual([20, 72])
})

it.each(['nameKo', 'name'] as const)('shows a duplicate %s error on the edit form without discarding the draft', async field => {
  const onSaveRecipe = vi.fn().mockRejectedValue(Object.assign(new Error('duplicate'), { code: 'recipe/duplicate-name', fields: [field] }))
  render(<MemoryRouter><LanguageProvider><RecipeTable defaultEditing
    recipe={{ id: 'test', name: 'Test', nameKo: '테스트', imageUrl: '', items: [] }}
    rows={[]} appliedSearch="" divisionCount={4} onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={onSaveRecipe}
  /></LanguageProvider></MemoryRouter>)
  const input = screen.getByLabelText(field === 'nameKo' ? '한글 이름' : '영문 이름') as HTMLInputElement
  fireEvent.change(input, { target: { value: '중복 이름' } })
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'))
  expect(input.parentElement?.querySelector('[role="alert"]')?.textContent).toBe('이미 존재하는 이름이에요. 다른 이름을 입력해 주세요.')
  expect(input.value).toBe('중복 이름')
  fireEvent.change(input, { target: { value: '다른 이름' } })
  expect(input.getAttribute('aria-invalid')).toBeNull()
})

it.each([true, false])('keeps reorder controls usable with ingredient metadata loaded=%s', loaded => {
  const items = ['first', 'second'].map((id, index) => {
    if (loaded) ingredientById.set(id, { id, name: id, nameKo: id, baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 1, fat: 0, allowedUnits: ['g'], conversions: { g: 1 } })
    return { ingredientId: id, defaultAmount: index + 1, defaultUnit: 'g' }
  })
  render(<MemoryRouter><LanguageProvider><RecipeTable defaultEditing
    recipe={{ id: 'test', name: 'Test', nameKo: '테스트', imageUrl: '', items, sideItems: items }}
    rows={items.map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: 'g' }))} appliedSearch="" divisionCount={4}
    onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={vi.fn()}
  /></LanguageProvider></MemoryRouter>)
  const table = screen.getByRole('table')
  const orderRows = () => Array.from(table.querySelectorAll('tr')).filter(row => row.querySelector('.ingredient-order-arrows'))
  expect(orderRows()).toHaveLength(4)
  fireEvent.click(orderRows()[0].querySelectorAll('button')[1])
  expect(orderRows()[0].querySelectorAll('td')[3].querySelector('input')?.value).toBe('2')
  fireEvent.click(orderRows()[2].querySelectorAll('button')[1])
  const sideAmount = orderRows()[2].querySelectorAll('td')[3]
  expect(sideAmount.querySelector('input')?.value ?? sideAmount.textContent).toBe('2')
})

it('edits and saves temporary photo product information with the recipe', async () => {
  const onSaveRecipe = vi.fn()
  render(<MemoryRouter><LanguageProvider><RecipeTable defaultEditing
    recipe={{ id: 'test', name: 'Test', nameKo: '테스트', imageUrl: '', items: [], photoProductDescription: '기존 설명' }}
    rows={[]} appliedSearch="" divisionCount={4} onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={onSaveRecipe}
  /></LanguageProvider></MemoryRouter>)
  const input = screen.getByLabelText('상품 설명') as HTMLTextAreaElement
  expect(input.value).toBe('기존 설명')
  fireEvent.change(screen.getByLabelText('상품 구매 링크'), { target: { value: 'javascript:alert(1)' } })
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  expect(onSaveRecipe).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('상품 구매 링크'), { target: { value: 'https://example.com/buy' } })
  fireEvent.change(input, { target: { value: '컵 설명\nhttps://example.com/cup' } })
  fireEvent.click(screen.getAllByRole('button', { name: '저장', exact: true })[0])
  await waitFor(() => expect(onSaveRecipe).toHaveBeenCalledWith(expect.objectContaining({ photoProductDescription: '컵 설명\nhttps://example.com/cup', photoProductUrl: 'https://example.com/buy' }), expect.any(Function)))
})

it.each([true, false])('aligns headers, ingredients, sides and footer columns (editing=%s)', editing => {
  const ingredient = { id: 'eggplant', name: 'Eggplant', nameKo: '가지', baseAmount: 100, baseUnit: 'g', carbs: 5, protein: 1, fat: 0, allowedUnits: ['g'], conversions: { g: 1 } }
  ingredientById.set(ingredient.id, ingredient)
  const item = { ingredientId: ingredient.id, defaultAmount: 100, defaultUnit: 'g' }
  render(<MemoryRouter><LanguageProvider><RecipeTable defaultEditing={editing}
    recipe={{ id: 'test', name: 'Test', nameKo: '테스트', imageUrl: '', items: [item], sideItems: [item] }}
    rows={[{ ingredientId: ingredient.id, amount: 100, unit: 'g' }]} appliedSearch="" divisionCount={4}
    onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={vi.fn()}
  /></LanguageProvider></MemoryRouter>)
  const table = screen.getByRole('table') as HTMLTableElement
  const expected = editing ? 9 : 6
  const rows = table.querySelectorAll('tr')
  expect(rows.length).toBeGreaterThan(4)
  for (const row of rows) {
    expect(Array.from(row.querySelectorAll<HTMLTableCellElement>(':scope > th, :scope > td')).reduce((sum, cell) => sum + cell.colSpan, 0)).toBe(expected)
  }
  const headers = table.querySelectorAll('thead th')
  const nameColumn = editing ? 1 : 0
  expect(headers[nameColumn].textContent).toContain('식재료')
  expect(table.querySelectorAll('tbody tr:first-child td')[nameColumn].textContent).toContain('가지')
  if (editing) {
    const orderCell = table.querySelector('tbody tr:first-child td')!
    expect(orderCell.querySelector('.edit-inline__drag-handle')).not.toBeNull()
    expect(orderCell.querySelectorAll('.ingredient-order-arrows button')).toHaveLength(2)
    const nameCell = table.querySelector('.ingredient-name-actions')!
    expect(nameCell.querySelector('a[target="_blank"]')).not.toBeNull()
    expect(nameCell.querySelector('.edit-inline__replace-trigger')).not.toBeNull()
  }
  expect(table.textContent).toContain('(54g 부족)')
  expect(table.textContent).not.toContain('(+54)')
  const target = table.querySelector('.recipe-table__recommended')!
  expect(target.textContent).toContain('560')
  expect(Array.from(target.querySelectorAll('td.macro')).map(cell => cell.textContent)).toEqual(['60.0', '35.0', '20.0'])
})
