import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
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

it('converts legacy notes and preserves existing multiline steps until edited', () => {
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

function EditableSteps({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState([{ id: 'first', text: '준비' }, { id: 'last', text: '완성' }])
  return <><CookingStepsEditor steps={value} onChange={setValue} disabled={disabled} ko />
    <output data-testid="step-state">{JSON.stringify(value)}</output></>
}

it('splits pasted CRLF lines into fields without losing subsequent steps or the original identity', () => {
  render(<EditableSteps />)
  fireEvent.change(screen.getByLabelText('1단계'), { target: { value: '씻기\r\n썰기\r\n볶기' } })
  expect(screen.getAllByRole('textbox').map(field => (field as HTMLTextAreaElement).value)).toEqual(['씻기', '썰기', '볶기', '완성'])
  const value = JSON.parse(screen.getByTestId('step-state').textContent!)
  expect(value[0].id).toBe('first')
  expect(value[3].id).toBe('last')
  expect(new Set(value.map((step: { id: string }) => step.id)).size).toBe(4)
})

it('creates an empty next field on Enter and moves the caret to it', async () => {
  render(<EditableSteps />)
  fireEvent.change(screen.getByLabelText('1단계'), { target: { value: '준비\n', selectionStart: 3 } })
  await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('2단계')))
  expect((screen.getByLabelText('2단계') as HTMLTextAreaElement).value).toBe('')
  expect((screen.getByLabelText('3단계') as HTMLTextAreaElement).value).toBe('완성')
})

it('drags steps in either direction while keeping their IDs and text', () => {
  render(<EditableSteps />)
  const elementFromPoint = vi.spyOn(document, 'elementFromPoint')
  const handle = screen.getByRole('button', { name: '1단계 순서 변경' })
  handle.setPointerCapture = vi.fn()
  elementFromPoint.mockReturnValue(screen.getByLabelText('2단계'))
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1 })
  fireEvent.pointerMove(handle, { clientX: 10, clientY: 100 })
  fireEvent.pointerUp(handle, { clientX: 10, clientY: 100 })
  expect(JSON.parse(screen.getByTestId('step-state').textContent!).map((step: { id: string }) => step.id)).toEqual(['last', 'first'])
  elementFromPoint.mockReturnValue(screen.getByLabelText('1단계'))
  fireEvent.pointerDown(handle, { button: 0, pointerId: 2 })
  fireEvent.pointerUp(handle, { clientX: 10, clientY: 10 })
  expect(screen.getAllByRole('textbox').map(field => (field as HTMLTextAreaElement).value)).toEqual(['준비', '완성'])
  elementFromPoint.mockRestore()
})

it('supports keyboard reordering and ignores movement past the first/last position', () => {
  render(<EditableSteps />)
  const handle = screen.getByRole('button', { name: '1단계 순서 변경' })
  fireEvent.keyDown(handle, { key: 'ArrowUp' })
  expect((screen.getByLabelText('1단계') as HTMLTextAreaElement).value).toBe('준비')
  fireEvent.keyDown(handle, { key: 'ArrowDown' })
  expect((screen.getByLabelText('2단계') as HTMLTextAreaElement).value).toBe('준비')
  fireEvent.keyDown(handle, { key: 'ArrowDown' })
  expect((screen.getByLabelText('2단계') as HTMLTextAreaElement).value).toBe('준비')
})

it('does not reorder disabled steps or apply a cancelled drag', () => {
  const view = render(<EditableSteps disabled />)
  fireEvent.keyDown(screen.getByRole('button', { name: '1단계 순서 변경' }), { key: 'ArrowDown' })
  expect((screen.getByLabelText('1단계') as HTMLTextAreaElement).value).toBe('준비')
  view.rerender(<EditableSteps />)
  const handle = screen.getByRole('button', { name: '1단계 순서 변경' })
  handle.setPointerCapture = vi.fn()
  const elementFromPoint = vi.spyOn(document, 'elementFromPoint').mockReturnValue(screen.getByLabelText('2단계'))
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1 })
  fireEvent.pointerCancel(handle)
  fireEvent.pointerUp(handle)
  expect((screen.getByLabelText('1단계') as HTMLTextAreaElement).value).toBe('준비')
  elementFromPoint.mockRestore()
})
