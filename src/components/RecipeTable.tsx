import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { ingredientById, ingredients } from '../data/ingredients'
import { TableContainer } from './TableContainer'
import type { Recipe, RecipeItem, RecipeRowState } from '../types'
import {
  amountToGrams,
  calculateMacros,
  formatAmount,
  formatMacro,
} from '../utils/nutrition'
import { getIngredientDisplayName, getRecipeDisplayName } from '../utils/displayNames'
import { ingredientMatchesSearch } from '../utils/search'

type RecipeTableProps = {
  recipe: Recipe
  rows: RecipeRowState[]
  appliedSearch: string
  divisionCount: number
  onDivisionCountChange: (value: number) => void
  onAmountChange: (ingredientId: string, raw: string) => void
  onUnitChange: (ingredientId: string, newUnit: string) => void
  multigrainRiceAmount: number
  onMultigrainRiceAmountChange: (value: number) => void
  multigrainRiceUnit: string
  onMultigrainRiceUnitChange: (value: string) => void
  onAddFoodClick: () => void
  onSaveRecipe: (updated: Recipe) => void
}

type UnitKey = keyof (typeof import('../i18n/translations').translations)['en']['units']

export function RecipeTable({
  recipe,
  rows,
  appliedSearch,
  divisionCount,
  onDivisionCountChange,
  onAmountChange,
  onUnitChange,
  multigrainRiceAmount,
  onMultigrainRiceAmountChange,
  multigrainRiceUnit,
  onMultigrainRiceUnitChange,
  onAddFoodClick,
  onSaveRecipe,
}: RecipeTableProps) {
  const { language, t } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [editImageUrl, setEditImageUrl] = useState(recipe.imageUrl)
  const [editItems, setEditItems] = useState<RecipeItem[]>(recipe.items)
  const [addSearch, setAddSearch] = useState('')

  const filteredIngredients = addSearch.trim()
    ? ingredients.filter((ing) =>
        ing.name.toLowerCase().includes(addSearch.toLowerCase()) ||
        (ing.nameKo ?? '').includes(addSearch),
      )
    : []

  function startEditing() {
    setEditImageUrl(recipe.imageUrl)
    setEditItems(recipe.items)
    setAddSearch('')
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setAddSearch('')
  }

  function handleSave() {
    onSaveRecipe({ ...recipe, imageUrl: editImageUrl, items: editItems })
    setIsEditing(false)
    setAddSearch('')
  }

  function handleEditAmountChange(index: number, value: string) {
    const parsed = value === '' ? 0 : Number.parseFloat(value)
    if (Number.isNaN(parsed) || parsed < 0) return
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, defaultAmount: parsed } : item)),
    )
  }

  function handleEditUnitChange(index: number, unit: string) {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, defaultUnit: unit } : item)),
    )
  }

  function handleDeleteItem(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddIngredient(ingredientId: string) {
    if (editItems.some((item) => item.ingredientId === ingredientId)) return
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    setEditItems((prev) => [
      ...prev,
      { ingredientId, defaultAmount: 100, defaultUnit: ing.allowedUnits[0] },
    ])
    setAddSearch('')
  }

  const totals = rows.reduce(
    (acc, row) => {
      const ingredient = ingredientById.get(row.ingredientId)
      if (!ingredient) return acc

      const grams = amountToGrams(row.amount, row.unit, ingredient.conversions)
      const macros = calculateMacros(grams, ingredient)
      return {
        carbs: acc.carbs + macros.carbs,
        protein: acc.protein + macros.protein,
        fat: acc.fat + macros.fat,
      }
    },
    { carbs: 0, protein: 0, fat: 0 },
  )

  function unitLabel(unit: string): string {
    if (unit in t.units) {
      return t.units[unit as UnitKey]
    }
    return unit
  }

  return (
    <section className="recipe-block">
      <div className="recipe-block__heading-row">
        <h2 className="recipe-block__heading">
          {getRecipeDisplayName(recipe, language)}
        </h2>
        {isEditing ? (
          <div className="recipe-block__edit-actions">
            <button type="button" className="edit-inline__cancel-btn" onClick={handleCancel}>
              취소
            </button>
            <button type="button" className="edit-inline__save-btn" onClick={handleSave}>
              저장
            </button>
          </div>
        ) : (
          <button type="button" className="recipe-block__edit-btn" onClick={startEditing} aria-label="Edit recipe">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="recipe-block__image-wrap">
        <img
          className="recipe-block__image"
          src={isEditing ? editImageUrl : recipe.imageUrl}
          alt=""
          loading="lazy"
        />
      </div>

      {isEditing && (
        <div className="edit-inline__image-section">
          <label className="edit-inline__label">이미지 URL</label>
          <input
            type="text"
            className="edit-inline__input"
            value={editImageUrl}
            onChange={(e) => setEditImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      <TableContainer>
        <table className="data-table recipe-table">
          <thead>
            <tr>
              <th>{t.colIngredient}</th>
              <th>{t.colAmount}</th>
              <th>{t.colUnit}</th>
              <th>{t.colCarbs}</th>
              <th>{t.colProtein}</th>
              <th>{t.colFat}</th>
              {isEditing && <th></th>}
            </tr>
          </thead>
          <tbody>
            {isEditing ? (
              editItems.map((item, index) => {
                const ingredient = ingredientById.get(item.ingredientId)
                if (!ingredient) return null
                return (
                  <tr key={item.ingredientId}>
                    <td>{getIngredientDisplayName(ingredient, language)}</td>
                    <td>
                      <input
                        type="number"
                        className="amount-input"
                        min={0}
                        step="0.1"
                        value={item.defaultAmount}
                        onChange={(e) => handleEditAmountChange(index, e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="unit-select"
                        value={item.defaultUnit}
                        onChange={(e) => handleEditUnitChange(index, e.target.value)}
                      >
                        {ingredient.allowedUnits.map((unit) => (
                          <option key={unit} value={unit}>{unitLabel(unit)}</option>
                        ))}
                      </select>
                    </td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>
                      <button
                        type="button"
                        className="edit-inline__delete-btn"
                        onClick={() => handleDeleteItem(index)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              rows.map((row) => {
                const ingredient = ingredientById.get(row.ingredientId)
                if (!ingredient) return null

                const grams = amountToGrams(row.amount, row.unit, ingredient.conversions)
                const macros = calculateMacros(grams, ingredient)
                const isMatch =
                  appliedSearch !== '' &&
                  ingredientMatchesSearch(ingredient, appliedSearch)

                return (
                  <tr
                    key={row.ingredientId}
                    className={isMatch ? 'recipe-table__row--match' : undefined}
                  >
                    <td>{getIngredientDisplayName(ingredient, language)}</td>
                    <td>
                      <input
                        type="number"
                        className="amount-input"
                        min={0}
                        step="0.1"
                        value={formatAmount(row.amount)}
                        onChange={(event) =>
                          onAmountChange(row.ingredientId, event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="unit-select"
                        value={row.unit}
                        onChange={(event) =>
                          onUnitChange(row.ingredientId, event.target.value)
                        }
                      >
                        {ingredient.allowedUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unitLabel(unit)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatMacro(macros.carbs)}</td>
                    <td>{formatMacro(macros.protein)}</td>
                    <td>{formatMacro(macros.fat)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
          {isEditing ? (
            <tfoot>
              <tr className="recipe-table__division-row">
                <td colSpan={7}>
                  <div className="edit-inline__add">
                    <input
                      type="search"
                      className="edit-inline__input"
                      placeholder="재료 검색해서 추가..."
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                    />
                    {filteredIngredients.length > 0 && (
                      <ul className="edit-inline__suggestions">
                        {filteredIngredients.slice(0, 8).map((ing) => (
                          <li key={ing.id}>
                            <button
                              type="button"
                              className="edit-inline__suggestion-btn"
                              onClick={() => handleAddIngredient(ing.id)}
                            >
                              {getIngredientDisplayName(ing, language)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          ) : (
            <tfoot>
              <tr className="recipe-table__total">
                <td colSpan={3}>
                  <strong>{t.total}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.carbs)}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.protein)}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.fat)}</strong>
                </td>
              </tr>
              <tr className="recipe-table__division-row">
                <td colSpan={3}>
                  <strong>
                    {language === 'en' ? (
                      <>
                        {t.divideByMeals}{' '}
                        <input
                          type="number"
                          className="amount-input"
                          min={1}
                          step="1"
                          value={divisionCount}
                          onChange={(event) => {
                            const value = Number.parseInt(event.target.value, 10)
                            if (!Number.isNaN(value) && value > 0) {
                              onDivisionCountChange(value)
                            }
                          }}
                          style={{ width: '60px', display: 'inline-block' }}
                        />{' '}
                        {t.meals}
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          className="amount-input"
                          min={1}
                          step="1"
                          value={divisionCount}
                          onChange={(event) => {
                            const value = Number.parseInt(event.target.value, 10)
                            if (!Number.isNaN(value) && value > 0) {
                              onDivisionCountChange(value)
                            }
                          }}
                          style={{ width: '60px', display: 'inline-block' }}
                        />{' '}
                        {t.divideByMeals}
                      </>
                    )}
                  </strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.carbs / divisionCount)}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.protein / divisionCount)}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.fat / divisionCount)}</strong>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </TableContainer>

      {!isEditing && (
        <TableContainer style={{ marginTop: '16px' }}>
          <table className="data-table recipe-table">
            <thead>
              <tr>
                <th>{t.colIngredient}</th>
                <th>{t.colAmount}</th>
                <th>{t.colUnit}</th>
                <th>{t.colCarbs}</th>
                <th>{t.colProtein}</th>
                <th>{t.colFat}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="recipe-table__multigrain-row">
                <td>{language === 'ko' ? '잡곡밥 (쌀:잡곡=2:1)' : 'Multigrain rice (rice:grains=2:1)'}</td>
                <td>
                  <input
                    type="number"
                    className="amount-input"
                    min={0}
                    step="0.1"
                    value={formatAmount(multigrainRiceAmount)}
                    onChange={(event) => {
                      const parsed = event.target.value === '' ? 0 : Number.parseFloat(event.target.value)
                      if (!Number.isNaN(parsed) && parsed >= 0) {
                        onMultigrainRiceAmountChange(parsed)
                      }
                    }}
                  />
                </td>
                <td>
                  <select
                    className="unit-select"
                    value={multigrainRiceUnit}
                    onChange={(event) => {
                      onMultigrainRiceUnitChange(event.target.value)
                    }}
                  >
                    <option value="g">g</option>
                    <option value="oz">oz</option>
                  </select>
                </td>
                <td>{formatMacro((multigrainRiceAmount * 28.5) / 100)}</td>
                <td>{formatMacro((multigrainRiceAmount * 3.1) / 100)}</td>
                <td>{formatMacro((multigrainRiceAmount * 0.8) / 100)}</td>
              </tr>
              <tr className="recipe-table__multigrain-row">
                <td colSpan={6}>
                  <button
                    type="button"
                    onClick={onAddFoodClick}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--accent)',
                      borderRadius: '6px',
                      background: 'var(--accent)',
                      color: '#fff',
                      font: 'inherit',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {t.addFood}
                  </button>
                </td>
              </tr>
              <tr className="recipe-table__total">
                <td colSpan={3}>
                  <strong>{t.combinedTotal}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.carbs / divisionCount + (multigrainRiceAmount * 28.5) / 100)}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.protein / divisionCount + (multigrainRiceAmount * 3.1) / 100)}</strong>
                </td>
                <td>
                  <strong>{formatMacro(totals.fat / divisionCount + (multigrainRiceAmount * 0.8) / 100)}</strong>
                </td>
              </tr>
              <tr className="recipe-table__total">
                <td colSpan={3}>
                  <strong>{t.recommendedPerMeal}</strong>
                </td>
                <td>
                  <strong>77</strong>
                </td>
                <td>
                  <strong>33</strong>
                </td>
                <td>
                  <strong>22</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </TableContainer>
      )}
    </section>
  )
}
