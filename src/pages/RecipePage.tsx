import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useSearch } from '../context/SearchContext'
import { useAdmin } from '../context/AdminContext'
import { RecipeTable } from '../components/RecipeTable'
import { RecipeGrid } from '../components/RecipeGrid'
import { IngredientSearchModal } from '../components/IngredientSearchModal'
import { recipes as staticRecipes } from '../data/recipe'
import {
  applyLanguageToRecipeStates,
  buildInitialRecipeStates,
  type RecipeStates,
} from '../utils/recipeState'
import { convertUnit, roundToOne } from '../utils/nutrition'
import { ingredientById } from '../data/ingredients'
import { recipeContainsIngredient } from '../utils/search'
import { loadRecipesFromFirestore, convertToRecipe, deleteRecipeFromFirestore, updateRecipeInFirestore } from '../services/recipeService'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import type { Recipe } from '../types'

export function RecipePage() {
  const { appliedSearch, homeVersion } = useSearch()
  const { language, t } = useLanguage()
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<'alpha-asc' | 'alpha-desc' | 'date-desc' | 'date-asc'>('date-desc')
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
    setRecipeStates(buildInitialRecipeStates(language))
  }, [homeVersion])

  useEffect(() => {
    setRecipeStates((current) => applyLanguageToRecipeStates(current, language))
    setMultigrainRiceUnit(language === 'en' ? 'oz' : 'g')
  }, [language])

  const visibleRecipes = useMemo(() => {
    const filtered = recipes
      .filter((recipe) => isAdmin || !recipe.hidden)
      .filter((recipe) => !appliedSearch || recipeContainsIngredient(recipe, appliedSearch))

    return filtered.sort((a, b) => {
      if (sortOrder === 'alpha-asc') {
        const nameA = language === 'ko' ? a.nameKo : a.name
        const nameB = language === 'ko' ? b.nameKo : b.name
        return nameA.localeCompare(nameB, language === 'ko' ? 'ko' : 'en')
      }
      if (sortOrder === 'alpha-desc') {
        const nameA = language === 'ko' ? a.nameKo : a.name
        const nameB = language === 'ko' ? b.nameKo : b.name
        return nameB.localeCompare(nameA, language === 'ko' ? 'ko' : 'en')
      }
      if (sortOrder === 'date-desc') {
        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      }
      return (a.createdAt ?? 0) - (b.createdAt ?? 0)
    })
  }, [appliedSearch, recipes, sortOrder, language, isAdmin])

  function updateAmount(recipeId: string, ingredientId: string, raw: string) {
    const parsed = raw === '' ? 0 : Number.parseFloat(raw)
    if (Number.isNaN(parsed) || parsed < 0) return

    setRecipeStates((current) => ({
      ...current,
      [recipeId]: current[recipeId].map((row) =>
        row.ingredientId === ingredientId
          ? { ...row, amount: roundToOne(parsed) }
          : row,
      ),
    }))
  }

  function updateUnit(recipeId: string, ingredientId: string, newUnit: string) {
    setRecipeStates((current) => ({
      ...current,
      [recipeId]: current[recipeId].map((row) => {
        if (row.ingredientId !== ingredientId) return row

        const ingredient = ingredientById.get(row.ingredientId)
        if (!ingredient || row.unit === newUnit) return row

        const converted = convertUnit(
          row.amount,
          row.unit,
          newUnit,
          ingredient.conversions,
        )

        return { ...row, unit: newUnit, amount: roundToOne(converted) }
      }),
    }))
  }

  async function handleDeleteRecipe(id: string) {
    await deleteRecipeFromFirestore(id)
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    setRecipeStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
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

  const recipeCountLabel =
    visibleRecipes.length === 1
      ? t.recipeFoundOne
      : t.recipeFoundMany(visibleRecipes.length)

  const recipeList = visibleRecipes.map((recipe) => (
    <RecipeTable
      key={recipe.id}
      recipe={recipe}
      rows={recipeStates[recipe.id]}
      appliedSearch={appliedSearch}
      divisionCount={divisionCount}
      onDivisionCountChange={setDivisionCount}
      multigrainRiceAmount={multigrainRiceAmount}
      onMultigrainRiceAmountChange={setMultigrainRiceAmount}
      multigrainRiceUnit={multigrainRiceUnit}
      onMultigrainRiceUnitChange={setMultigrainRiceUnit}
      onSaveRecipe={handleSaveRecipe}
      onDeleteRecipe={handleDeleteRecipe}
      onAmountChange={(ingredientId, raw) =>
        updateAmount(recipe.id, ingredientId, raw)
      }
      onUnitChange={(ingredientId, newUnit) =>
        updateUnit(recipe.id, ingredientId, newUnit)
      }
    />
  ))

  return (
    <section className="page">
      <div className="recipe-sort">
        <select
          className="recipe-sort__select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
        >
          <option value="date-desc">{language === 'ko' ? '최신 등록순' : 'Newest first'}</option>
          <option value="date-asc">{language === 'ko' ? '오래된 등록순' : 'Oldest first'}</option>
          <option value="alpha-asc">{language === 'ko' ? '이름순 (ㄱ~ㅎ)' : 'Name (A→Z)'}</option>
          <option value="alpha-desc">{language === 'ko' ? '이름순 (ㅎ~ㄱ)' : 'Name (Z→A)'}</option>
        </select>
      </div>

      {appliedSearch ? (
        <header className="search-results">
          <h2 className="page__heading">{t.searchResults}</h2>
          <p className="search-results__count">{recipeCountLabel}</p>
        </header>
      ) : null}

      {appliedSearch ? (
        <div className="recipe-list">
          {visibleRecipes.length === 0 ? (
            <p className="page__empty">{t.noRecipesFound(appliedSearch)}</p>
          ) : (
            recipeList
          )}
        </div>
      ) : loading ? (
        <div className="empty-state">
          <svg className="empty-state__icon empty-state__icon--spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
          <p className="empty-state__text">{language === 'ko' ? '불러오는 중...' : 'Loading...'}</p>
        </div>
      ) : visibleRecipes.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state__icon" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <ellipse cx="40" cy="58" rx="28" ry="6" fill="currentColor" opacity="0.08" />
            <path d="M14 38 C14 24 26 14 40 14 C54 14 66 24 66 38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
            <line x1="10" y1="38" x2="70" y2="38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M30 38 L30 50 Q30 54 34 54 L46 54 Q50 54 50 50 L50 38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="56" y1="20" x2="56" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M52 20 Q52 16 56 16 Q60 16 60 20 L60 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
          <p className="empty-state__text">{language === 'ko' ? '등록된 레시피가 없습니다' : 'No recipes yet'}</p>
        </div>
      ) : (
        <RecipeGrid recipes={visibleRecipes} />
      )}

      <IngredientSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onIngredientSelect={(ingredient) => {
          console.log('Selected ingredient:', ingredient)
        }}
      />
    </section>
  )
}
