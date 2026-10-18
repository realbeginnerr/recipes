import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { formatTableNumber } from '../src/utils/numberFormatting'
import { Input } from '../src/components/ui/input'

describe('number display precision', () => {
  it('shows at most one decimal, preserves integers and grouping', () => {
    expect(formatTableNumber(1234.567)).toBe('1,234.6')
    expect(formatTableNumber(3)).toBe('3')
    expect(formatTableNumber(0.25)).toBe('0.3')
    expect(formatTableNumber(-2.36)).toBe('-2.4')
    expect(formatTableNumber(1.234, 4, 2)).toBe('1.2')
  })

  it('rounds numeric input display without changing its stored value', () => {
    const onChange = vi.fn()
    render(<Input type="number" aria-label="Amount" value={1.2345} onChange={onChange} />)
    const input = screen.getByLabelText('Amount') as HTMLInputElement
    expect(input.value).toBe('1.2')
    fireEvent.focus(input)
    expect(input.value).toBe('1.2345')
    fireEvent.blur(input)
    expect(input.value).toBe('1.2')
    expect(onChange).not.toHaveBeenCalled()
  })
})
