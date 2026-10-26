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
  expect(headers[0].textContent).toContain('식재료')
  expect(table.querySelectorAll('tbody tr:first-child td')[0].textContent).toContain('가지')
  expect(table.textContent).toContain('(54g 부족)')
  expect(table.textContent).not.toContain('(+54)')
  const target = table.querySelector('.recipe-table__recommended')!
  expect(target.textContent).toContain('560')
  expect(Array.from(target.querySelectorAll('td.macro')).map(cell => cell.textContent)).toEqual(['60.0', '35.0', '20.0'])
})
