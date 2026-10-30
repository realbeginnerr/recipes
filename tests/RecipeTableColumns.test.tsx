import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { RecipeTable } from '../src/components/RecipeTable'
import { LanguageProvider } from '../src/context/LanguageContext'
import { ingredientById } from '../src/data/ingredientCache'

vi.mock('../src/firebase', () => ({ storage: {} }))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: true }) }))
vi.mock('../src/components/AddPageAccessProvider', () => ({ useAddPageAccess: () => ({ approvedPath: null }) }))
vi.mock('../src/components/IngredientSearchModal', () => ({ IngredientSearchModal: () => null }))
vi.mock('../src/components/useIngredientColumnWidth', async () => {
  const { useRef } = await import('react')
  return { useIngredientColumnWidth: () => useRef(null) }
})
afterEach(() => ingredientById.clear())

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
  await waitFor(() => expect(onSaveRecipe).toHaveBeenCalledWith(expect.objectContaining({ photoProductDescription: '컵 설명\nhttps://example.com/cup', photoProductUrl: 'https://example.com/buy' })))
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
