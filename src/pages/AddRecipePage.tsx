import { CookingGroupOrderEditor } from '../components/CookingGroupOrderEditor'
import { cookingGroupOrder } from '../utils/recipeCookingGroups'
import { MEAL_TARGET as RECOMMENDED } from '../constants/nutrition'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { saveRecipeToFirestore, loadRecipesFromFirestore, type FirestoreRecipe } from '../services/recipeService'
import {
  loadIngredientsFromFirestore,
  saveIngredientToFirestore,
  findIngredientByName,
  ingredientByName,
  type FirestoreIngredient,
} from '../services/ingredientService'
import { Toast, useToast } from '../components/feedback/Toast'
import { Modal } from '../components/Modal'
import { IngredientSearchModal } from '../components/IngredientSearchModal'
import { trackAddRecipeCompleted, trackIngredientSearchOpened } from '../utils/analytics'
import { ingredientById } from '../data/ingredientCache'
import { amountToGrams, calculateMacros } from '../utils/nutrition'
import type { Ingredient } from '../types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UnitSelect } from '../components/UnitSelect'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { recipeCategories, categoryEnglish, type RecipeCategory } from '../utils/recipeCategory'
import { formatTableNumber } from '../utils/numberFormatting'
import { missingDraftRecipeUnits } from '../utils/recipeUnitValidation'

type ParsedRow = {
  name: string
  amount: string
  unit: string
  carbs: string
  protein: string
  fat: string
}

type ResolvedRow = ParsedRow & {
  cookingGroup?: string
  ingredientId?: string
  isNew: boolean
  displayCarbs: number
  displayProtein: number
  displayFat: number
}

type EnRow = {
  nameEn: string
  amount: number
  unit: string
}

function scaledMacros(
  ing: FirestoreIngredient,
  inputAmount: number,
  inputUnit: string,
): { carbs: number; protein: number; fat: number } {
  const cached = ingredientById.get(ing.id)
  if (cached) return calculateMacros(amountToGrams(inputAmount, inputUnit, cached.conversions), cached)
  const OZ_TO_G = 28.3495
  let grams = inputAmount
  if (inputUnit === 'oz' && (ing.baseUnit === 'g' || ing.baseUnit === 'ml')) grams = inputAmount * OZ_TO_G
  else if (inputUnit === 'g' && ing.baseUnit === 'oz') grams = inputAmount / OZ_TO_G
  const baseGrams = ing.baseUnit === 'oz' ? ing.baseAmount * OZ_TO_G : ing.baseAmount
  const factor = baseGrams === 0 ? 0 : grams / baseGrams
  return {
    carbs: factor * ing.carbs,
    protein: factor * ing.protein,
    fat: factor * ing.fat,
  }
}

function fmt(n: number): string {
  return formatTableNumber(Math.round(n * 10) / 10, 1, 1)
}



function macroColor(value: number, target: number): string {
  const diff = Math.abs(value - target)
  if (diff >= 10) return '#dc2626'
  if (diff >= 5) return '#ea580c'
  return '#16a34a'
}

// 한국어 단위 → 영어(미국식) 단위
const KO_TO_EN_UNIT: Record<string, string> = {
  g: 'oz',
  ml: 'oz',
  '컵': 'cup',
  '개': 'each',
  '캔': 'can',
  '팩': 'pack',
  '꼬집': 'pinch',
  '줌': 'handful',
  T: 'tbsp',
  t: 'tsp',
  oz: 'oz',
  lbs: 'lbs',
}

function toEnUnit(unit: string): string {
  return KO_TO_EN_UNIT[unit] ?? unit
}

function toEnAmount(amount: number, unit: string): number {
  if (unit === 'g') return amount / 28.3495
  if (unit === 'ml') return amount / 29.5735
  return amount
}

async function translateKoToEn(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json()
    // Response structure: [[[translatedText, originalText, ...]]]
    return json?.[0]?.[0]?.[0] ?? text
  } catch {
    return text
  }
}

export function AddRecipePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const blendingTea = searchParams.get('category') === 'blending-tea'
  const { language } = useLanguage()
  const isKo = language === 'ko'


  const [recipeName, setRecipeName] = useState('')
  const [recipeNameKo, setRecipeNameKo] = useState('')
  const [recipeLink, setRecipeLink] = useState('')
  const [recipeImageUrl, setRecipeImageUrl] = useState('')
  const [categories, setCategories] = useState<RecipeCategory[]>(blendingTea ? ['차'] : [])
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [resolvedRows, setResolvedRows] = useState<ResolvedRow[]>([])
  const [enRows, setEnRows] = useState<EnRow[]>([])
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [divisionCount, setDivisionCount] = useState(4)
  const [divisionInput, setDivisionInput] = useState('4')
  const [sideRows, setSideRows] = useState<{ ingredientId: string; amount: number; unit: string }[]>([])
  const [unitErrors, setUnitErrors] = useState<Set<string>>(new Set())
  const [isAddMainModalOpen, setIsAddMainModalOpen] = useState(false)
  const [isAddSideModalOpen, setIsAddSideModalOpen] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameKoError, setNameKoError] = useState('')
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [savedRecipes, setSavedRecipes] = useState<FirestoreRecipe[]>([])
  const [showRecipeList, setShowRecipeList] = useState(false)
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const { toast, showToast, closeToast } = useToast()

  function handleRowAmountChange(index: number, value: string) {
    setResolvedRows((prev) => prev.map((row, i) => {
      if (i !== index) return row
      const updated = { ...row, amount: value }
      if (!updated.isNew && updated.ingredientId) {
        const found = findIngredientByName(updated.name)
        if (found) {
          const macros = scaledMacros(found, Number.parseFloat(value) || 0, updated.unit)
          updated.displayCarbs = macros.carbs
          updated.displayProtein = macros.protein
          updated.displayFat = macros.fat
        }
      }
      return updated
    }))
    // 영어 테이블 amount도 동기화
    setEnRows((prev) => prev.map((row, i) => {
      if (i !== index) return row
      const koUnit = resolvedRows[index]?.unit ?? 'g'
      return { ...row, amount: toEnAmount(Number.parseFloat(value) || 0, koUnit) }
    }))
  }

  function handleRowUnitChange(index: number, value: string) {
    setUnitErrors((prev) => { const next = new Set(prev); const row = resolvedRows[index]; if (row?.ingredientId) next.delete(`${row.ingredientId}\u0000${row.unit}`); return next })
    setResolvedRows((prev) => prev.map((row, i) => {
      if (i !== index) return row
      const updated = { ...row, unit: value }
      if (!updated.isNew && updated.ingredientId) {
        const found = findIngredientByName(updated.name)
        if (found) {
          const macros = scaledMacros(found, Number.parseFloat(updated.amount) || 0, value)
          updated.displayCarbs = macros.carbs
          updated.displayProtein = macros.protein
          updated.displayFat = macros.fat
        }
      }
      return updated
    }))
    setEnRows((prev) => prev.map((row, i) => {
      if (i !== index) return row
      const amount = Number.parseFloat(resolvedRows[index]?.amount ?? '0') || 0
      return { ...row, amount: toEnAmount(amount, value), unit: toEnUnit(value) }
    }))
  }

  function handleRowDelete(index: number) {
    setResolvedRows((prev) => prev.filter((_, i) => i !== index))
    setEnRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleRowNameChange(index: number, value: string) {
    setResolvedRows((prev) => prev.map((row, i) => i === index ? { ...row, name: value } : row))
    const nameEn = await translateKoToEn(value)
    setEnRows((prev) => prev.map((row, i) => i === index ? { ...row, nameEn } : row))
  }

  async function handleOpenRecipeList() {
    setLoadingRecipes(true)
    try {
      await loadIngredientsFromFirestore()
      const recipes = await loadRecipesFromFirestore()
      setSavedRecipes(recipes.filter((recipe) => !recipe.deleted))
      setShowRecipeList(true)
      setSelectedRecipeIds(new Set())
    } finally {
      setLoadingRecipes(false)
    }
  }

  function handleToggleRecipe(id: string) {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMergeRecipes() {
    const selected = savedRecipes.filter((r) => selectedRecipeIds.has(r.id ?? ''))
    const lineMap = new Map<string, { ingredientId: string; name: string; amount: number; unit: string; cookingGroup?: string }>()
    for (const recipe of selected) {
      for (const item of recipe.items) {
        const ing = [...ingredientByName.values()].find((v) => v.id === item.ingredientId)
        const name = ing ? ing.nameKo || ing.name : item.ingredientId
        const key = JSON.stringify([name, item.unit, item.cookingGroup ?? ''])
        const existing = lineMap.get(key)
        if (existing && existing.unit === item.unit) {
          existing.amount += item.amount
        } else {
          lineMap.set(key, { ingredientId: item.ingredientId, name, amount: item.amount, unit: item.unit, cookingGroup: item.cookingGroup })
        }
      }
    }
    setShowRecipeList(false)
    setSelectedRecipeIds(new Set())
    setNameError('')
    setNameKoError('')

      const rows: ResolvedRow[] = [...lineMap.values()].map((entry) => {
        const found = findIngredientByName(entry.name)
        const macros = found ? scaledMacros(found, entry.amount, entry.unit) : { carbs: 0, protein: 0, fat: 0 }
        return {
          name: entry.name,
          cookingGroup: entry.cookingGroup,
          amount: String(entry.amount),
          unit: entry.unit,
          carbs: String(macros.carbs),
          protein: String(macros.protein),
          fat: String(macros.fat),
          ingredientId: found?.id ?? entry.ingredientId,
          isNew: !found,
          displayCarbs: macros.carbs,
          displayProtein: macros.protein,
          displayFat: macros.fat,
        }
      })
      setResolvedRows(rows)
      setTranslating(true)
      const translations = await Promise.all(rows.map((row) => translateKoToEn(row.name)))
      setEnRows(rows.map((row, i) => ({
        nameEn: translations[i],
        amount: toEnAmount(Number.parseFloat(row.amount) || 0, row.unit),
        unit: toEnUnit(row.unit),
      })))
      setTranslating(false)
  }

  function handleAddMainIngredient(ingredient: Ingredient) {
    setUnitErrors((prev) => { const next = new Set(prev); for (const key of next) if (key.startsWith(`${ingredient.id}\u0000`)) next.delete(key); return next })
    setResolvedRows((prev) => [...prev, {
      name: ingredient.nameKo || ingredient.name,
      amount: String(ingredient.baseAmount),
      unit: ingredient.baseUnit,
      carbs: '',
      protein: '',
      fat: '',
      ingredientId: ingredient.id,
      isNew: false,
      displayCarbs: ingredient.carbs,
      displayProtein: ingredient.protein,
      displayFat: ingredient.fat,
    }])
    setEnRows((prev) => [...prev, { nameEn: ingredient.name, amount: ingredient.baseAmount, unit: ingredient.baseUnit }])
  }

  function handleAddSideIngredient(ingredient: Ingredient) {
    if (sideRows.some((r) => r.ingredientId === ingredient.id)) return
    setUnitErrors((prev) => { const next = new Set(prev); for (const key of next) if (key.startsWith(`${ingredient.id}\u0000`)) next.delete(key); return next })
    setSideRows((prev) => [...prev, { ingredientId: ingredient.id, amount: ingredient.baseAmount, unit: ingredient.baseUnit }])
  }

  async function handleSave() {
    setSaving(true)
    try {
      await loadIngredientsFromFirestore()
    } catch {
      // The save path will surface the Firestore error below.
    }
    const invalidUnits = missingDraftRecipeUnits([
      ...resolvedRows.map(row => ({ ingredientId: row.ingredientId ?? '', unit: row.unit || 'g', isNew: row.isNew, baseUnit: row.unit || 'g' })),
      ...sideRows.map(row => ({ ingredientId: row.ingredientId, unit: row.unit })),
    ])
    setUnitErrors(invalidUnits)
    if (invalidUnits.size) { setSaving(false); return }
    let hasNameError = false
    if (!recipeName.trim()) { setNameError(isKo ? '레시피 이름(영문)을 입력해주세요.' : 'Please enter a recipe name (EN).'); hasNameError = true } else setNameError('')
    if (!recipeNameKo.trim()) { setNameKoError(isKo ? '레시피 이름(한글)을 입력해주세요.' : 'Please enter a recipe name (KO).'); hasNameError = true } else setNameKoError('')
    if (hasNameError) { setSaving(false); return }
    if (!Number.isSafeInteger(Number(divisionInput)) || Number(divisionInput) < 1) {
      showToast(isKo ? '인분 수는 1 이상의 정수로 입력해 주세요.' : 'Enter a positive whole number of portions.', 'error')
      setSaving(false)
      return
    }
    if (recipeImageUrl.trim()) {
      try {
        if (!['http:', 'https:'].includes(new URL(recipeImageUrl.trim()).protocol)) throw new Error('Invalid image URL')
      } catch {
        showToast(isKo ? '이미지 링크는 http 또는 https URL로 입력해주세요.' : 'Enter an http or https image URL.', 'error')
        return
      }
    }
    if (resolvedRows.some((r) => r.isNew && (!r.carbs || !r.protein || !r.fat))) {
      showToast(isKo ? '새 식재료의 영양소를 입력해주세요.' : 'Enter nutrition for new ingredients.', 'error')
      return
    }
    try {
      const ingredientIds: string[] = []
      for (let i = 0; i < resolvedRows.length; i++) {
        const row = resolvedRows[i]
        if (!row.isNew && row.ingredientId) {
          ingredientIds.push(row.ingredientId)
        } else {
          const nameEn = enRows[i]?.nameEn || row.name
          const id = await saveIngredientToFirestore({
            name: nameEn,
            nameKo: row.name,
            baseAmount: Number.parseFloat(row.amount) || 100,
            baseUnit: row.unit || 'g',
            carbs: Number.parseFloat(row.carbs) || 0,
            protein: Number.parseFloat(row.protein) || 0,
            fat: Number.parseFloat(row.fat) || 0,
          })
          ingredientIds.push(id)
        }
      }

      const recipeId = await saveRecipeToFirestore({
        name: recipeName.trim(),
        nameKo: recipeNameKo.trim(),
        categories: categories.length ? categories : ['기타'],
        imageUrl: recipeImageUrl.trim(),
        link: recipeLink.trim(),
        memo: '',
        cookingGroupOrder: cookingGroupOrder(resolvedRows, groupOrder),
        tasteRating: 4,
        divisionCount,
        items: resolvedRows.map((row, i) => ({
          ingredientId: ingredientIds[i],
          amount: Number.parseFloat(row.amount) || 0,
          unit: row.unit || 'g',
          ...(row.cookingGroup?.trim() ? { cookingGroup: row.cookingGroup.trim() } : {}),
        })),
        sideItems: sideRows.map((row) => ({
          ingredientId: row.ingredientId,
          amount: row.amount,
          unit: row.unit,
        })),
      })

      trackAddRecipeCompleted('manual', recipeNameKo.trim())
      showToast(isKo ? '레시피가 저장되었습니다.' : 'Recipe saved!', 'success', {
        label: isKo ? '레시피 보기' : 'View recipe',
        onClick: () => navigate(`/recipe/${recipeId}`),
      })
      setRecipeName('')
      setRecipeNameKo('')
      setRecipeLink('')
      setRecipeImageUrl('')
      setCategories(blendingTea ? ['차'] : [])
      setResolvedRows([])
      setEnRows([])
    } catch (err) {
      console.error(err)
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? String(err.code)
        : ''
      if (code === 'recipe/missing-conversion') {
        const matched = new Set<string>()
        const detail = err instanceof Error ? err.message.toLocaleLowerCase() : ''
        const hasResolvableIngredient = [...resolvedRows.map(row => row.ingredientId ?? ''), ...sideRows.map(row => row.ingredientId)].some(id => ingredientById.has(id))
        for (const row of resolvedRows) {
          const id = row.ingredientId ?? ''
          const ingredient = ingredientById.get(id)
          const itemKey = `${id}\u0000${row.unit || 'g'}`
          const nameMatches = detail.includes(row.name.toLocaleLowerCase()) || Boolean(ingredient && detail.includes((ingredient.nameKo || ingredient.name).toLocaleLowerCase()))
          if (nameMatches || (ingredient && !ingredient.conversions[row.unit || 'g'])) matched.add(itemKey)
        }
        for (const row of sideRows) {
          const ingredient = ingredientById.get(row.ingredientId)
          const name = ingredient?.nameKo || ingredient?.name || row.ingredientId
          if (detail.includes(name.toLocaleLowerCase()) || (ingredient && !ingredient.conversions[row.unit])) matched.add(`${row.ingredientId}\u0000${row.unit}`)
        }
        // If the server reports an ID that is absent from the local catalog, point to all draft rows
        // so the user still gets an actionable inline warning instead of a toast only.
        if (!matched.size && !hasResolvableIngredient) {
          for (const row of resolvedRows) matched.add(`${row.ingredientId ?? ''}\u0000${row.unit || 'g'}`)
          for (const row of sideRows) matched.add(`${row.ingredientId}\u0000${row.unit}`)
        }
        if (matched.size) setUnitErrors(matched)
      }
      const message = code === 'recipe/missing-conversion' && err instanceof Error
        ? err.message
        : code === 'permission-denied'
        ? (isKo
            ? 'Firestore 쓰기 권한이 없습니다. 관리자 이메일과 Firestore 보안 규칙을 확인해주세요.'
            : 'Firestore denied the write. Check the administrator email and Firestore security rules.')
        : (isKo ? `저장 실패${code ? ` (${code})` : ''}. 다시 시도해주세요.` : `Save failed${code ? ` (${code})` : ''}. Try again.`)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const totals = resolvedRows.reduce(
    (acc, row) => ({
      carbs: acc.carbs + row.displayCarbs,
      protein: acc.protein + row.displayProtein,
      fat: acc.fat + row.displayFat,
    }),
    { carbs: 0, protein: 0, fat: 0 },
  )

  const perMeal = {
    carbs: totals.carbs / divisionCount,
    protein: totals.protein / divisionCount,
    fat: totals.fat / divisionCount,
  }

  function tfoot(lang: 'ko' | 'en') {
    const isKoTable = lang === 'ko'
    return (
      <TableFooter>
        <TableRow className="recipe-table__total recipe-table__muted">
          <TableCell colSpan={3}>{isKoTable ? '합계' : 'Total'}</TableCell>
          <TableCell className="macro">{fmt(totals.carbs)}</TableCell>
          <TableCell className="macro">{fmt(totals.protein)}</TableCell>
          <TableCell className="macro">{fmt(totals.fat)}</TableCell>
          <TableCell />
        </TableRow>
        <TableRow className="recipe-table__division-row">
          <TableCell colSpan={3}>
            {isKoTable ? (
              <><Input type="number" aria-label="인분 수" className="h-7 w-16 text-sm inline-flex" min={1} step={1} value={divisionInput}
                onChange={(e) => {
                  const value = e.target.value
                  setDivisionInput(value)
                  const parsed = Number(value)
                  if (Number.isSafeInteger(parsed) && parsed > 0) setDivisionCount(parsed)
                }}
                onBlur={() => setDivisionInput(String(divisionCount))}
              />{' '}끼로 나누기</>
            ) : (
              <>Divide into {divisionCount} meals</>
            )}
          </TableCell>
          <TableCell className="macro">{fmt(totals.carbs / divisionCount)}</TableCell>
          <TableCell className="macro">{fmt(totals.protein / divisionCount)}</TableCell>
          <TableCell className="macro">{fmt(totals.fat / divisionCount)}</TableCell>
          <TableCell />
        </TableRow>
        {sideRows.map((row) => {
          const ing = ingredientById.get(row.ingredientId)
          if (!ing) return null
          const carbsPer100 = ing.carbs / ing.baseAmount * 100
          const sideCarbs = (row.amount * carbsPer100) / 100
          const sideProtein = (row.amount * ing.protein / ing.baseAmount * 100) / 100
          const sideFat = (row.amount * ing.fat / ing.baseAmount * 100) / 100
          return (
            <TableRow key={row.ingredientId} className="recipe-table__multigrain-row">
              <TableCell>{isKoTable ? (ing.nameKo || ing.name) : ing.name}{unitErrors.has(`${row.ingredientId}\u0000${row.unit}`) && <p role="alert" className="add-recipe__field-error">{isKoTable ? `${ing.nameKo || ing.name} (${row.unit}): 단위 환산 정보가 없습니다. 환산 정보를 등록하거나 다른 단위를 선택해 주세요.` : `${ing.name} (${row.unit}): No unit conversion is available. Register a conversion or choose another unit.`}</p>}</TableCell>
              <TableCell>
                <Input type="number" className="h-7 w-20 text-sm" min={0} step={1}
                  value={row.amount}
                  onChange={(e) => { const v = Number.parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0) setSideRows((prev) => prev.map((r) => r.ingredientId === row.ingredientId ? { ...r, amount: v } : r)) }} />
              </TableCell>
              <TableCell>
                <UnitSelect ingredientId={row.ingredientId}
                  value={row.unit}
                  onValueChange={(v) => setSideRows((prev) => prev.map((r) => r.ingredientId === row.ingredientId ? { ...r, unit: v } : r))}
                  language={isKoTable ? 'ko' : 'en'}
                  options={ing.allowedUnits ?? [ing.baseUnit]}
                />
              </TableCell>
              <TableCell className="macro">{fmt(sideCarbs)}</TableCell>
              <TableCell className="macro">{fmt(sideProtein)}</TableCell>
              <TableCell className="macro">{fmt(sideFat)}</TableCell>
              <TableCell className="edit-inline__delete-cell">
                <Button type="button" variant="ghost" size="icon-sm"
                  className="text-muted-foreground  "
                  onClick={() => setSideRows((prev) => prev.filter((r) => r.ingredientId !== row.ingredientId))}>✕</Button>
              </TableCell>
            </TableRow>
          )
        })}
        {(() => {
          const sideTotals = sideRows.reduce((acc, row) => {
            const ing = ingredientById.get(row.ingredientId)
            if (!ing) return acc
            return {
              carbs: acc.carbs + (row.amount * ing.carbs / ing.baseAmount),
              protein: acc.protein + (row.amount * ing.protein / ing.baseAmount),
              fat: acc.fat + (row.amount * ing.fat / ing.baseAmount),
            }
          }, { carbs: 0, protein: 0, fat: 0 })
          const combined = {
            carbs: perMeal.carbs + sideTotals.carbs,
            protein: perMeal.protein + sideTotals.protein,
            fat: perMeal.fat + sideTotals.fat,
          }
          return (
            <TableRow className="recipe-table__total">
              <TableCell colSpan={3}><strong>{isKoTable ? '1끼 합계' : 'Per meal'}</strong></TableCell>
              <TableCell className="macro"><strong style={{ color: macroColor(combined.carbs, RECOMMENDED.carbs) }}>{fmt(combined.carbs)}</strong></TableCell>
              <TableCell className="macro"><strong style={{ color: macroColor(combined.protein, RECOMMENDED.protein) }}>{fmt(combined.protein)}</strong></TableCell>
              <TableCell className="macro"><strong style={{ color: macroColor(combined.fat, RECOMMENDED.fat) }}>{fmt(combined.fat)}</strong></TableCell>
              <TableCell />
            </TableRow>
          )
        })()}
        <TableRow className="recipe-table__recommended">
          <TableCell colSpan={3}><strong>{isKoTable ? '한끼 권장량' : 'Recommended per meal'}</strong></TableCell>
          <TableCell className="macro"><strong>{fmt(RECOMMENDED.carbs)}</strong></TableCell>
          <TableCell className="macro"><strong>{fmt(RECOMMENDED.protein)}</strong></TableCell>
          <TableCell className="macro"><strong>{fmt(RECOMMENDED.fat)}</strong></TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    )
  }

  return (
    <section className="page">
      <Button type="button" variant="ghost" size="sm" onClick={() => navigate(blendingTea ? '/blending-tea' : '/recipes')}>{isKo ? '← 뒤로' : '← Back'}</Button>
      <h2 className="page__heading">{isKo ? '레시피 추가' : 'Add Recipe'}</h2>
      <div className="add-recipe__preview">
          <div className="recipe-block__title-edit" style={{ marginBottom: '1rem' }}>
            <Input
              value={recipeNameKo}
              onChange={(e) => { setRecipeNameKo(e.target.value); setNameKoError('') }}
              placeholder="한글 이름"
            />
            <Input
              value={recipeName}
              onChange={(e) => { setRecipeName(e.target.value); setNameError('') }}
              placeholder="English name"
            />
            {nameKoError && <p className="add-recipe__field-error">{nameKoError}</p>}
            {nameError && <p className="add-recipe__field-error">{nameError}</p>}
          </div>

          <fieldset className="mb-4 min-w-0" disabled={saving}>
            <legend className="mb-2 text-sm font-medium">{isKo ? '태그 (여러 개 선택 가능)' : 'Tags (select multiple)'}</legend>
            <div className="flex flex-wrap gap-2">
              {recipeCategories.filter(category => category !== '전체').map(category => (
                <Button key={category} type="button" variant="filter" size="compact"
                  aria-pressed={categories.includes(category)}
                  onClick={() => setCategories(current => current.includes(category) ? current.filter(value => value !== category) : [...current, category])}>
                  {isKo ? category : categoryEnglish[category]}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{isKo ? '선택하지 않으면 ‘기타’로 저장됩니다.' : 'Saved as “Other” if no tags are selected.'}</p>
          </fieldset>

          <div className="edit-inline__link-field">
            <label className="edit-inline__link-label">{isKo ? '링크 (선택)' : 'Link (optional)'}</label>
            <Input
              type="url"
              value={recipeLink}
              onChange={(e) => setRecipeLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="edit-inline__link-field">
            <label htmlFor="recipe-image-url" className="edit-inline__link-label">{isKo ? '이미지 링크 (선택)' : 'Image URL (optional)'}</label>
            <Input id="recipe-image-url" type="url" value={recipeImageUrl} onChange={(e) => setRecipeImageUrl(e.target.value)} placeholder="https://..." disabled={saving} />
          </div>

          <CookingGroupOrderEditor items={resolvedRows} order={groupOrder} onChange={setGroupOrder} ko={isKo} disabled={saving} />
          {(() => {
            const koTable = (first: boolean) => (
              <div style={first ? undefined : { marginTop: '2rem' }}>
                <div className="add-recipe__table-label-row">
                  <p className="add-recipe__table-label">🇰🇷 한국어</p>
                </div>
                <Table className="data-table recipe-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>식재료</TableHead>
                      <TableHead>양</TableHead>
                      <TableHead>단위</TableHead>
                      <TableHead>탄수화물</TableHead>
                      <TableHead>단백질</TableHead>
                      <TableHead>지방</TableHead>
                      <TableHead className="edit-inline__delete-cell">
                        <Button type="button" variant="ghost" size="icon-sm" title="전체 삭제" className="text-muted-foreground  " onClick={() => { setResolvedRows([]); setEnRows([]); setSideRows([]) }}>✕</Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedRows.map((row, i) => (
                      <TableRow key={i} style={{ background: row.isNew ? '#fffbeb' : undefined }}>
                        <TableCell>
                          <Input className="h-7 text-sm" value={row.name} onChange={(e) => handleRowNameChange(i, e.target.value)} />
                          <Input className="mt-2 cooking-group-input" aria-label={`${row.name} 요리 그룹`} placeholder="요리 그룹 (예: 양념장·반죽)" value={row.cookingGroup ?? ''} onChange={event => setResolvedRows(current => current.map((entry, index) => index === i ? { ...entry, cookingGroup: event.target.value } : entry))} />
                          {unitErrors.has(`${row.ingredientId ?? ''}\u0000${row.unit || 'g'}`) && <p role="alert" className="add-recipe__field-error">{isKo ? `${row.name} (${row.unit || 'g'}): 단위 환산 정보가 없습니다. 환산 정보를 등록하거나 다른 단위를 선택해 주세요.` : `${row.name} (${row.unit || 'g'}): No unit conversion is available. Register a conversion or choose another unit.`}</p>}
                          {row.isNew && <span style={{ display: 'block', fontSize: '14px', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>새 식재료</span>}
                        </TableCell>
                        <TableCell><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={row.amount} onChange={(e) => handleRowAmountChange(i, e.target.value)} /></TableCell>
                        <TableCell>
                          <UnitSelect ingredientId={row.ingredientId} value={row.unit} onValueChange={(v) => handleRowUnitChange(i, v)} language="ko" />
                        </TableCell>
                        <TableCell className="macro">{fmt(row.displayCarbs)}</TableCell>
                        <TableCell className="macro">{fmt(row.displayProtein)}</TableCell>
                        <TableCell className="macro">{fmt(row.displayFat)}</TableCell>
                        <TableCell className="edit-inline__delete-cell"><Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground  " onClick={() => handleRowDelete(i)}>✕</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {tfoot('ko')}
                </Table>
                {resolvedRows.some((r) => r.isNew) && (
                  <p style={{ fontSize: '14px', color: '#b45309', margin: '0.5rem 0 0' }}>
                    노란 배경 행은 새로운 식재료입니다. 저장 시 데이터베이스에 추가됩니다.
                  </p>
                )}
              </div>
            )

            const enTable = (first: boolean) => (
              <div style={first ? undefined : { marginTop: '2rem' }}>
                <div className="add-recipe__table-label-row">
                  <p className="add-recipe__table-label">🇺🇸 English</p>
                </div>
                {translating ? (
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Translating...</p>
                ) : (
                  <Table className="data-table recipe-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Carbs</TableHead>
                        <TableHead>Prot.</TableHead>
                        <TableHead>Fat</TableHead>
                        <TableHead className="edit-inline__delete-cell">
                          <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground " title="Delete all" onClick={() => { setResolvedRows([]); setEnRows([]); setSideRows([]) }}>✕</Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enRows.map((row, i) => (
                        <TableRow key={i} style={{ background: resolvedRows[i]?.isNew ? '#fffbeb' : undefined }}>
                          <TableCell>
                            <Input className="h-7 text-sm" value={row.nameEn} onChange={(e) => setEnRows((prev) => prev.map((r, j) => j === i ? { ...r, nameEn: e.target.value } : r))} />
                            <Input className="mt-2 cooking-group-input" aria-label={`${row.nameEn} cooking group`} placeholder="Cooking group (e.g. sauce)" value={resolvedRows[i]?.cookingGroup ?? ''} onChange={event => setResolvedRows(current => current.map((entry, index) => index === i ? { ...entry, cookingGroup: event.target.value } : entry))} />
                            {resolvedRows[i]?.isNew && <span style={{ display: 'block', fontSize: '14px', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>New</span>}
                          </TableCell>
                          <TableCell><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={row.amount.toFixed(1)} onChange={(e) => setEnRows((prev) => prev.map((r, j) => j === i ? { ...r, amount: Number.parseFloat(e.target.value) || 0 } : r))} /></TableCell>
                          <TableCell>
                            <UnitSelect ingredientId={resolvedRows[i]?.ingredientId} value={row.unit} onValueChange={(v) => setEnRows((prev) => prev.map((r, j) => j === i ? { ...r, unit: v } : r))} language="en" />
                          </TableCell>
                          <TableCell className="macro">{fmt(resolvedRows[i]?.displayCarbs ?? 0)}</TableCell>
                          <TableCell className="macro">{fmt(resolvedRows[i]?.displayProtein ?? 0)}</TableCell>
                          <TableCell className="macro">{fmt(resolvedRows[i]?.displayFat ?? 0)}</TableCell>
                          <TableCell className="edit-inline__delete-cell"><Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground  " onClick={() => handleRowDelete(i)}>✕</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    {tfoot('en')}
                  </Table>
                )}
              </div>
            )

            const bottomBar = (
              <div className="edit-bottom-bar">
                <div className="edit-bottom-bar__left">
                    <Button type="button" variant="outline" size="sm" onClick={handleOpenRecipeList} disabled={loadingRecipes}>
                      {loadingRecipes ? (isKo ? '불러오는 중...' : 'Loading...') : (isKo ? '기존 레시피 불러오기' : 'Load from existing')}
                    </Button>
                </div>
                <div className="edit-bottom-bar__add">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddSideModalOpen(true); trackIngredientSearchOpened('side') }}>
                    + {isKo ? '부재료 추가' : 'Add side ingredient'}
                  </Button>
                  <Button type="button" size="sm" onClick={() => { setIsAddMainModalOpen(true); trackIngredientSearchOpened('main') }}>
                    + {isKo ? '주재료 추가' : 'Add main ingredient'}
                  </Button>
                </div>
              </div>
            )

            return isKo
              ? <>{koTable(true)}{bottomBar}{enTable(false)}</>
              : <>{enTable(true)}{bottomBar}{koTable(false)}</>
          })()}

          <Button type="button" size="lg" onClick={handleSave} disabled={saving || translating} className="w-full mt-4">
            {saving ? (isKo ? '저장 중...' : 'Saving...') : (isKo ? '레시피 추가' : 'Add Recipe')}
          </Button>
        </div>

      <IngredientSearchModal
        isOpen={isAddMainModalOpen}
        onClose={() => setIsAddMainModalOpen(false)}
        onIngredientSelect={handleAddMainIngredient}
        existingIngredientIds={new Set(resolvedRows.map((r) => r.ingredientId).filter(Boolean) as string[])}
        multiSelect
        countSelection
      />
      <IngredientSearchModal
        isOpen={isAddSideModalOpen}
        onClose={() => setIsAddSideModalOpen(false)}
        onIngredientSelect={handleAddSideIngredient}
        existingIngredientIds={new Set(sideRows.map((r) => r.ingredientId))}
        multiSelect
      />

      <Modal
        isOpen={showRecipeList}
        onClose={() => setShowRecipeList(false)}
        title={isKo ? '기존 레시피 불러오기' : 'Load from existing recipes'}
        actions={[
          { label: isKo ? '취소' : 'Cancel', variant: 'ghost', onClick: () => setShowRecipeList(false) },
          {
            label: isKo ? `선택한 ${selectedRecipeIds.size}개 불러오기` : `Load ${selectedRecipeIds.size} selected`,
            variant: 'primary',
            onClick: () => { handleMergeRecipes() },
            disabled: selectedRecipeIds.size === 0,
          },
        ]}
      >
        <ul className="add-recipe__recipe-list" style={{ maxHeight: '320px', overflowY: 'auto', margin: '0.5rem 0' }}>
          {savedRecipes.map((r) => (
            <li key={r.id}>
              <label className="add-recipe__recipe-list-item">
                <input
                  type="checkbox"
                  checked={selectedRecipeIds.has(r.id ?? '')}
                  onChange={() => handleToggleRecipe(r.id ?? '')}
                />
                {r.nameKo || r.name}
              </label>
            </li>
          ))}
        </ul>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} onClose={closeToast} />}
    </section>
  )
}
