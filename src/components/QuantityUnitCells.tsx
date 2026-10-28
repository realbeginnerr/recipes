import { Input } from './ui/input'
import { UnitSelect } from './UnitSelect'
import { useLanguage } from '../context/LanguageContext'

export function QuantityUnitCells({ ingredientId, amount, unit, units, label, amountLabel, onAmountChange, onUnitChange, onAmountFocus, onAmountBlur }: {
  ingredientId?: string
  amount: number
  unit: string
  units: string[]
  label: string
  amountLabel?: string
  onAmountChange: (value: string) => void
  onUnitChange: (value: string) => void
  onAmountFocus?: () => void
  onAmountBlur?: () => void
}) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  return <>
    <td className="numeric"><Input density="quantity" type="number" min="0" step="0.1" aria-label={amountLabel ?? `${label} ${ko ? '양' : 'amount'}`} value={amount} onFocus={onAmountFocus} onBlur={onAmountBlur} onChange={event => onAmountChange(event.target.value)} /></td>
    <td><UnitSelect ingredientId={ingredientId} aria-label={`${label} ${ko ? '단위' : 'unit'}`} language={language} size="quantity" value={unit} options={[...new Set([unit, ...units])]} onValueChange={onUnitChange} /></td>
  </>
}
