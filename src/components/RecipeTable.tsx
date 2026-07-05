import { useState, useRef, useEffect } from 'react'

function StarRating({ label, value, onChange }: { label: string; value: number; onChange?: (v: number) => void }) {
  return (
    <div className="star-rating">
      <span className="star-rating__label">{label}</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-rating__star${star <= value ? ' star-rating__star--filled' : ''}`}
          onClick={onChange ? () => onChange(star) : undefined}
          style={{ cursor: onChange ? 'pointer' : 'default' }}
          tabIndex={onChange ? 0 : -1}
        >
          ★
        </button>
      ))}
    </div>
  )
}
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { ingredientById } from '../data/ingredients'
import { IngredientSearchModal } from './IngredientSearchModal'
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
  onSaveRecipe: (updated: Recipe) => void
}


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
  onSaveRecipe,
}: RecipeTableProps) {
  const { language, t } = useLanguage()
  const { isAdmin } = useAdmin()
  const [localRecipe, setLocalRecipe] = useState(recipe)
  const activeRecipe = localRecipe
  const [isEditing, setIsEditing] = useState(false)
  const [editImageUrl, setEditImageUrl] = useState(activeRecipe.imageUrl)
  const [editLink, setEditLink] = useState(activeRecipe.link ?? '')
  const [editItems, setEditItems] = useState<RecipeItem[]>(activeRecipe.items)
  const [editMemo, setEditMemo] = useState(activeRecipe.memo ?? '')
  const [editTasteRating, setEditTasteRating] = useState(activeRecipe.tasteRating ?? 4)
  const [editTimeRating, setEditTimeRating] = useState(activeRecipe.timeRating ?? 4)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set())
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isEditing) return
    function handleMouseDown(e: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        handleCancel()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isEditing])

  function startEditing() {
    setEditImageUrl(activeRecipe.imageUrl)
    setEditLink(activeRecipe.link ?? '')
    setEditItems(activeRecipe.items.map((item) => {
      const row = rows?.find((r) => r.ingredientId === item.ingredientId)
      return row ? { ...item, defaultAmount: row.amount, defaultUnit: row.unit } : item
    }))
    setEditMemo(activeRecipe.memo ?? '')
    setEditTasteRating(activeRecipe.tasteRating ?? 4)
    setEditTimeRating(activeRecipe.timeRating ?? 4)
    setNewlyAddedIds(new Set())
    setIsEditing(true)
  }

  function handleCancel() {
    setNewlyAddedIds(new Set())
    setIsEditing(false)
  }

  function handleSave() {
    const updated = { ...activeRecipe, imageUrl: editImageUrl, link: editLink, items: editItems, memo: editMemo, tasteRating: editTasteRating, timeRating: editTimeRating }
    if (isAdmin) {
      onSaveRecipe(updated)
    } else {
      setLocalRecipe(updated)
    }
    setNewlyAddedIds(new Set())
    setIsEditing(false)
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

  function handleMoveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    setEditItems((prev) => {
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function handleAddIngredient(ingredientId: string) {
    if (editItems.some((item) => item.ingredientId === ingredientId)) return
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    setEditItems((prev) => [
      ...prev,
      { ingredientId, defaultAmount: 100, defaultUnit: ing.allowedUnits[0] },
    ])
    setNewlyAddedIds((prev) => new Set([...prev, ingredientId]))
  }

  const recommended = { carbs: 77, protein: 33, fat: 22 }

  function macroColor(value: number, target: number): string {
    const diff = Math.abs(value - target)
    if (diff >= 10) return '#dc2626'
    if (diff >= 5) return '#ea580c'
    return '#16a34a'
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



  return (
    <section className="recipe-block" ref={sectionRef}>
      <div className="recipe-block__heading-row">
        <div className="recipe-block__title-group">
          <h2 className="recipe-block__heading">
            {getRecipeDisplayName(activeRecipe, language)}
          </h2>
          <div className="recipe-block__ratings">
          <StarRating
            label={language === 'ko' ? '맛' : 'Taste'}
            value={isEditing ? editTasteRating : (activeRecipe.tasteRating ?? 4)}
            onChange={isEditing ? setEditTasteRating : undefined}
          />
          <StarRating
            label={language === 'ko' ? '시간' : 'Time'}
            value={isEditing ? editTimeRating : (activeRecipe.timeRating ?? 4)}
            onChange={isEditing ? setEditTimeRating : undefined}
          />
          {activeRecipe.link && (
            <a className="recipe-block__link-icon" href={activeRecipe.link} target="_blank" rel="noopener noreferrer" aria-label="Recipe link">
              🔗
            </a>
          )}
          </div>
        </div>
        <div className="recipe-block__edit-actions">
          {isEditing ? (
            <>
              <button type="button" className="edit-inline__cancel-btn" onClick={handleCancel}>
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button type="button" className="edit-inline__save-btn" onClick={handleSave}>
                {language === 'ko' ? '저장' : 'Save'}
              </button>
            </>
          ) : (
            <button type="button" className="edit-inline__edit-btn" onClick={startEditing}>
              ✏️
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="edit-inline__link-field">
          <label className="edit-inline__link-label">
            {language === 'ko' ? '링크' : 'Link'}
          </label>
          <input
            type="url"
            className="add-recipe__input"
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
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
              {isEditing && <th></th>}
            </tr>
          </thead>
          <tbody>
            {isEditing ? (
              editItems.map((item, index) => {
                const ingredient = ingredientById.get(item.ingredientId)
                if (!ingredient) return null
                const isNew = newlyAddedIds.has(item.ingredientId)
                return (
                  <tr key={item.ingredientId} className={isNew ? 'edit-row--new' : ''}>
                    <td style={{ fontWeight: isNew ? 700 : undefined }}>
                      {getIngredientDisplayName(ingredient, language)}
                    </td>
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
                        {language === 'ko' ? (
                          <>
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="T">T</option>
                            <option value="t">t</option>
                            <option value="컵">컵</option>
                            <option value="개">개</option>
                            <option value="꼬집">꼬집</option>
                            <option value="oz">oz</option>
                            <option value="lbs">lbs</option>
                            <option value="">선택안함</option>
                          </>
                        ) : (
                          <>
                            <option value="oz">oz</option>
                            <option value="lbs">lbs</option>
                            <option value="T">T</option>
                            <option value="t">t</option>
                            <option value="cup">cup</option>
                            <option value="ea">ea</option>
                            <option value="pinch">pinch</option>
                            <option value="">N/A</option>
                          </>
                        )}
                      </select>
                    </td>
                    {(() => {
                      const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ingredient.conversions)
                      const macros = calculateMacros(grams, ingredient)
                      return (
                        <>
                          <td>{formatMacro(macros.carbs)}</td>
                          <td>{formatMacro(macros.protein)}</td>
                          <td>{formatMacro(macros.fat)}</td>
                        </>
                      )
                    })()}
                    <td className="edit-inline__order-cell">
                      <div className="edit-inline__order-btns">
                        <button
                          type="button"
                          className="edit-inline__order-btn"
                          onClick={() => handleMoveItem(index, -1)}
                          disabled={index === 0}
                          aria-label="Move up"
                        >▲</button>
                        <button
                          type="button"
                          className="edit-inline__order-btn"
                          onClick={() => handleMoveItem(index, 1)}
                          disabled={index === editItems.length - 1}
                          aria-label="Move down"
                        >▼</button>
                      </div>
                    </td>
                    <td className="edit-inline__delete-cell">
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
                        onFocus={startEditing}
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
                        {language === 'ko' ? (
                          <>
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="T">T</option>
                            <option value="t">t</option>
                            <option value="컵">컵</option>
                            <option value="개">개</option>
                            <option value="꼬집">꼬집</option>
                            <option value="oz">oz</option>
                            <option value="lbs">lbs</option>
                            <option value="">선택안함</option>
                          </>
                        ) : (
                          <>
                            <option value="oz">oz</option>
                            <option value="lbs">lbs</option>
                            <option value="T">T</option>
                            <option value="t">t</option>
                            <option value="cup">cup</option>
                            <option value="ea">ea</option>
                            <option value="pinch">pinch</option>
                            <option value="">N/A</option>
                          </>
                        )}
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
          <tfoot>
            {!isEditing && (
              <>
                <tr className="recipe-table__total recipe-table__muted">
                  <td colSpan={3}>
                    {t.total}
                  </td>
                  <td className="macro">{formatMacro(totals.carbs)}</td>
                  <td className="macro">{formatMacro(totals.protein)}</td>
                  <td className="macro">{formatMacro(totals.fat)}</td>
                </tr>
                <tr className="recipe-table__division-row recipe-table__muted">
                  <td colSpan={3}>
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
                  </td>
                  <td className="macro">{formatMacro(totals.carbs / divisionCount)}</td>
                  <td className="macro">{formatMacro(totals.protein / divisionCount)}</td>
                  <td className="macro">{formatMacro(totals.fat / divisionCount)}</td>
                </tr>
              </>
            )}
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
              <td className="macro">{formatMacro((multigrainRiceAmount * 28.5) / 100)}</td>
              <td className="macro">{formatMacro((multigrainRiceAmount * 3.1) / 100)}</td>
              <td className="macro">{formatMacro((multigrainRiceAmount * 0.8) / 100)}</td>
              {isEditing && <td className="edit-inline__order-cell edit-inline__delete-cell"></td>}
            </tr>
            {isEditing && (
              <tr className="recipe-table__division-row">
                <td colSpan={8} style={{ textAlign: 'center' }}>
                  <button type="button" className="add-food-btn" onClick={() => setIsAddModalOpen(true)}>
                    + {language === 'ko' ? '식재료 추가하기' : 'Add ingredient'}
                  </button>
                </td>
              </tr>
            )}
            <tr className="recipe-table__total">
              <td colSpan={3}>
                <strong>{t.combinedTotal}</strong>
              </td>
              {(() => {
                const carbs = totals.carbs / divisionCount + (multigrainRiceAmount * 28.5) / 100
                const protein = totals.protein / divisionCount + (multigrainRiceAmount * 3.1) / 100
                const fat = totals.fat / divisionCount + (multigrainRiceAmount * 0.8) / 100
                return (
                  <>
                    <td className="macro"><strong style={{ color: macroColor(carbs, recommended.carbs) }}>{formatMacro(carbs)}</strong></td>
                    <td className="macro"><strong style={{ color: macroColor(protein, recommended.protein) }}>{formatMacro(protein)}</strong></td>
                    <td className="macro"><strong style={{ color: macroColor(fat, recommended.fat) }}>{formatMacro(fat)}</strong></td>
                    {isEditing && <td className="edit-inline__order-cell edit-inline__delete-cell"></td>}
                  </>
                )
              })()}
            </tr>
            <tr className="recipe-table__recommended">
              <td colSpan={3}>
                <strong>{t.recommendedPerMeal}</strong>
              </td>
              <td className="macro"><strong>77.0</strong></td>
              <td className="macro"><strong>33.0</strong></td>
              <td className="macro"><strong>22.0</strong></td>
              {isEditing && <td className="edit-inline__order-cell edit-inline__delete-cell"></td>}
            </tr>
          </tfoot>
        </table>
      </TableContainer>

      <IngredientSearchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onIngredientSelect={(ingredient) => handleAddIngredient(ingredient.id)}
        existingIngredientIds={new Set(editItems.map((i) => i.ingredientId))}
      />

      {(isEditing || activeRecipe.memo) && (
      <div className="recipe-memo">
        {isEditing ? (
          <textarea
            className="recipe-memo__textarea"
            value={editMemo}
            onChange={(e) => setEditMemo(e.target.value)}
            placeholder="메모를 입력하세요..."
            rows={3}
          />
        ) : (
          <p className="recipe-memo__text">{activeRecipe.memo}</p>
        )}
      </div>
      )}
    </section>
  )
}
