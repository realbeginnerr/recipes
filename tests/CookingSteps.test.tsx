import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { CookingSteps, CookingStepsEditor } from '../src/components/CookingSteps'
import { recipeCookingSteps } from '../src/utils/cookingSteps'
import { useState } from 'react'

const steps = [{ id: 'a', text: 'Mix ingredients\nGently' }, { id: 'b', text: 'Bake' }, { id: 'c', text: 'Cool' }]
beforeEach(() => localStorage.clear())

it('preserves arbitrary checks on remount, highlights first incomplete, and resets independently', () => {
  const view = render(<CookingSteps recipeId="scone" steps={steps} ko={false} />)
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  expect(screen.getAllByRole('checkbox')[0].closest('li')?.classList.contains('is-next')).toBe(true)
  fireEvent.click(screen.getAllByRole('checkbox')[0])
  expect(screen.getAllByRole('checkbox')[2].closest('li')?.classList.contains('is-next')).toBe(true)
  view.unmount()
  render(<CookingSteps recipeId="scone" steps={steps} ko={false} />)
  expect((screen.getAllByRole('checkbox')[1] as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Reset checks' }))
  expect(screen.getAllByRole('checkbox').every(box => !(box as HTMLInputElement).checked)).toBe(true)
})

it('isolates recipes and clears completion when step content changes', () => {
  render(<CookingSteps recipeId="scone" steps={steps} ko={false} />)
  fireEvent.click(screen.getAllByRole('checkbox')[0])
  cleanup()
  render(<CookingSteps recipeId="other" steps={steps} ko={false} />)
  expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(false)
  cleanup()
  render(<CookingSteps recipeId="scone" steps={[{ ...steps[0], text: 'New instructions' }]} ko={false} />)
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
})

it('converts legacy notes and lets each new step contain multiple lines', () => {
  expect(recipeCookingSteps({ cookingContent: 'Mix\n\nBake' }).map(step => step.text)).toEqual(['Mix', 'Bake'])
  function Editor() {
    const [value, setValue] = useState(steps)
    return <CookingStepsEditor steps={value} onChange={setValue} disabled={false} ko={false} />
  }
  render(<Editor />)
  expect((screen.getByLabelText('Step 1') as HTMLTextAreaElement).value).toBe('Mix ingredients\nGently')
  fireEvent.click(screen.getByRole('button', { name: 'Add step' }))
  expect(screen.getAllByRole('textbox')).toHaveLength(4)
  fireEvent.click(screen.getAllByRole('button', { name: 'Delete step' })[0])
  expect((screen.getByLabelText('Step 1') as HTMLTextAreaElement).value).toBe('Bake')
})
