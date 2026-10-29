import { Button } from './ui/button'

export function moveIngredient<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function IngredientOrderControls({ index, count, name, onMove, disabled = false, ko = true }: {
  index: number; count: number; name: string; onMove: (direction: -1 | 1) => void; disabled?: boolean; ko?: boolean
}) {
  return <span className="ingredient-order-arrows">
    <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || index === 0} aria-label={ko ? `${name} 위로 이동` : `Move ${name} up`} onClick={() => onMove(-1)}>↑</Button>
    <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || index === count - 1} aria-label={ko ? `${name} 아래로 이동` : `Move ${name} down`} onClick={() => onMove(1)}>↓</Button>
  </span>
}
