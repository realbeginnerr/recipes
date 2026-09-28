import './IngredientCard.css'
import { useState } from 'react'
import type { Ingredient, Recipe } from '../types'
import { useLanguage } from '../context/LanguageContext'
import { amountToGrams, calculateMacros, convertUnit } from '../utils/nutrition'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { UnitSelect } from './UnitSelect'
import { FoodImage } from './FoodImage'
import { MacroSummary } from './MacroDisplay'
import { RelatedRecipes } from './RelatedRecipes'

export function IngredientCard({ ingredient, image, category, related }: { ingredient: Ingredient; image?: string; category: string; related: Recipe[] }) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const name = ko ? ingredient.nameKo ?? ingredient.name : ingredient.name
  const validConversion = (unit: string) => Number.isFinite(ingredient.conversions[unit]) && ingredient.conversions[unit] > 0
  const canConvert = validConversion(ingredient.baseUnit)
  const defaultUnit = canConvert && validConversion('g') ? 'g' : ingredient.baseUnit
  const defaultAmount = defaultUnit === 'g' ? 100 : ingredient.baseAmount
  const [quantity, setQuantity] = useState(String(defaultAmount))
  const [unit, setUnit] = useState(defaultUnit)
  const parsed = Number(quantity)
  const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
  const units = [...new Set([defaultUnit, ingredient.baseUnit, ...ingredient.allowedUnits])].filter(value => value === defaultUnit || (canConvert && validConversion(value)))
  const factor = ingredient.baseAmount > 0 ? amount / ingredient.baseAmount : 0
  const macros = canConvert ? calculateMacros(amountToGrams(amount, unit, ingredient.conversions), ingredient) : {
    carbs: ingredient.carbs * factor, protein: ingredient.protein * factor, fat: ingredient.fat * factor,
  }
  const changed = quantity === '' || amount !== defaultAmount || unit !== defaultUnit

  function changeUnit(next: string) {
    const converted = convertUnit(amount, unit, next, ingredient.conversions)
    if (!Number.isFinite(converted)) return
    setQuantity(String(Math.round(converted * 10000) / 10000))
    setUnit(next)
  }

  return <article className="ingredient-card">
    <div className="ingredient-photo"><FoodImage src={image} alt={name} /></div>
    <div className="ingredient-card-body"><div className="catalog-card-categories"><span className="catalog-category">{category}</span></div><div className="ingredient-card-heading"><h2>{name}</h2><span>{Math.round(macros.carbs * 4 + macros.protein * 4 + macros.fat * 9)} kcal</span></div>
      <div className="ingredient-basis">
        <Input density="quantity" type="number" min="0" step="any" aria-label={`${name} ${ko ? '용량' : 'amount'}`} value={quantity} onChange={event => {
          const value = event.target.value
          setQuantity(value === '' ? '' : String(Math.max(0, Number(value) || 0)))
        }} />
        {units.length > 1 ? <UnitSelect size="quantity" language={language} value={unit} options={units} onValueChange={changeUnit} aria-label={`${name} ${ko ? '단위' : 'unit'}`} /> : <span>{unit}</span>}
        <span>{ko ? '기준' : 'serving'}</span>
        {changed && <Button type="button" variant="ghost" size="content" aria-label={`${name} ${ko ? '용량 초기화' : 'reset amount'}`} onClick={() => { setQuantity(String(defaultAmount)); setUnit(defaultUnit) }}>{ko ? '초기화' : 'Reset'}</Button>}
      </div>
      <MacroSummary macros={macros} />
      <RelatedRecipes recipes={related} ingredientId={ingredient.id} />
    </div>
  </article>
}
