import { useLanguage } from '../context/LanguageContext'
import { ingredientById } from '../data/ingredients'
import { TableContainer } from './TableContainer'
import type { Recipe, RecipeRowState } from '../types'
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
}: RecipeTableProps) {
  const { language, t } = useLanguage()

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
      <h2 className="recipe-block__heading">
        {getRecipeDisplayName(recipe, language)}
      </h2>
      <div className="recipe-block__image-wrap">
        <img
          className="recipe-block__image"
          src={recipe.imageUrl}
          alt=""
          loading="lazy"
        />
      </div>

      <h3 style={{ margin: '1.5rem 0 1rem 0', fontSize: '1.25rem' }}>
        {t.mainIngredients}
      </h3>
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
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ingredient = ingredientById.get(row.ingredientId)
              if (!ingredient) return null

              const grams = amountToGrams(
                row.amount,
                row.unit,
                ingredient.conversions,
              )
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
            })}
          </tbody>
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
          </tfoot>
        </table>
      </TableContainer>

      <h3 style={{ margin: '1.5rem 0 1rem 0', fontSize: '1.25rem' }}>
        {t.otherIngredients}
      </h3>
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
            </tr>
          </thead>
          <tbody>
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
    </section>
  )
}
