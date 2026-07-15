import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const UNIT_NONE = '__none__'

export function UnitSelect({
  value,
  onValueChange,
  language,
  riceOnly = false,
  options,
}: {
  value: string
  onValueChange: (v: string) => void
  language: string
  riceOnly?: boolean
  options?: string[]
}) {
  const displayValue = value === '' ? UNIT_NONE : value
  const handleChange = (v: string | null) => onValueChange(v === UNIT_NONE || v === null ? '' : v)

  if (riceOnly) {
    return (
      <Select value={displayValue} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="g">g</SelectItem>
          <SelectItem value="oz">oz</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (options) {
    return (
      <Select value={displayValue} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="w-[90px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt || UNIT_NONE} value={opt || UNIT_NONE}>
              {opt || (language === 'ko' ? '선택안함' : 'N/A')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const koOptions = ['g', 'ml', 'T', 't', '컵', '개', '캔', '팩', '꼬집', 'oz', 'lbs', UNIT_NONE]
  const enOptions = ['oz', 'lbs', 'tbsp', 'tsp', 'cup', 'each', 'can', 'pack', 'pinch', 'g', 'ml', UNIT_NONE]
  const noneLabel = language === 'ko' ? '선택안함' : 'N/A'

  return (
    <Select value={displayValue} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-[90px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(language === 'ko' ? koOptions : enOptions).map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt === UNIT_NONE ? noneLabel : opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
