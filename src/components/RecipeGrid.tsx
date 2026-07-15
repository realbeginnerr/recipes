import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../types'

const MULTIGRAIN_ID = '__multigrain_rice__'

const base = import.meta.env.BASE_URL

const localImageMap: Record<string, string> = {
  '닭갈비': `${base}images/닭갈비.png`,
  '쫄면': `${base}images/쫄면.png`,
  '피자': `${base}images/피자.png`,
  '멸치볶음': `${base}images/멸치볶음.jpeg`,
  '가지볶음': `${base}images/가지볶음.jpg`,
  '가지볶음, 멸치볶음': `${base}images/가지볶음.jpg`,
  '버섯 토스트': `${base}images/버섯 토스트.png`,
  '감자탕': `${base}images/감자탕.jpg`,
  '고추바사삭': `${base}images/고추바사삭.jpg`,
  '칠리콘카르네': `${base}images/칠리콘카르네.jpg`,
  '단팥빵': `${base}images/20260710_단팥빵.jpg`,
}

function resolveImage(recipe: Recipe): string {
  if (recipe.imageUrl) return recipe.imageUrl
  return localImageMap[recipe.nameKo] ?? ''
}
import { useLanguage } from '../context/LanguageContext'
import { ingredientById } from '../data/ingredients'
import { amountToGrams, calculateMacros } from '../utils/nutrition'
import { trackRecipeView } from '../utils/analytics'

interface Macros { carbs: number; protein: number; fat: number }

const REC = { carbs: 75, protein: 33, fat: 22 }

function calcMacros(recipe: Recipe): Macros {
  let carbs = 0, protein = 0, fat = 0
  for (const item of recipe.items) {
    const ing = ingredientById.get(item.ingredientId)
    if (!ing) continue
    const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ing.conversions)
    const m = calculateMacros(grams, ing)
    carbs += m.carbs
    protein += m.protein
    fat += m.fat
  }
  const division = recipe.divisionCount ?? 4
  const sideItems = recipe.sideItems ?? []
  let sideCarbs = 0, sideProtein = 0, sideFat = 0
  for (const item of sideItems) {
    if (item.ingredientId === MULTIGRAIN_ID) {
      const g = item.defaultUnit === 'oz' ? item.defaultAmount * 28.3495 : item.defaultAmount
      sideCarbs += (g * 28.5) / 100
      sideProtein += (g * 3.1) / 100
      sideFat += (g * 0.8) / 100
      continue
    }
    const ing = ingredientById.get(item.ingredientId)
    if (!ing) continue
    const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ing.conversions)
    const m = calculateMacros(grams, ing)
    sideCarbs += m.carbs
    sideProtein += m.protein
    sideFat += m.fat
  }
  return {
    carbs: carbs / division + sideCarbs,
    protein: protein / division + sideProtein,
    fat: fat / division + sideFat,
  }
}

function macroColor(value: number, target: number): string {
  const diff = Math.abs(value - target)
  if (diff >= 10) return '#dc2626'
  if (diff >= 5) return '#ea580c'
  return '#16a34a'
}

function MacroChart({ macros }: { macros: Macros }) {
  const { language } = useLanguage()
  const bars = [
    { label: language === 'ko' ? '탄' : 'C', value: macros.carbs, rec: REC.carbs },
    { label: language === 'ko' ? '단' : 'P', value: macros.protein, rec: REC.protein },
    { label: language === 'ko' ? '지' : 'F', value: macros.fat, rec: REC.fat },
  ]

  return (
    <div className="macro-chart">
      {bars.map(({ label, value, rec }) => {
        const pct = Math.min((value / rec) / 1.3 * 100, 100)
        const color = macroColor(value, rec)
        return (
          <div key={label} className="macro-chart__row">
            <span className="macro-chart__label">{label}</span>
            <div className="macro-chart__track">
              <div className="macro-chart__bar" style={{ width: `${pct}%`, background: color }} />
              <div className="macro-chart__rec-line" style={{ left: `${(100 / 130) * 100}%` }} />
            </div>
            <span className="macro-chart__value" style={{ color }}>
              {Math.round(value)} / {rec}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const name = language === 'ko' ? recipe.nameKo : recipe.name
  const macros = calcMacros(recipe)
  const imageUrl = resolveImage(recipe)

  function handleClick() {
    trackRecipeView(recipe.nameKo, recipe.name)
    navigate(`/recipe/${recipe.id}`)
  }

  return (
    <article
      className="recipe-card"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      role="button"
      tabIndex={0}
      aria-label={name}
    >
      <div className="recipe-card__image-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="recipe-card__image" />
        ) : (
          <div className="recipe-card__placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
              <path d="M7 2v20"/>
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/>
              <path d="M21 15v7"/>
            </svg>
          </div>
        )}
      </div>
      <div className="recipe-card__footer">
        <span className="recipe-card__name">{name}</span>
        <MacroChart macros={macros} />
      </div>
    </article>
  )
}

export function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="recipe-grid">
      {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
    </div>
  )
}
