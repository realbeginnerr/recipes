import { Input } from './ui/input'
import { UnitSelect } from './UnitSelect'
import { useLanguage } from '../context/LanguageContext'

export function QuantityUnitCells({ amount, unit, units, label, amountLabel, onAmountChange, onUnitChange }: {
  amount: number
  unit: string
  units: string[]
  label: string
  amountLabel?: string
  onAmountChange: (value: string) => void
  onUnitChange: (value: string) => void
}) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  return <>
    <td className="numeric"><Input density="quantity" type="number" min="0" step="1" aria-label={amountLabel ?? `${label} ${ko ? '양' : 'amount'}`} value={Math.round(amount)} onChange={event => onAmountChange(event.target.value)} /></td>
    <td><UnitSelect aria-label={`${label} ${ko ? '단위' : 'unit'}`} language={language} size="quantity" value={unit} options={[...new Set([unit, ...units])]} onValueChange={onUnitChange} /></td>
  </>
}
