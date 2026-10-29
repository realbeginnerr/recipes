import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { hasNutritionConversion, recipeIngredient } from '../utils/recipeUnitValidation'
import { INGREDIENT_UNITS } from '../constants/ingredientUnits'

const UNIT_NONE = '__none__'
const unitPairs: string[][] = INGREDIENT_UNITS.map(unit => [unit.ko, unit.en])

type UnitSelectProps = {
  ingredientId?: string
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

export function UnitSelect({ ingredientId, value, onValueChange, language, riceOnly = false, options, className, size = 'sm', 'aria-label': ariaLabel, disabled }: UnitSelectProps) {
  const [rejectedUnit, setRejectedUnit] = useState<string | null>(null)
  const ingredient = ingredientId ? recipeIngredient(ingredientId) : undefined
  const invalid = value !== '' && ingredientId !== undefined && !hasNutritionConversion(ingredient, value)
  const warning = rejectedUnit || (invalid ? value : null)
  const noneLabel = language === 'ko' ? '선택안함' : 'N/A'
  const index = language === 'ko' ? 0 : 1
  const available = riceOnly ? ['g', 'oz'] : options
  const selected = unitPairs.find(pair => pair.includes(value))?.[index] ?? value
  const items = unitPairs.map(pair => ({ value: pair[index] || UNIT_NONE, label: pair[index] || noneLabel, disabled: available !== undefined && !pair.some(unit => available.includes(unit)) && !pair.includes(value) }))
  // Preserve existing custom units without changing the shared menu.
  const selectItems = selected && !items.some(item => item.value === selected) ? [...items, { value: selected, label: selected, disabled: false }] : items
  return <><Select value={selected || UNIT_NONE} items={selectItems} disabled={disabled} onValueChange={unit => {
    const next = unit === UNIT_NONE || unit === null ? '' : unit
    if (next !== '' && ingredientId !== undefined && !hasNutritionConversion(ingredient, next)) { setRejectedUnit(next); return }
    setRejectedUnit(null)
    onValueChange(next)
  }}>
    <SelectTrigger size={size} className={cn(riceOnly ? 'w-[72px]' : 'w-[90px]', className)} aria-invalid={invalid || undefined} aria-label={ariaLabel ?? (language === 'ko' ? '단위' : 'Unit')}><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value} disabled={item.disabled}>{item.label}</SelectItem>)}</SelectContent>
  </Select>{warning !== null && <p role="alert" className="mt-1 text-sm text-destructive">{language === 'ko' ? `${warning || '선택한 단위'}의 환산 정보가 없어 영양을 계산할 수 없습니다. 식재료 수정에서 환산값을 등록하거나 다른 단위를 선택해 주세요.` : `No conversion for ${warning || 'this unit'}. Add a conversion in the ingredient editor or choose another unit.`}</p>}</>
}
