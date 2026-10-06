import type { FirestoreIngredient } from '../services/ingredientService'
import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table'
import { formatTableNumber } from '../utils/numberFormatting'

function baseGrams(ingredient: FirestoreIngredient): number | undefined {
  const units: Record<string, number | undefined> = {
    g: 1, oz: 28.3495, lbs: 453.592,
    T: ingredient.gramsPerTbsp, tbsp: ingredient.gramsPerTbsp,
    t: ingredient.gramsPerTsp, tsp: ingredient.gramsPerTsp,
    cup: ingredient.gramsPerCup, '컵': ingredient.gramsPerCup,
    each: ingredient.gramsPerEach, '개': ingredient.gramsPerEach,
    can: ingredient.gramsPerCan, '캔': ingredient.gramsPerCan,
    pack: ingredient.gramsPerPack, '팩': ingredient.gramsPerPack,
  }
  const grams = units[ingredient.baseUnit]
  return grams && ingredient.baseAmount > 0 ? ingredient.baseAmount * grams : undefined
}

function format(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) ? formatTableNumber(Number(value.toFixed(3))) : 'N/A'
}

export function IngredientCsvTable({ ingredients }: { ingredients: FirestoreIngredient[] }) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const [sort, setSort] = useState({ column: 0, ascending: true })
  const rows = ingredients.map(ingredient => {
    const grams = baseGrams(ingredient)
    const quantity = (perUnit?: number) => grams !== undefined && perUnit && perUnit > 0 ? grams / perUnit : undefined
    return {
      ingredient,
      name: ko ? ingredient.nameKo || ingredient.name : ingredient.name,
      values: [grams, quantity(ingredient.gramsPerTbsp), quantity(ingredient.gramsPerTsp), quantity(ingredient.gramsPerCup), quantity(ingredient.gramsPerEach), quantity(ingredient.gramsPerCan ?? ingredient.gramsPerPack), ingredient.carbs, ingredient.protein, ingredient.fat],
    }
  }).sort((a, b) => {
    let comparison: number
    if (sort.column === 0) comparison = a.name.localeCompare(b.name, language, { numeric: true })
    else {
      const left = a.values[sort.column - 1]
      const right = b.values[sort.column - 1]
      const leftMissing = left === undefined || !Number.isFinite(left)
      const rightMissing = right === undefined || !Number.isFinite(right)
      if (leftMissing || rightMissing) return Number(leftMissing) - Number(rightMissing)
      comparison = left! - right!
    }
    return (sort.ascending ? comparison : -comparison) || a.name.localeCompare(b.name, language)
  })
  const headings = ko
    ? ['재료명', 'g', 'T', 't', 'cup', '개, 장', '병, 캔, 팩', '탄수화물(g)', '단백질(g)', '지방(g)']
    : ['Ingredient', 'g', 'T', 't', 'cup', 'Pieces, sheets', 'Bottles, cans, packs', 'Carbs (g)', 'Protein (g)', 'Fat (g)']
  return <div className="table-container table-container--sticky-header ingredient-csv-table">
    <Table className="data-table" style={{ minWidth: headings.length * 120 }}>
      <TableHeader><TableRow>{headings.map((heading, column) => {
        const active = sort.column === column
        const Icon = active ? (sort.ascending ? ArrowUp : ArrowDown) : ArrowUpDown
        const ascending = active ? !sort.ascending : true
        return <TableHead key={heading} scope="col" aria-sort={active ? (sort.ascending ? 'ascending' : 'descending') : 'none'}>
          <button type="button" className="inline-flex cursor-pointer items-center gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label={`${heading} ${ko ? (ascending ? '오름차순 정렬' : '내림차순 정렬') : (ascending ? 'sort ascending' : 'sort descending')}`}
            onClick={() => setSort({ column, ascending })}>
            {heading}<Icon className={`size-3 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/50'}`} aria-hidden="true" />
          </button>
        </TableHead>
      })}</TableRow></TableHeader>
      <TableBody>{rows.map(({ ingredient, name, values }) => {
        return <TableRow key={ingredient.id}>
          <TableCell>{name}</TableCell>
          {values.map((value, index) => {
            const display = format(value)
            return <TableCell key={index}>{display === 'N/A' ? <span className="text-[#CDD2CF]">{display}</span> : display}</TableCell>
          })}
        </TableRow>
      })}</TableBody>
    </Table>
  </div>
}
