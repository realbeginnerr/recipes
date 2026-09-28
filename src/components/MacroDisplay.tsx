import './MacroDisplay.css'
import type { Ingredient } from '../types'
import { useLanguage } from '../context/LanguageContext'

type Macros = Pick<Ingredient, 'carbs' | 'protein' | 'fat'>

export function MacroSummary({ macros: { carbs, protein, fat } }: { macros: Macros }) {
  const { language } = useLanguage()
  return <div className="catalog-macros">
    {[[carbs, language === 'ko' ? '탄수화물' : 'Carbs'], [protein, language === 'ko' ? '단백질' : 'Protein'], [fat, language === 'ko' ? '지방' : 'Fat']].map(([value, label]) => <div key={label}><strong>{Math.round(Number(value))}g</strong><span>{label}</span></div>)}
  </div>
}

export function MacroBars({ macros }: { macros: Macros }) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  return <>{(['carbs', 'protein', 'fat'] as const).map((key, index) => {
    const target = [60, 40, 20][index]
    const max = [80, 40, 30][index]
    const difference = Math.abs(macros[key] - target)
    const color = difference >= 10 ? '#EC4E20' : difference >= 5 ? '#F8C166' : '#4AA660'
    return <div className="ingredient-macro" key={key}><span>{ko ? ['탄', '단', '지'][index] : ['C', 'P', 'F'][index]}</span><div className="ingredient-bar"><i style={{ width: `${Math.min(100, macros[key] / max * 100)}%`, backgroundColor: color }} /><b style={{ left: `${target / max * 100}%` }} /></div><strong style={{ color }}>{Math.round(macros[key])}<span>/{target}g</span></strong></div>
  })}</>
}
