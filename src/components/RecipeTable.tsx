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
import { Modal } from './Modal'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { Recipe, RecipeItem, RecipeRowState } from '../types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UnitSelect } from './UnitSelect'
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
  onDeleteRecipe?: (id: string) => void
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
  onDeleteRecipe,
}: RecipeTableProps) {
  const MULTIGRAIN_ID = '__multigrain_rice__'

  const { language, t } = useLanguage()
  const { isAdmin } = useAdmin()
  const [localRecipe, setLocalRecipe] = useState(recipe)
  const activeRecipe = localRecipe
  const [isEditing, setIsEditing] = useState(false)
  const [editImageUrl, setEditImageUrl] = useState(activeRecipe.imageUrl)
  const [editLink, setEditLink] = useState(activeRecipe.link ?? '')
  const [editItems, setEditItems] = useState<RecipeItem[]>(activeRecipe.items)
  const [editSideItems, setEditSideItems] = useState<RecipeItem[]>([])
  const [editMemo, setEditMemo] = useState(activeRecipe.memo ?? '')
  const [editTasteRating, setEditTasteRating] = useState(activeRecipe.tasteRating ?? 4)
  const [editName, setEditName] = useState(activeRecipe.name)
  const [editNameKo, setEditNameKo] = useState(activeRecipe.nameKo)
  const [isCollapsed, setIsCollapsed] = useState(recipe.hidden ?? false)
  const [divisionInput, setDivisionInput] = useState(String(activeRecipe.divisionCount ?? divisionCount))
  const parsedDivisionInput = Number.parseInt(divisionInput, 10)
  const effectiveDivision = !Number.isNaN(parsedDivisionInput) && parsedDivisionInput > 0 ? parsedDivisionInput : divisionCount
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddSideModalOpen, setIsAddSideModalOpen] = useState(false)
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null)
  const [replaceSide, setReplaceSide] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const dragItemIndex = useRef<number | null>(null)
  const dragSideItemIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragOverSideIndex, setDragOverSideIndex] = useState<number | null>(null)
  const [isGuestSaveModalOpen, setIsGuestSaveModalOpen] = useState(false)
  const [isRecommendedInfoOpen, setIsRecommendedInfoOpen] = useState(false)
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set())
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isEditing) return
    function handleMouseDown(e: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        setShowCancelConfirm(true)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isEditing])

  function startEditing() {
    if (isEditing) return
    setEditImageUrl(activeRecipe.imageUrl)
    setEditLink(activeRecipe.link ?? '')
    const regularItems = activeRecipe.items.map((item) => {
      const row = rows?.find((r) => r.ingredientId === item.ingredientId)
      return row ? { ...item, defaultAmount: row.amount, defaultUnit: row.unit } : item
    })
    setEditItems(regularItems)
    setEditSideItems(activeRecipe.sideItems ?? [])
    setEditMemo(activeRecipe.memo ?? '')
    setEditTasteRating(activeRecipe.tasteRating ?? 4)
    setDivisionInput(String(activeRecipe.divisionCount ?? divisionCount))
    setNewlyAddedIds(new Set())
    setIsEditing(true)
  }

  function handleCancel() {
    setDivisionInput(String(activeRecipe.divisionCount ?? divisionCount))
    setNewlyAddedIds(new Set())
    setIsEditing(false)
  }

  function handleSave() {
    const riceItem = editSideItems.find((i) => i.ingredientId === MULTIGRAIN_ID)
    if (riceItem) {
      onMultigrainRiceAmountChange(riceItem.defaultAmount)
      onMultigrainRiceUnitChange(riceItem.defaultUnit)
    }
    const parsedDivision = Number.parseInt(divisionInput, 10)
    const validDivision = !Number.isNaN(parsedDivision) && parsedDivision > 0 ? parsedDivision : divisionCount
    onDivisionCountChange(validDivision)
    const updated = { ...activeRecipe, name: editName.trim() || activeRecipe.name, nameKo: editNameKo.trim() || activeRecipe.nameKo, imageUrl: editImageUrl, link: editLink, items: editItems, sideItems: editSideItems, memo: editMemo, tasteRating: editTasteRating, divisionCount: validDivision }
    setLocalRecipe(updated)
    if (isAdmin) {
      onSaveRecipe(updated)
    } else {
      setIsGuestSaveModalOpen(true)
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

  function handleReplaceIngredient(ingredientId: string) {
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    if (replaceSide) {
      setEditSideItems((prev) => prev.map((item, i) => {
        if (i !== replaceTargetIndex) return item
        const unit = ing.allowedUnits.includes(item.defaultUnit) ? item.defaultUnit : ing.allowedUnits[0]
        return { ...item, ingredientId, defaultUnit: unit }
      }))
    } else {
      setEditItems((prev) => prev.map((item, i) => {
        if (i !== replaceTargetIndex) return item
        const unit = ing.allowedUnits.includes(item.defaultUnit) ? item.defaultUnit : ing.allowedUnits[0]
        return { ...item, ingredientId, defaultUnit: unit }
      }))
    }
    setReplaceTargetIndex(null)
  }

  function handleAddSideIngredient(ingredientId: string) {
    if (editSideItems.some((item) => item.ingredientId === ingredientId)) return
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    setEditSideItems((prev) => [...prev, { ingredientId, defaultAmount: 100, defaultUnit: ing.allowedUnits[0] }])
  }

  function handleSideAmountChange(index: number, value: string) {
    const parsed = value === '' ? 0 : Number.parseFloat(value)
    if (Number.isNaN(parsed) || parsed < 0) return
    setEditSideItems((prev) => prev.map((item, i) => i === index ? { ...item, defaultAmount: parsed } : item))
  }

  function handleSideUnitChange(index: number, unit: string) {
    setEditSideItems((prev) => prev.map((item, i) => i === index ? { ...item, defaultUnit: unit } : item))
  }

  function handleDeleteSideItem(index: number) {
    setEditSideItems((prev) => prev.filter((_, i) => i !== index))
  }


  const recommended = { carbs: 75, protein: 33, fat: 22 }

  function macroColor(value: number, target: number): string {
    const diff = Math.abs(value - target)
    if (diff >= 10) return '#dc2626'
    if (diff >= 5) return '#ea580c'
    return '#16a34a'
  }

  const totals = (isEditing ? editItems : rows).reduce(
    (acc, item) => {
      const ingredient = ingredientById.get(item.ingredientId)
      if (!ingredient) return acc
      const amount = isEditing ? (item as typeof editItems[0]).defaultAmount : (item as typeof rows[0]).amount
      const unit = isEditing ? (item as typeof editItems[0]).defaultUnit : (item as typeof rows[0]).unit
      const grams = amountToGrams(amount, unit, ingredient.conversions)
      const macros = calculateMacros(grams, ingredient)
      return {
        carbs: acc.carbs + macros.carbs,
        protein: acc.protein + macros.protein,
        fat: acc.fat + macros.fat,
      }
    },
    { carbs: 0, protein: 0, fat: 0 },
  )

  function computeSideMacros(item: RecipeItem): { carbs: number; protein: number; fat: number } {
    if (item.ingredientId === MULTIGRAIN_ID) {
      const g = item.defaultUnit === 'oz' ? item.defaultAmount * 28.3495 : item.defaultAmount
      return { carbs: (g * 28.5) / 100, protein: (g * 3.1) / 100, fat: (g * 0.8) / 100 }
    }
    const ing = ingredientById.get(item.ingredientId)
    if (!ing) return { carbs: 0, protein: 0, fat: 0 }
    const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ing.conversions)
    return calculateMacros(grams, ing)
  }

  const activeSideItems = isEditing
    ? editSideItems
    : (activeRecipe.sideItems ?? [])
  const sideTotals = activeSideItems.reduce(
    (acc, item) => {
      const m = computeSideMacros(item)
      return { carbs: acc.carbs + m.carbs, protein: acc.protein + m.protein, fat: acc.fat + m.fat }
    },
    { carbs: 0, protein: 0, fat: 0 },
  )



  return (
    <section className="recipe-block" ref={sectionRef} id={recipe.id}>
      <div className="recipe-block__heading-row">
        <div className="recipe-block__title-group">
          {isAdmin && <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`recipe-block__collapse-btn${isCollapsed ? ' recipe-block__collapse-btn--hidden' : ''}`}
            onClick={() => {
              const next = !isCollapsed
              setIsCollapsed(next)
              onSaveRecipe({ ...localRecipe, hidden: next })
            }}
            aria-label={isCollapsed ? (language === 'ko' ? '펼치기' : 'Expand') : (language === 'ko' ? '접기' : 'Collapse')}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </Button>}
          {isEditing ? (
            <div className="recipe-block__title-edit">
              <Input
                value={editNameKo}
                onChange={(e) => setEditNameKo(e.target.value)}
                placeholder="한글 이름"
              />
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="English name"
              />
            </div>
          ) : (
            <h2 className="recipe-block__heading">
              {getRecipeDisplayName(activeRecipe, language)}
            </h2>
          )}
          <div className="recipe-block__ratings">
            <StarRating
              label={language === 'ko' ? '맛' : 'Taste'}
              value={isEditing ? editTasteRating : (activeRecipe.tasteRating ?? 4)}
              onChange={isEditing ? setEditTasteRating : undefined}
            />
            {activeRecipe.link && (
              <a className="recipe-block__link-icon" href={activeRecipe.link} target="_blank" rel="noopener noreferrer" aria-label="Recipe link">
                🔗
              </a>
            )}
            {isAdmin && onDeleteRecipe && !isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="recipe-block__delete-btn"
                onClick={() => {
                  const msg = language === 'ko'
                    ? `'${getRecipeDisplayName(activeRecipe, language)}' 레시피를 삭제하시겠습니까?\n삭제된 레시피는 복구할 수 없습니다.`
                    : `Delete '${getRecipeDisplayName(activeRecipe, language)}'?\nThis action cannot be undone.`
                  if (window.confirm(msg)) onDeleteRecipe(activeRecipe.id)
                }}
              >
                {language === 'ko' ? '삭제' : 'Delete'}
              </Button>
            )}
            {!isEditing && (
              <Button type="button" variant="ghost" size="icon-sm" className="recipe-block__edit-btn--inline" onClick={startEditing}>
                ✏️
              </Button>
            )}
          </div>
        </div>
        <div className="recipe-block__edit-actions">
          {isEditing && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                {language === 'ko' ? '취소' : 'Cancel'}
              </Button>
              <Button type="button" size="sm" onClick={handleSave}>
                {language === 'ko' ? '저장' : 'Save'}
              </Button>
            </>
          )}
          {!isEditing && (
            <Button type="button" variant="ghost" size="icon-sm" className="recipe-block__edit-btn--corner" onClick={startEditing}>
              ✏️
            </Button>
          )}
        </div>
      </div>

      {!isCollapsed && isEditing && (
        <div className="edit-inline__link-field">
          <label className="edit-inline__link-label">
            {language === 'ko' ? '링크' : 'Link'}
          </label>
          <Input
            type="url"
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      {!isCollapsed && <Table className="data-table recipe-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t.colIngredient}</TableHead>
            <TableHead>{t.colAmount}</TableHead>
            <TableHead>{t.colUnit}</TableHead>
            <TableHead>{t.colCarbs}</TableHead>
            <TableHead>{t.colProtein}</TableHead>
            <TableHead>{t.colFat}</TableHead>
            {isEditing && <TableHead className="edit-inline__order-cell"></TableHead>}
            {isEditing && <TableHead className="edit-inline__delete-cell"></TableHead>}
            {isEditing && (
              <TableHead className="edit-inline__delete-cell">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={language === 'ko' ? '전체 삭제' : 'Delete all'}
                  onClick={() => { setEditItems([]); setEditSideItems([]) }}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >✕</Button>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
            {isEditing ? (
              editItems.map((item, index) => {
                const ingredient = ingredientById.get(item.ingredientId)
                if (!ingredient) return null
                const isNew = newlyAddedIds.has(item.ingredientId)
                const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ingredient.conversions)
                const macros = calculateMacros(grams, ingredient)
                return (
                  <TableRow key={item.ingredientId} className={isNew ? 'edit-row--new' : ''}>
                    <TableCell
                      className={`edit-inline__order-cell edit-inline__drag-handle${dragOverIndex === index ? ' edit-inline__drag-over' : ''}`}
                      draggable
                      onDragStart={() => { dragItemIndex.current = index }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => {
                        if (dragItemIndex.current === null || dragItemIndex.current === index) { setDragOverIndex(null); return }
                        setEditItems((prev) => {
                          const next = [...prev]
                          const [moved] = next.splice(dragItemIndex.current!, 1)
                          next.splice(index, 0, moved)
                          return next
                        })
                        dragItemIndex.current = null
                        setDragOverIndex(null)
                      }}
                      onDragEnd={() => { dragItemIndex.current = null; setDragOverIndex(null) }}
                      aria-label="Drag to reorder"
                    >⠿</TableCell>
                    <TableCell
                      className="edit-inline__replace-cell"
                      style={{ fontWeight: isNew ? 700 : undefined }}
                      onClick={() => { setReplaceSide(false); setReplaceTargetIndex(index) }}
                      title={language === 'ko' ? '클릭하여 식재료 교체' : 'Click to replace ingredient'}
                    >
                      {getIngredientDisplayName(ingredient, language)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={item.defaultAmount}
                        onChange={(e) => handleEditAmountChange(index, e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <UnitSelect
                        value={item.defaultUnit}
                        onValueChange={(v) => handleEditUnitChange(index, v)}
                        language={language}
                      />
                    </TableCell>
                    <TableCell>{formatMacro(macros.carbs)}</TableCell>
                    <TableCell>{formatMacro(macros.protein)}</TableCell>
                    <TableCell>{formatMacro(macros.fat)}</TableCell>
                    <TableCell className="edit-inline__delete-cell">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteItem(index)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        ✕
                      </Button>
                    </TableCell>
                  </TableRow>
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
                  <TableRow
                    key={row.ingredientId}
                    className={isMatch ? 'recipe-table__row--match' : undefined}
                  >
                    <TableCell>{getIngredientDisplayName(ingredient, language)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={formatAmount(row.amount)}
                        onFocus={startEditing}
                        onChange={(event) =>
                          onAmountChange(row.ingredientId, event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <UnitSelect
                        value={row.unit}
                        onValueChange={(v) => { startEditing(); onUnitChange(row.ingredientId, v) }}
                        language={language}
                      />
                    </TableCell>
                    <TableCell>{formatMacro(macros.carbs)}</TableCell>
                    <TableCell>{formatMacro(macros.protein)}</TableCell>
                    <TableCell>{formatMacro(macros.fat)}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="recipe-table__total recipe-table__muted">
              <TableCell colSpan={3}>
                {t.total}
              </TableCell>
              <TableCell className="macro">{formatMacro(totals.carbs)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.protein)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.fat)}</TableCell>
              {isEditing && <TableCell className="edit-inline__order-cell edit-inline__delete-cell"></TableCell>}
              {isEditing && <TableCell className="edit-inline__order-cell edit-inline__delete-cell"></TableCell>}
            </TableRow>
            <TableRow className="recipe-table__division-row recipe-table__muted">
              <TableCell colSpan={3}>
                {language === 'en' ? (
                  <>
                    {t.divideByMeals}{' '}
                    <Input
                      type="number"
                      className="h-7 w-16 text-sm inline-block"
                      min={1}
                      step="1"
                      value={divisionInput}
                      onFocus={startEditing}
                      onChange={(event) => {
                        setDivisionInput(event.target.value)
                        if (!isEditing) {
                          const value = Number.parseInt(event.target.value, 10)
                          if (!Number.isNaN(value) && value > 0) {
                            onDivisionCountChange(value)
                          }
                        }
                      }}
                      onBlur={() => {
                        const value = Number.parseInt(divisionInput, 10)
                        if (Number.isNaN(value) || value <= 0) {
                          setDivisionInput(String(divisionCount))
                        }
                      }}
                    />{' '}
                    {t.meals}
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      className="h-7 w-16 text-sm inline-block"
                      min={1}
                      step="1"
                      value={divisionInput}
                      onFocus={startEditing}
                      onChange={(event) => {
                        setDivisionInput(event.target.value)
                        if (!isEditing) {
                          const value = Number.parseInt(event.target.value, 10)
                          if (!Number.isNaN(value) && value > 0) {
                            onDivisionCountChange(value)
                          }
                        }
                      }}
                      onBlur={() => {
                        const value = Number.parseInt(divisionInput, 10)
                        if (Number.isNaN(value) || value <= 0) {
                          setDivisionInput(String(divisionCount))
                        }
                      }}
                    />{' '}
                    {t.divideByMeals}
                  </>
                )}
              </TableCell>
              <TableCell className="macro">{formatMacro(totals.carbs / effectiveDivision)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.protein / effectiveDivision)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.fat / effectiveDivision)}</TableCell>
              {isEditing && <TableCell className="edit-inline__order-cell edit-inline__delete-cell"></TableCell>}
              {isEditing && <TableCell className="edit-inline__order-cell edit-inline__delete-cell"></TableCell>}
            </TableRow>
            {activeSideItems.map((item, index) => {
              const isRice = item.ingredientId === MULTIGRAIN_ID
              const ing = isRice ? null : ingredientById.get(item.ingredientId)
              if (!isRice && !ing) return null
              const macros = computeSideMacros(item)
              return (
                <TableRow key={item.ingredientId} className="recipe-table__multigrain-row">
                  {isEditing && (
                    <TableCell
                      className={`edit-inline__order-cell edit-inline__drag-handle${dragOverSideIndex === index ? ' edit-inline__drag-over' : ''}`}
                      draggable
                      onDragStart={() => { dragSideItemIndex.current = index }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSideIndex(index) }}
                      onDragLeave={() => setDragOverSideIndex(null)}
                      onDrop={() => {
                        if (dragSideItemIndex.current === null || dragSideItemIndex.current === index) { setDragOverSideIndex(null); return }
                        setEditSideItems((prev) => {
                          const next = [...prev]
                          const [moved] = next.splice(dragSideItemIndex.current!, 1)
                          next.splice(index, 0, moved)
                          return next
                        })
                        dragSideItemIndex.current = null
                        setDragOverSideIndex(null)
                      }}
                      onDragEnd={() => { dragSideItemIndex.current = null; setDragOverSideIndex(null) }}
                      aria-label="Drag to reorder"
                    >⠿</TableCell>
                  )}
                  <TableCell
                    className={!isRice && isEditing ? 'edit-inline__replace-cell' : undefined}
                    onClick={!isRice && isEditing ? () => { setReplaceSide(true); setReplaceTargetIndex(index) } : undefined}
                    title={!isRice && isEditing ? (language === 'ko' ? '클릭하여 식재료 교체' : 'Click to replace ingredient') : undefined}
                  >
                    {isRice
                      ? (language === 'ko' ? '잡곡밥 (쌀:잡곡=2:1)' : 'Multigrain rice (rice:grains=2:1)')
                      : getIngredientDisplayName(ing!, language)}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={item.defaultAmount}
                        onChange={(e) => handleSideAmountChange(index, e.target.value)}
                      />
                    ) : (
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={formatAmount(item.defaultAmount)}
                        onFocus={startEditing}
                        onChange={(e) => {
                          const parsed = e.target.value === '' ? 0 : Number.parseFloat(e.target.value)
                          if (!Number.isNaN(parsed) && parsed >= 0 && isRice) onMultigrainRiceAmountChange(parsed)
                        }}
                        readOnly={!isRice}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <UnitSelect
                        value={item.defaultUnit}
                        onValueChange={(v) => handleSideUnitChange(index, v)}
                        language={language}
                        riceOnly={isRice}
                      />
                    ) : (
                      <UnitSelect
                        value={item.defaultUnit}
                        onValueChange={(v) => { startEditing(); if (isRice) onMultigrainRiceUnitChange(v) }}
                        language={language}
                        riceOnly={isRice}
                      />
                    )}
                  </TableCell>
                  <TableCell className="macro">{formatMacro(macros.carbs)}</TableCell>
                  <TableCell className="macro">{formatMacro(macros.protein)}</TableCell>
                  <TableCell className="macro">{formatMacro(macros.fat)}</TableCell>
                  {isEditing && (
                    <TableCell className="edit-inline__delete-cell">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteSideItem(index)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >✕</Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
            {isEditing && !editSideItems.some((i) => i.ingredientId === MULTIGRAIN_ID) && (
              <TableRow className="recipe-table__multigrain-row">
                <TableCell colSpan={8}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground text-xs"
                    onClick={() => setEditSideItems((prev) => [...prev, { ingredientId: MULTIGRAIN_ID, defaultAmount: multigrainRiceAmount, defaultUnit: multigrainRiceUnit }])}
                  >
                    + {language === 'ko' ? '잡곡밥 추가' : 'Add multigrain rice'}
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {(() => {
              const carbs = totals.carbs / effectiveDivision + sideTotals.carbs
              const protein = totals.protein / effectiveDivision + sideTotals.protein
              const fat = totals.fat / effectiveDivision + sideTotals.fat
              const kcal = Math.round(carbs * 4 + protein * 4 + fat * 9)
              const dc = recommended.carbs - carbs
              const dp = recommended.protein - protein
              const df = recommended.fat - fat
              const fmt = (d: number) => d > 0 ? `(+${Math.round(d)})` : `(${Math.round(d)})`
              const show = (d: number) => Math.abs(d) > 3
              const renderCell = (value: number, target: number, delta: number) => {
                const color = macroColor(value, target)
                return (
                  <TableCell className="macro">
                    <strong style={{ color }}>{formatMacro(value)}</strong>
                    {show(delta) && <div style={{ color, fontSize: '0.75rem', lineHeight: 1.1 }}>{fmt(delta)}</div>}
                  </TableCell>
                )
              }
              return (
                <TableRow className="recipe-table__total">
                  <TableCell colSpan={3}>
                    <strong>{t.combinedTotal} <span className="recipe-table__kcal">(kcal: {kcal})</span></strong>
                  </TableCell>
                  {renderCell(carbs, recommended.carbs, dc)}
                  {renderCell(protein, recommended.protein, dp)}
                  {renderCell(fat, recommended.fat, df)}
                  {isEditing && <TableCell></TableCell>}
                  {isEditing && <TableCell></TableCell>}
                </TableRow>
              )
            })()}
            <TableRow className="recipe-table__recommended">
              <TableCell colSpan={3}>
                <strong>
                  {t.recommendedPerMeal}{' '}
                  <span className="recipe-table__kcal">(kcal: {Math.round(75 * 4 + 33 * 4 + 22 * 9)})</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="recipe-table__info-btn"
                    onClick={(e) => { e.stopPropagation(); setIsRecommendedInfoOpen(true) }}
                    aria-label={language === 'ko' ? '기준 정보' : 'Reference info'}
                  >ⓘ</Button>
                </strong>
              </TableCell>
              <TableCell className="macro"><strong>75.0</strong></TableCell>
              <TableCell className="macro"><strong>33.0</strong></TableCell>
              <TableCell className="macro"><strong>22.0</strong></TableCell>
              {isEditing && <TableCell></TableCell>}
              {isEditing && <TableCell></TableCell>}
            </TableRow>
          </TableFooter>
        </Table>}

      <IngredientSearchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onIngredientSelect={(ingredient) => handleAddIngredient(ingredient.id)}
        existingIngredientIds={new Set(editItems.map((i) => i.ingredientId))}
      />
      <IngredientSearchModal
        isOpen={isAddSideModalOpen}
        onClose={() => setIsAddSideModalOpen(false)}
        onIngredientSelect={(ingredient) => handleAddSideIngredient(ingredient.id)}
        existingIngredientIds={new Set(editSideItems.map((i) => i.ingredientId))}
      />
      <IngredientSearchModal
        isOpen={replaceTargetIndex !== null}
        onClose={() => setReplaceTargetIndex(null)}
        onIngredientSelect={(ingredient) => handleReplaceIngredient(ingredient.id)}
        title={language === 'ko' ? '식재료 교체하기' : 'Replace Ingredient'}
        existingIngredientIds={new Set(
          (replaceSide ? editSideItems : editItems)
            .filter((_, i) => i !== replaceTargetIndex)
            .map((i) => i.ingredientId)
        )}
      />

      <Modal
        isOpen={isGuestSaveModalOpen}
        onClose={() => setIsGuestSaveModalOpen(false)}
        message={language === 'ko'
          ? '로그인하지 않은 상태에서는 변경 사항이 저장되지 않습니다. 새로고침하면 원래대로 돌아갑니다.'
          : 'Changes are not saved unless you are logged in. Refreshing the page will revert them.'}
        actions={[{ label: language === 'ko' ? '확인' : 'OK', onClick: () => setIsGuestSaveModalOpen(false) }]}
      />

      <Modal
        isOpen={showCancelConfirm}
        message={language === 'ko' ? '계속 수정하시겠습니까?' : 'Do you want to continue editing?'}
        actions={[
          { label: language === 'ko' ? '계속 수정' : 'Keep editing', variant: 'ghost', onClick: () => setShowCancelConfirm(false) },
          { label: language === 'ko' ? '저장 안 하고 나가기' : 'Leave without saving', onClick: () => { setShowCancelConfirm(false); handleCancel() } },
        ]}
      />

      <Modal
        isOpen={isRecommendedInfoOpen}
        onClose={() => setIsRecommendedInfoOpen(false)}
        message={language === 'ko' ? '30~40대 한국인 여성 기준입니다.' : 'Based on Korean women in their 30s–40s.'}
        actions={[{ label: language === 'ko' ? '닫기' : 'Close', onClick: () => setIsRecommendedInfoOpen(false) }]}
      />

      {!isCollapsed && (isEditing || activeRecipe.memo) && (
        <div className="recipe-memo">
          {isEditing ? (
            <Textarea
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
      {!isCollapsed && (() => {
        const mealCarbs = totals.carbs / effectiveDivision + sideTotals.carbs
        const mealProtein = totals.protein / effectiveDivision + sideTotals.protein
        const mealFat = totals.fat / effectiveDivision + sideTotals.fat
        const REC = { carbs: 75, protein: 33, fat: 22 }
        const bars = [
          { label: language === 'ko' ? '탄수화물' : 'Carbs', value: mealCarbs, rec: REC.carbs },
          { label: language === 'ko' ? '단백질' : 'Protein', value: mealProtein, rec: REC.protein },
          { label: language === 'ko' ? '지방' : 'Fat', value: mealFat, rec: REC.fat },
        ]
        return (
          <div className="macro-chart">
            {bars.map(({ label, value, rec }) => {
              const pct = Math.min((value / rec) / 1.3 * 100, 100)
              const diff = Math.abs(value - rec)
              const color = diff >= 10 ? '#dc2626' : diff >= 5 ? '#ea580c' : '#16a34a'
              return (
                <div key={label} className="macro-chart__row">
                  <span className="macro-chart__label">{label}</span>
                  <div className="macro-chart__track">
                    <div className="macro-chart__bar" style={{ width: `${pct}%`, background: color }} />
                    <div className="macro-chart__rec-line" style={{ left: `${(100 / 130) * 100}%` }} />
                  </div>
                  <span className="macro-chart__value" style={{ color }}>
                    {formatMacro(value)}g / {rec}g
                  </span>
                </div>
              )
            })}
          </div>
        )
      })()}

      {!isCollapsed && isEditing && (
        <div className="edit-bottom-bar">
          <div className="edit-bottom-bar__add">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSideModalOpen(true)}>
              + {language === 'ko' ? '부재료 추가' : 'Add side ingredient'}
            </Button>
            <Button type="button" size="sm" onClick={() => setIsAddModalOpen(true)}>
              + {language === 'ko' ? '주재료 추가' : 'Add main ingredient'}
            </Button>
          </div>
          <div className="edit-bottom-bar__actions">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              {language === 'ko' ? '취소' : 'Cancel'}
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              {language === 'ko' ? '저장' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
