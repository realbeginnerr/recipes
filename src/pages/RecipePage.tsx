import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useSearch } from '../context/SearchContext'
import { RecipeTable } from '../components/RecipeTable'
import { RecipeEditModal } from '../components/RecipeEditModal'
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
  const [multigrainRiceUnit, setMultigrainRiceUnit] = useState('g')
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)

  useEffect(() => {
    setRecipeStates(buildInitialRecipeStates(language))
  }, [homeVersion])

  useEffect(() => {
    setRecipeStates((current) => applyLanguageToRecipeStates(current, language))
  }, [language])

  const visibleRecipes = useMemo(() => {
    if (!appliedSearch) return recipes
    return recipes.filter((recipe) =>
      recipeContainsIngredient(recipe, appliedSearch),
    )
  }, [appliedSearch, recipes])

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

        return {
          ...row,
          unit: newUnit,
          amount: roundToOne(converted),
        }
      }),
    }))
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
    setEditingRecipeId(null)
  }

  const editingRecipe = editingRecipeId
    ? recipes.find((r) => r.id === editingRecipeId) ?? null
    : null

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
      onAddFoodClick={() => setIsSearchModalOpen(true)}
      onEditClick={() => setEditingRecipeId(recipe.id)}
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

      {editingRecipe && (
        <RecipeEditModal
          recipe={editingRecipe}
          onSave={handleSaveRecipe}
          onClose={() => setEditingRecipeId(null)}
        />
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
