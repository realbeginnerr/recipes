import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { RecipeTable } from '../src/components/RecipeTable'
import { LanguageProvider, useLanguage } from '../src/context/LanguageContext'
import { ingredientById } from '../src/data/ingredientCache'

vi.mock('../src/firebase', () => ({ storage: {}, db: {} }))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: true }) }))
vi.mock('../src/components/AddPageAccessProvider', () => ({ useAddPageAccess: () => ({ approvedPath: null }) }))
vi.mock('../src/components/useIngredientColumnWidth', async () => { const { useRef } = await import('react'); return { useIngredientColumnWidth: () => useRef(null) } })
afterEach(() => ingredientById.clear())
function Languages() {
  const { setLanguage } = useLanguage()
  return <><button onClick={() => setLanguage('ko')}>한국어 모드</button><button onClick={() => setLanguage('en')}>영어 모드</button></>
}
it.each([true, false])('shows only the active language in the ingredient table and preserves quantities (creating=%s)', creating => {
  ingredientById.set('butter', { id: 'butter', name: 'Butter', nameKo: '버터', baseAmount: 100, baseUnit: 'g', carbs: 1, protein: 1, fat: 80, allowedUnits: ['g'], conversions: { g: 1 } })
  render(<MemoryRouter><LanguageProvider><Languages /><RecipeTable defaultEditing creating={creating}
    recipe={{ id: 'language-test', name: 'Bread', nameKo: '빵', imageUrl: '', items: [{ ingredientId: 'butter', defaultAmount: 72, defaultUnit: 'g' }] }}
    rows={[]} appliedSearch="" divisionCount={4} onDivisionCountChange={vi.fn()} onAmountChange={vi.fn()} onUnitChange={vi.fn()}
    multigrainRiceAmount={100} multigrainRiceUnit="g" onMultigrainRiceAmountChange={vi.fn()} onMultigrainRiceUnitChange={vi.fn()} onSaveRecipe={vi.fn(async () => {})}
  /></LanguageProvider></MemoryRouter>)
  const korean = screen.getByRole('table', { name: '주재료 표' })
  expect(korean.getAttribute('lang')).toBe('ko')
  expect(within(korean).getByRole('columnheader', { name: '식재료', exact: true })).toBeTruthy()
  expect(within(korean).getByRole('link', { name: '버터', exact: true })).toBeTruthy()
  expect(within(korean).queryByText('Butter', { exact: true })).toBeNull()
  fireEvent.change(within(korean).getByRole('spinbutton', { name: '버터 수량' }), { target: { value: '80' } })
  fireEvent.click(screen.getByRole('button', { name: '영어 모드' }))
  const english = screen.getByRole('table', { name: 'Main ingredients' })
  expect(english.getAttribute('lang')).toBe('en')
  expect(screen.queryByRole('table', { name: '주재료 표' })).toBeNull()
  expect(within(english).getByRole('columnheader', { name: 'Ingredient', exact: true })).toBeTruthy()
  expect(within(english).queryByRole('columnheader', { name: '식재료', exact: true })).toBeNull()
  expect(within(english).getByRole('link', { name: 'Butter', exact: true })).toBeTruthy()
  expect(within(english).queryByText('버터', { exact: true })).toBeNull()
  expect((within(english).getByRole('spinbutton', { name: 'Butter quantity' }) as HTMLInputElement).value).toBe('80')
  fireEvent.click(screen.getByRole('button', { name: '한국어 모드' }))
  expect(screen.queryByRole('table', { name: 'Main ingredients' })).toBeNull()
  expect((within(screen.getByRole('table', { name: '주재료 표' })).getByRole('spinbutton', { name: '버터 수량' }) as HTMLInputElement).value).toBe('80')
})
