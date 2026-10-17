import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const UNIT_NONE = '__none__'
const unitPairs = [['g', 'g'], ['ml', 'ml'], ['T', 'tbsp'], ['t', 'tsp'], ['컵', 'cup'], ['개', 'each'], ['캔', 'can'], ['팩', 'pack'], ['꼬집', 'pinch'], ['줌', 'handful'], ['oz', 'oz'], ['lbs', 'lbs'], ['', '']]

type UnitSelectProps = {
  value: string
  onValueChange: (value: string) => void
  language: string
  riceOnly?: boolean
  options?: string[]
  className?: string
  size?: 'sm' | 'default' | 'compact' | 'quantity'
  'aria-label'?: string
  disabled?: boolean
}

export function UnitSelect({ value, onValueChange, language, riceOnly = false, options, className, size = 'sm', 'aria-label': ariaLabel, disabled }: UnitSelectProps) {
  const noneLabel = language === 'ko' ? '선택안함' : 'N/A'
  const index = language === 'ko' ? 0 : 1
  const available = riceOnly ? ['g', 'oz'] : options
  const selected = unitPairs.find(pair => pair.includes(value))?.[index] ?? value
  const items = unitPairs.map(pair => ({ value: pair[index] || UNIT_NONE, label: pair[index] || noneLabel, disabled: available !== undefined && !pair.some(unit => available.includes(unit)) && !pair.includes(value) }))
  // Preserve existing custom units without changing the shared menu.
  const selectItems = selected && !items.some(item => item.value === selected) ? [...items, { value: selected, label: selected, disabled: false }] : items
  return <Select value={selected || UNIT_NONE} items={selectItems} disabled={disabled} onValueChange={unit => onValueChange(unit === UNIT_NONE || unit === null ? '' : unit)}>
    <SelectTrigger size={size} className={cn(riceOnly ? 'w-[72px]' : 'w-[90px]', className)} aria-label={ariaLabel ?? (language === 'ko' ? '단위' : 'Unit')}><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value} disabled={item.disabled}>{item.label}</SelectItem>)}</SelectContent>
  </Select>
}
