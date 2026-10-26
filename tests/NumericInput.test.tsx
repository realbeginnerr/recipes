import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Input } from '../src/components/ui/input'

// These represent the number handlers used by the ingredient tables, recipe
// amounts, count selectors and photo tag coordinates. The shared Input must
// preserve editing text even when a parent normalizes or rejects that text.
const handlers = {
  zero: (raw: string, _previous: number) => Number(raw),
  fallback: (raw: string, _previous: number) => Number.parseFloat(raw) || 0,
  ignoreEmpty: (raw: string, previous: number) => raw === '' ? previous : Number(raw),
  bounded: (raw: string, previous: number) => raw !== '' && Number(raw) <= 100 ? Number(raw) : previous,
  integer: (raw: string, _previous: number) => Math.max(0, Math.floor(Number(raw))),
  rounded: (raw: string, _previous: number) => Math.round(Number(raw) * 10) / 10,
  fixed: (raw: string, _previous: number) => Number.parseFloat(raw) || 0,
}

it.each(Object.keys(handlers) as (keyof typeof handlers)[])('allows clearing and replacing numbers with a %s parent', async mode => {
  const user = userEvent.setup()
  function Example() {
    const [value, setValue] = useState(20)
    return <><Input aria-label="amount" type="number" value={mode === 'fixed' ? value.toFixed(1) : value}
      onChange={event => setValue(previous => handlers[mode](event.target.value, previous))} />
      <output data-testid="committed">{value}</output><button>Done</button></>
  }
  render(<Example />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  await user.clear(input)
  expect(input.value).toBe('')
  await user.type(input, '35')
  expect(input.value).toBe('35')
  expect(screen.getByTestId('committed').textContent).toBe('35')
  await user.click(screen.getByRole('button'))
  expect(input.value).toBe('35')
})

it('preserves decimal input while forwarding changes and blur', async () => {
  const user = userEvent.setup()
  const onBlur = vi.fn()
  function Example() {
    const [value, setValue] = useState(20)
    return <><Input type="number" value={value} onChange={event => setValue(Number(event.target.value))} onBlur={onBlur} /><button>Done</button></>
  }
  render(<Example />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  await user.clear(input)
  await user.type(input, '12.56')
  expect(input.value).toBe('12.56')
  await user.click(screen.getByRole('button'))
  expect(input.value).toBe('12.6')
  expect(onBlur).toHaveBeenCalledOnce()
})

it('uses the committed value after blur and reflects subsequent external updates', async () => {
  const user = userEvent.setup()
  const { rerender } = render(<Input type="number" value={50} onChange={() => {}} />)
  const input = screen.getByRole('spinbutton') as HTMLInputElement
  await user.clear(input)
  expect(input.value).toBe('')
  fireEvent.blur(input)
  expect(input.value).toBe('50')
  rerender(<Input type="number" value={75} onChange={() => {}} />)
  expect(input.value).toBe('75')
})

it('does not interfere with string-backed, uncontrolled or read-only fields', async () => {
  const user = userEvent.setup()
  function Example() {
    const [value, setValue] = useState('20')
    return <><Input aria-label="string" type="number" value={value} onChange={event => setValue(event.target.value)} />
      <Input aria-label="uncontrolled" type="number" defaultValue="20" />
      <Input aria-label="readonly" type="number" value={20} readOnly /></>
  }
  render(<Example />)
  for (const label of ['string', 'uncontrolled']) {
    const input = screen.getByLabelText(label) as HTMLInputElement
    await user.clear(input)
    expect(input.value).toBe('')
    await user.type(input, '7.5')
    expect(input.value).toBe('7.5')
  }
  expect((screen.getByLabelText('readonly') as HTMLInputElement).value).toBe('20')
})
