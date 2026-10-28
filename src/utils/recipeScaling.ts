import type { RecipeRowState } from '../types'

export function scaleRecipeRows(rows: RecipeRowState[], index: number, nextAmount: number): RecipeRowState[] {
  const previous = rows[index]?.amount
  if (!Number.isFinite(nextAmount) || nextAmount < 0) return rows
  if (!previous || previous < 0) return rows.map((row, i) => i === index ? { ...row, amount: nextAmount } : row)
  const ratio = nextAmount / previous
  const amounts = rows.map((row, i) => i === index ? nextAmount : Math.round(row.amount * ratio * 1e8) / 1e8)
  if (amounts.some(value => !Number.isFinite(value))) return rows
  return rows.map((row, i) => ({ ...row, amount: amounts[i] }))
}
