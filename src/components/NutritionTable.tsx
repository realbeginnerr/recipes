import './NutritionTable.css'
import type { ReactNode } from 'react'
import { useLanguage } from '../context/LanguageContext'

type Macros = { carbs: number; protein: number; fat: number }

export function MacroCells({ values }: { values: Macros }) {
  return <>{(['carbs', 'protein', 'fat'] as const).map(key => <td key={key} className={`numeric${values[key] === 0 ? ' muted' : ''}`}>{Math.round(values[key])}</td>)}</>
}

export function NutritionTable({ children, total, showCalories = false, labelledBy }: {
  children: ReactNode
  total: Macros
  showCalories?: boolean
  labelledBy: string
}) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const titles = ko ? ['식재료명', '양', '단위', '탄 (g)', '단 (g)', '지 (g)'] : ['Ingredient', 'Amount', 'Unit', 'Carbs (g)', 'Protein (g)', 'Fat (g)']
  return <div className="detail-table-wrap"><table aria-labelledby={labelledBy}>
    <thead><tr>{titles.map((title, index) => <th scope="col" key={title} className={index === 1 || index > 2 ? 'numeric' : ''}>{title}</th>)}</tr></thead>
    <tbody>{children}</tbody>
    <tfoot>
      <tr className="detail-total"><th scope="row" colSpan={3}>{ko ? '합계' : 'Total'}</th><MacroCells values={total} /></tr>
      {showCalories && <tr className="detail-calories"><th colSpan={5} scope="row">{ko ? '한 끼 총 칼로리' : 'Calories per meal'}</th><td className="numeric">{Math.round(total.carbs * 4 + total.protein * 4 + total.fat * 9)}<span>kcal</span></td></tr>}
    </tfoot>
  </table></div>
}
