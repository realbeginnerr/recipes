import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useSearch } from '../context/SearchContext'
import { RecipeTable } from '../components/RecipeTable'
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
import { loadRecipesFromFirestore, convertToRecipe, deleteRecipeFromFirestore } from '../services/recipeService'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import type { Recipe } from '../types'

export function RecipePage() {
  const { appliedSearch, homeVersion } = useSearch()
  const { language, t } = useLanguage()
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
  const [sortOrder, setSortOrder] = useState<'alpha-asc' | 'alpha-desc' | 'date-desc' | 'date-asc'>('date-asc')

  useEffect(() => {
    async function load() {
      await loadIngredientsFromFirestore()
      const fsDocs = await loadRecipesFromFirestore()
      if (fsDocs.length === 0) return
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
    const filtered = appliedSearch
      ? recipes.filter((recipe) => recipeContainsIngredient(recipe, appliedSearch))
      : [...recipes]

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
  }, [appliedSearch, recipes, sortOrder, language])

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
          <option value="alpha-asc">{language === 'ko' ? '이름순 (ㄱ→ㅎ)' : 'Name (A→Z)'}</option>
          <option value="alpha-desc">{language === 'ko' ? '이름순 (ㅎ→ㄱ)' : 'Name (Z→A)'}</option>
          <option value="date-desc">{language === 'ko' ? '최신 등록순' : 'Newest first'}</option>
          <option value="date-asc">{language === 'ko' ? '오래된 등록순' : 'Oldest first'}</option>
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
      ) : (
        recipeList
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
