import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { IngredientOrderControls, moveIngredient } from '../src/components/IngredientOrderControls'

it('moves whole ingredient rows and disables movement past either end', () => {
  function Editor() {
    const [rows, setRows] = useState([{ name: 'Rice', amount: 100 }, { name: 'Egg', amount: 50 }])
    return <>{rows.map((row, index) => <div key={row.name} data-testid="row">{row.name}:{row.amount}<IngredientOrderControls index={index} count={rows.length} name={row.name} ko={false} onMove={direction => setRows(current => moveIngredient(current, index, direction))} /></div>)}</>
  }
  render(<Editor />)
  expect((screen.getByRole('button', { name: 'Move Rice up' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Move Rice down' }))
  expect(screen.getAllByTestId('row')[0].textContent).toContain('Egg:50')
  expect(screen.getAllByTestId('row')[1].textContent).toContain('Rice:100')
  expect((screen.getByRole('button', { name: 'Move Rice down' }) as HTMLButtonElement).disabled).toBe(true)
})
