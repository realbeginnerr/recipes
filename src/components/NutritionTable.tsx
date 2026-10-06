import './NutritionTable.css'
import './ui/table.css'
import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from 'react'
import { useIngredientColumnWidth } from './useIngredientColumnWidth'
import { useLanguage } from '../context/LanguageContext'
import { formatTableNumber } from '../utils/numberFormatting'

type Macros = { carbs: number; protein: number; fat: number }

function wrapIngredientCells(nodes: ReactNode): ReactNode {
  return Children.map(nodes, node => {
    if (!isValidElement(node)) return node
    const element = node as ReactElement<{ children?: ReactNode; colSpan?: number }>
    if (element.type === 'tr') {
      let first = true
      return cloneElement(element, {}, Children.map(element.props.children, child => {
        if (!isValidElement(child)) return child
        const cell = child as ReactElement<{ children?: ReactNode; colSpan?: number }>
        if (first && cell.type === 'td' && !cell.props.colSpan) {
          first = false
          return cloneElement(cell, {}, <div className="table-cell-content">{cell.props.children}</div>)
        }
        first = false
        return child
      }))
    }
    return element.props.children ? cloneElement(element, {}, wrapIngredientCells(element.props.children)) : element
  })
}

export function MacroCells({ values }: { values: Macros }) {
  return <>{(['carbs', 'protein', 'fat'] as const).map(key => <td key={key} className={`numeric${values[key] === 0 ? ' muted' : ''}`}>{formatTableNumber(Math.round(values[key]), 0, 0)}</td>)}</>
}

export function NutritionTable({ children, total, showCalories = false, labelledBy }: {
  children: ReactNode
  total: Macros
  showCalories?: boolean
  labelledBy: string
}) {
  const { language } = useLanguage()
  const tableRef = useIngredientColumnWidth()
  const ko = language === 'ko'
  const titles = ko ? ['식재료명', '양', '단위', '탄 (g)', '단 (g)', '지 (g)'] : ['Ingredient', 'Amount', 'Unit', 'Carbs (g)', 'Protein (g)', 'Fat (g)']
  return <div className="detail-table-wrap site-table-frame"><table className="site-table" ref={tableRef} data-ingredient-default-ratio="0.3" aria-labelledby={labelledBy}>
    <thead><tr>{titles.map((title, index) => <th scope="col" key={title} className={index === 1 || index > 2 ? 'numeric' : ''}>{title}</th>)}</tr></thead>
    <tbody>{wrapIngredientCells(children)}</tbody>
    <tfoot>
      <tr className="detail-total table-row--total"><th scope="row" colSpan={3}>{ko ? '합계' : 'Total'}</th><MacroCells values={total} /></tr>
      {showCalories && <tr className="detail-calories"><th colSpan={5} scope="row">{ko ? '한 끼 총 칼로리' : 'Calories per meal'}</th><td className="numeric">{formatTableNumber(Math.round(total.carbs * 4 + total.protein * 4 + total.fat * 9), 0, 0)}<span>kcal</span></td></tr>}
    </tfoot>
  </table></div>
}
