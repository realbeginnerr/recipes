import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { RecipeTable } from '../components/RecipeTable'
import { recipes as staticRecipes } from '../data/recipe'
import {
  applyLanguageToRecipeStates,
  buildInitialRecipeStates,
  type RecipeStates,
} from '../utils/recipeState'
import { convertUnit, roundToOne } from '../utils/nutrition'
import { ingredientById } from '../data/ingredients'
import { loadRecipesFromFirestore, convertToRecipe, deleteRecipeFromFirestore, updateRecipeInFirestore } from '../services/recipeService'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import type { Recipe } from '../types'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const [recipes, setRecipes] = useState<Recipe[]>(staticRecipes)
  const [recipeStates, setRecipeStates] = useState<RecipeStates>(() =>
    buildInitialRecipeStates(language),
  )
  const [divisionCount, setDivisionCount] = useState(4)
  const [multigrainRiceAmount, setMultigrainRiceAmount] = useState(130)
  const [multigrainRiceUnit, setMultigrainRiceUnit] = useState(() =>
    language === 'en' ? 'oz' : 'g',
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        await loadIngredientsFromFirestore()
        const fsDocs = await loadRecipesFromFirestore()
        const converted = fsDocs.map(convertToRecipe)
        setRecipes([...staticRecipes, ...converted])
        setRecipeStates((current) => {
          const extra: RecipeStates = {}
          for (const r of converted) {
            if (!current[r.id]) {
              extra[r.id] = r.items.map((item) => ({
                ingredientId: item.ingredientId,
                amount: item.defaultAmount,
                unit: item.defaultUnit,
              }))
            }
          }
          return { ...current, ...extra }
        })
      } finally {
        setLoading(false)
      }
    }
    load().catch(console.error)
  }, [])

  useEffect(() => {
    setRecipeStates((current) => applyLanguageToRecipeStates(current, language))
    setMultigrainRiceUnit(language === 'en' ? 'oz' : 'g')
  }, [language])

  const recipe = recipes.find((r) => r.id === id)

  function updateAmount(ingredientId: string, raw: string) {
    if (!id) return
    const parsed = raw === '' ? 0 : Number.parseFloat(raw)
    if (Number.isNaN(parsed) || parsed < 0) return
    setRecipeStates((current) => ({
      ...current,
      [id]: current[id].map((row) =>
        row.ingredientId === ingredientId
          ? { ...row, amount: roundToOne(parsed) }
          : row,
      ),
    }))
  }

  function updateUnit(ingredientId: string, newUnit: string) {
    if (!id) return
    setRecipeStates((current) => ({
      ...current,
      [id]: current[id].map((row) => {
        if (row.ingredientId !== ingredientId) return row
        const ingredient = ingredientById.get(row.ingredientId)
        if (!ingredient || row.unit === newUnit) return row
        const converted = convertUnit(row.amount, row.unit, newUnit, ingredient.conversions)
        return { ...row, unit: newUnit, amount: roundToOne(converted) }
      }),
    }))
  }

  async function handleDeleteRecipe(recipeId: string) {
    await deleteRecipeFromFirestore(recipeId)
    navigate('/', { replace: true })
  }

  function handleSaveRecipe(updated: Recipe) {
    setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setRecipeStates((current) => ({
      ...current,
      [updated.id]: updated.items.map((item) => ({
        ingredientId: item.ingredientId,
        amount: item.defaultAmount,
        unit: item.defaultUnit,
      })),
    }))
    updateRecipeInFirestore(updated).catch(console.error)
  }

  if (loading) {
    return (
      <section className="page">
        <div className="empty-state">
          <svg className="empty-state__icon empty-state__icon--spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
          <p className="empty-state__text">{language === 'ko' ? '불러오는 중...' : 'Loading...'}</p>
        </div>
      </section>
    )
  }

  if (!recipe) {
    return (
      <section className="page">
        <p className="page__empty">{language === 'ko' ? '레시피를 찾을 수 없습니다' : 'Recipe not found'}</p>
        <button type="button" className="recipe-detail__back" onClick={() => navigate(-1)}>
          {language === 'ko' ? '← 뒤로' : '← Back'}
        </button>
      </section>
    )
  }

  return (
    <section className="page">
      <button type="button" className="recipe-detail__back" onClick={() => navigate(-1)}>
        {language === 'ko' ? '← 뒤로' : '← Back'}
      </button>
      <RecipeTable
        recipe={recipe}
        rows={recipeStates[recipe.id] ?? []}
        appliedSearch=""
        divisionCount={divisionCount}
        onDivisionCountChange={setDivisionCount}
        multigrainRiceAmount={multigrainRiceAmount}
        onMultigrainRiceAmountChange={setMultigrainRiceAmount}
        multigrainRiceUnit={multigrainRiceUnit}
        onMultigrainRiceUnitChange={setMultigrainRiceUnit}
        onSaveRecipe={handleSaveRecipe}
        onDeleteRecipe={handleDeleteRecipe}
        onAmountChange={updateAmount}
        onUnitChange={updateUnit}
      />
    </section>
  )
}
