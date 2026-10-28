import { describe, expect, it } from 'vitest'
import { scaleRecipeRows } from '../src/utils/recipeScaling'

const rows = [
  { ingredientId: 'egg', amount: 1, unit: '개' },
  { ingredientId: 'flour', amount: 150, unit: 'g' },
  { ingredientId: 'tea', amount: 0.3, unit: 'T' },
]

describe('recipe proportional quantities', () => {
  it('scales every ingredient up and down without changing units or originals', () => {
    const doubled = scaleRecipeRows(rows, 0, 2)
    expect(doubled.map(row => row.amount)).toEqual([2, 300, 0.6])
    expect(scaleRecipeRows(doubled, 1, 75).map(row => row.amount)).toEqual([0.5, 75, 0.15])
    expect(rows[0].amount).toBe(1)
    expect(doubled.map(row => row.unit)).toEqual(['개', 'g', 'T'])
  })
  it('uses the focus baseline so clearing and retyping does not lose proportions', () => {
    expect(scaleRecipeRows(rows, 0, 0).map(row => row.amount)).toEqual([0, 0, 0])
    expect(scaleRecipeRows(rows, 0, 12).map(row => row.amount)).toEqual([12, 1800, 3.6])
  })
  it('adjusts a zero amount individually and rejects invalid or overflowing changes', () => {
    const zeroRows = [{ ...rows[0], amount: 0 }, rows[1]]
    expect(scaleRecipeRows(zeroRows, 0, 2).map(row => row.amount)).toEqual([2, 150])
    expect(scaleRecipeRows(rows, 0, Infinity)).toBe(rows)
    expect(scaleRecipeRows(rows, 0, -1)).toBe(rows)
    expect(scaleRecipeRows(rows, 0, Number.MAX_VALUE)).toBe(rows)
  })
})
