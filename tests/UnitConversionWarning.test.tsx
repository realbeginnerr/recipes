import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { UnitSelect } from '../src/components/UnitSelect'
import { useState } from 'react'
import { ingredientById } from '../src/data/ingredientCache'
import { hasNutritionConversion } from '../src/utils/recipeUnitValidation'

afterEach(() => ingredientById.clear())
function starch() {
  const ingredient = { id: 'starch', name: 'Potato starch', nameKo: '감자전분', baseUnit: 'g', baseAmount: 100, carbs: 83, protein: 0, fat: 0, allowedUnits: ['g'], conversions: { g: 1 } }
  ingredientById.set('starch', ingredient)
  return ingredient
}
it('warns for an existing unit without a conversion', () => {
  starch()
  render(<UnitSelect ingredientId="starch" value="T" onValueChange={vi.fn()} language="ko" />)
  expect(screen.getByRole('alert').textContent).toContain('환산 정보가 없어')
})
it('warns and prevents applying an unsupported selection', async () => {
  starch()
  const change = vi.fn()
  render(<UnitSelect ingredientId="starch" value="g" onValueChange={change} language="ko" />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox'))
  await user.click(await screen.findByRole('option', { name: 'T', exact: true }))
  expect((await screen.findByRole('alert')).textContent).toContain('T의 환산 정보')
  expect(change).not.toHaveBeenCalled()
})
it('accepts only finite positive conversions and a valid nutrition basis', () => {
  const ingredient = starch()
  expect(hasNutritionConversion(ingredient, 'g')).toBe(true)
  expect(hasNutritionConversion(ingredient, 'T')).toBe(false)
  for (const factor of [0, -1, NaN, Infinity]) {
    expect(hasNutritionConversion({ ...ingredient, conversions: { g: 1, T: factor } }, 'T')).toBe(false)
  }
  expect(hasNutritionConversion({ ...ingredient, conversions: { g: 1, T: 10 } }, 'T')).toBe(true)
})
it.each(['g', ''])('clears a rejected handful conversion warning when deselecting from %j', async (initialUnit) => {
  starch()
  function Editor() {
    const [unit, setUnit] = useState(initialUnit)
    return <><UnitSelect ingredientId="starch" value={unit} onValueChange={setUnit} language="ko" /><output data-testid="unit">{unit}</output></>
  }
  render(<Editor />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox'))
  await user.click(await screen.findByRole('option', { name: '줌', exact: true }))
  expect(screen.getByRole('alert')).toBeTruthy()
  await user.click(screen.getByRole('combobox'))
  await user.click(await screen.findByRole('option', { name: '선택안함', exact: true }))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByTestId('unit').textContent).toBe('')
  expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBeNull()
})
it('clears an existing unsupported unit when selecting N/A', async () => {
  starch()
  function Editor() {
    const [unit, setUnit] = useState('T')
    return <UnitSelect ingredientId="starch" value={unit} onValueChange={setUnit} language="ko" />
  }
  render(<Editor />)
  expect(screen.getByRole('alert')).toBeTruthy()
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox'))
  await user.click(await screen.findByRole('option', { name: '선택안함', exact: true }))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByRole('combobox').textContent).toContain('선택안함')
})
