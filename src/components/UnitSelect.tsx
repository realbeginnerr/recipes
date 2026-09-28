import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const UNIT_NONE = '__none__'
const koOptions = ['g', 'ml', 'T', 't', '컵', '개', '캔', '팩', '꼬집', 'oz', 'lbs', UNIT_NONE]
const enOptions = ['oz', 'lbs', 'tbsp', 'tsp', 'cup', 'each', 'can', 'pack', 'pinch', 'g', 'ml', UNIT_NONE]

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
  const units = riceOnly ? ['g', 'oz'] : options ?? (language === 'ko' ? koOptions : enOptions)
  const items = [...new Set(units.map(unit => unit || UNIT_NONE))].map(unit => ({ value: unit, label: unit === UNIT_NONE ? noneLabel : unit }))
  return <Select value={value || UNIT_NONE} items={items} disabled={disabled} onValueChange={unit => onValueChange(unit === UNIT_NONE || unit === null ? '' : unit)}>
    <SelectTrigger size={size} className={cn(riceOnly ? 'w-[72px]' : 'w-[90px]', className)} aria-label={ariaLabel ?? (language === 'ko' ? '단위' : 'Unit')}><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select>
}
