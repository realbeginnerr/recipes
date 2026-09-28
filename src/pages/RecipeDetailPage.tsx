import { NutritionTable, MacroCells } from '../components/NutritionTable'
import { NutritionSummary } from '../components/NutritionSummary'
import { QuantityUnitCells } from '../components/QuantityUnitCells'
import { ContentState, LoadingState } from '../components/ContentState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { ingredientById } from '../data/ingredients'
import { recipes as staticRecipes } from '../data/recipe'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import { loadRecipesFromFirestore, convertToRecipe } from '../services/recipeService'
import { amountToGrams, calculateMacros, convertUnit } from '../utils/nutrition'
import { categoryEnglish, getRecipeCategories } from '../utils/recipeCategory'
import type { Ingredient, Recipe, RecipeRowState } from '../types'
import './RecipeDetailPage.css'

type Macros = { carbs: number; protein: number; fat: number }
const zero = (): Macros => ({ carbs: 0, protein: 0, fat: 0 })
function ingredientFor(id: string) { return ingredientById.get(id === '__multigrain_rice__' ? 'multigrain-rice' : id) }
function macrosFor(row: RecipeRowState): Macros {
  const ingredient = ingredientFor(row.ingredientId)
  return ingredient ? calculateMacros(amountToGrams(row.amount, row.unit, ingredient.conversions), ingredient) : zero()
}
function sum(rows: Macros[]) { return rows.reduce((total, row) => ({ carbs: total.carbs + row.carbs, protein: total.protein + row.protein, fat: total.fat + row.fat }), zero()) }
function initialRows(recipe: Recipe) { return recipe.items.map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: item.defaultUnit })) }
function amount(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0 }

function TableNutritionSummary({ total }: { total: Macros }) {
  return <div className="detail-nutrition-summary">
    <NutritionSummary {...total} />
  </div>
}

function RecipeNutrition({ recipe }: { recipe: Recipe }) {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const ko = language === 'ko'
  const name = ko ? recipe.nameKo : recipe.name
  const [rows, setRows] = useState<RecipeRowState[]>(() => initialRows(recipe))
  const [divisions, setDivisions] = useState(Math.max(1, recipe.divisionCount ?? 4))
  const [sides, setSides] = useState<RecipeRowState[]>(() => recipe.sideItems?.length ? recipe.sideItems.map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: item.defaultUnit })) : [{ ingredientId: 'multigrain-rice', amount: 150, unit: 'g' }])
  const [memo] = useState(() => { try { return localStorage.getItem(`recipe-note:${recipe.id}`) ?? recipe.memo ?? '' } catch { return recipe.memo ?? '' } })
  const macros = rows.map(macrosFor)
  const total = sum(macros)
  const portion = { carbs: total.carbs / divisions, protein: total.protein / divisions, fat: total.fat / divisions }
  const meal = sum([portion, ...sides.map(macrosFor)])
  const staples = [...ingredientById.values()].filter(ingredient => /밥|통밀빵|고구마|오트밀|rice|whole wheat bread|oatmeal/i.test(`${ingredient.nameKo} ${ingredient.name}`) && !/flour|crumb|cake/i.test(ingredient.name))
  const label = (ingredient: Ingredient | undefined, fallback: string) => ingredient ? (ko ? ingredient.nameKo ?? ingredient.name : ingredient.name) : fallback
  function updateRow(index: number, field: 'amount' | 'unit', value: string, side = false) {
    const update = side ? setSides : setRows
    update(current => current.map((row, i) => {
      if (i !== index) return row
      if (field === 'amount') return { ...row, amount: amount(value) }
      const ingredient = ingredientFor(row.ingredientId)
      const converted = ingredient ? convertUnit(row.amount, row.unit, value, ingredient.conversions) : row.amount
      return { ...row, unit: value, amount: Number.isFinite(converted) ? Math.round(converted * 10000) / 10000 : row.amount }
    }))
  }
  function quantityCells(row: RecipeRowState, index: number, side = false) {
    const ingredient = ingredientFor(row.ingredientId)
    return <QuantityUnitCells amount={row.amount} unit={row.unit} units={ingredient?.allowedUnits ?? []} label={label(ingredient, row.ingredientId)} amountLabel={side ? (ko ? '주식 양' : 'Staple amount') : undefined} onAmountChange={value => updateRow(index, 'amount', value, side)} onUnitChange={value => updateRow(index, 'unit', value, side)} />
  }

  return <article className="nutrition-detail reference-container" lang={language}>
    <Link className="detail-back" to="/recipes">{ko ? '← 레시피 목록' : '← All recipes'}</Link>
    <header className="detail-heading">
      <div>
        <div className="catalog-card-categories" role="group" aria-label={ko ? '레시피 분류' : 'Recipe categories'}>
          {getRecipeCategories(recipe).map(category => <span key={category} className="catalog-category">{ko ? category : categoryEnglish[category]}</span>)}
        </div>
        <h1>{name}</h1>
      </div>
      {recipe.link ? <a className="detail-source" href={recipe.link} target="_blank" rel="noopener noreferrer">↗ {ko ? (/instagram/.test(recipe.link) ? '인스타그램 원본 레시피' : /youtu/.test(recipe.link) ? '유튜브 원본 레시피' : '원본 레시피') : 'Original recipe'}</a> : <span className="detail-source detail-source-empty">↗ {ko ? '원본 레시피 링크' : 'Original recipe link'}</span>}
      {isAdmin && <Link to={`/recipe/${recipe.id}/edit`} className="detail-manage">{ko ? '레시피 수정' : 'Edit recipe'}</Link>}
    </header>
    <div className="detail-tables">
    <section className="detail-section" aria-labelledby="whole-recipe-title"><div className="detail-section-heading"><h2 id="whole-recipe-title">{ko ? '전체 재료' : 'All ingredients'}</h2></div>
      <NutritionTable total={total} labelledBy="whole-recipe-title">{rows.map((row, index) => <tr key={`${row.ingredientId}-${index}`}><td>{label(ingredientFor(row.ingredientId), row.ingredientId)}</td>{quantityCells(row, index)}<MacroCells values={macros[index]} /></tr>)}</NutritionTable>
      <TableNutritionSummary total={total} />
    </section>
    <section className="detail-section" aria-labelledby="meal-title">
      <div className="detail-section-heading">
        <h2 id="meal-title"><label htmlFor="meal-divisions">{ko ? '몇 등분할까요?' : 'How many portions?'}</label></h2>
        <div className="detail-divisions"><Input density="quantity" id="meal-divisions" type="number" min="1" step="1" value={divisions} onChange={event => setDivisions(Math.max(1, Math.floor(amount(event.target.value))))} /><span>{ko ? '등분' : 'portions'}</span></div>
      </div>
      <NutritionTable total={meal} labelledBy="meal-title">
        <tr><td>{ko ? '전체 재료 합계' : 'All ingredients total'}</td><td className="numeric">1/{divisions}</td><td className="muted">{ko ? '분량' : 'batch'}</td><MacroCells values={portion} /></tr>
        {sides.map((row, index) => {
          const current = ingredientFor(row.ingredientId)
          const choices = [...new Map([...(current ? [current] : []), ...staples].map(ingredient => [ingredient.id, ingredient])).values()]
          return <tr className="detail-staple" key={index}><td><Select value={current?.id ?? row.ingredientId} items={choices.map(ingredient => ({ value: ingredient.id, label: label(ingredient, ingredient.id) }))} onValueChange={id => { const selected = id ? ingredientFor(id) : undefined; if (selected) setSides(values => values.map((value, i) => i === index ? {ingredientId: selected.id, amount: selected.baseAmount, unit: selected.baseUnit} : value)) }}><SelectTrigger size="quantity" aria-label={ko ? '주식 선택' : 'Choose staple'}><SelectValue /></SelectTrigger><SelectContent>{choices.map(ingredient => <SelectItem key={ingredient.id} value={ingredient.id}>{label(ingredient, ingredient.id)}</SelectItem>)}</SelectContent></Select></td>{quantityCells(row, index, true)}<MacroCells values={macrosFor(row)} /></tr>
        })}
      </NutritionTable>
      <TableNutritionSummary total={meal} />
      <section className="detail-notes"><h2>{ko ? '메모' : 'Notes'}</h2><p>{memo.trim() ? memo : (ko ? '메모 없음' : 'No notes')}</p></section>
    </section>
    </div>
  </article>
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const [recipes, setRecipes] = useState<Recipe[]>(staticRecipes)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(false)
    async function load() {
      try {
        await loadIngredientsFromFirestore()
        const docs = await loadRecipesFromFirestore()
        if (!cancelled) setRecipes([...staticRecipes, ...docs.map(convertToRecipe)])
      } catch { if (!cancelled) setError(true) }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [attempt])
  const recipe = recipes.find(value => value.id === id && (isAdmin || !value.hidden))
  if (loading) return <LoadingState label={language === 'ko' ? '불러오는 중...' : 'Loading...'} />
  if (!recipe) return <ContentState variant="detail" error={error} title={language === 'ko' ? (error ? '레시피를 불러오지 못했습니다.' : '레시피를 찾을 수 없습니다.') : 'Recipe unavailable.'}>{error && <Button variant="ghost" size="content" onClick={() => setAttempt(value => value + 1)}>{language === 'ko' ? '다시 시도' : 'Retry'}</Button>}<Link to="/recipes">{language === 'ko' ? '레시피 목록' : 'All recipes'}</Link></ContentState>
  return <RecipeNutrition key={recipe.id} recipe={recipe} />
}
