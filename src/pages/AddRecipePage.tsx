import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { saveRecipeToFirestore, loadRecipesFromFirestore, type FirestoreRecipe } from '../services/recipeService'
import {
  loadIngredientsFromFirestore,
  saveIngredientToFirestore,
  findIngredientByName,
  ingredientByName,
  type FirestoreIngredient,
} from '../services/ingredientService'
import { Toast, useToast } from '../components/Toast'
import { IngredientSearchModal } from '../components/IngredientSearchModal'
import { ingredientById } from '../data/ingredients'
import type { Ingredient } from '../types'

type ParsedRow = {
  name: string
  amount: string
  unit: string
  carbs: string
  protein: string
  fat: string
}

type ResolvedRow = ParsedRow & {
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

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase()
  if (lower === 'g' || lower === 'oz' || lower === 'ml') return lower
  return unit
}

function parseIngredientText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.includes(' / '))
    .map((line) => {
      const cols = line.split('/')
      return {
        name: cols[0]?.trim() ?? '',
        amount: cols[1]?.trim() ?? '',
        unit: normalizeUnit(cols[2]?.trim() ?? ''),
        carbs: cols[3]?.trim() ?? '',
        protein: cols[4]?.trim() ?? '',
        fat: cols[5]?.trim() ?? '',
      }
    })
    .filter((row) => row.name.length > 0)
}

function scaledMacros(
  ing: FirestoreIngredient,
  inputAmount: number,
  inputUnit: string,
): { carbs: number; protein: number; fat: number } {
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
  return (Math.round(n * 10) / 10).toFixed(1)
}

const RECOMMENDED = { carbs: 77, protein: 33, fat: 22 }

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
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const isKo = language === 'ko'

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])

  const [mode, setMode] = useState<'select' | 'sns' | 'manual'>('select')
  const [recipeName, setRecipeName] = useState('')
  const [recipeNameKo, setRecipeNameKo] = useState('')
  const [recipeLink, setRecipeLink] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [resolvedRows, setResolvedRows] = useState<ResolvedRow[]>([])
  const [enRows, setEnRows] = useState<EnRow[]>([])
  const [resolved, setResolved] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [divisionCount, setDivisionCount] = useState(4)
  const [sideRows, setSideRows] = useState<{ ingredientId: string; amount: number; unit: string }[]>([])
  const [isAddMainModalOpen, setIsAddMainModalOpen] = useState(false)
  const [isAddSideModalOpen, setIsAddSideModalOpen] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameKoError, setNameKoError] = useState('')
  const [dataError, setDataError] = useState('')
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [savedRecipes, setSavedRecipes] = useState<FirestoreRecipe[]>([])
  const [showRecipeList, setShowRecipeList] = useState(false)
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const { toast, showToast, closeToast } = useToast()

  useEffect(() => {
    if (mode === 'manual') setResolved(true)
  }, [mode])

  async function handleConfirm() {
    if (!pastedText.trim()) { setDataError(isKo ? '식재료 데이터를 입력해주세요.' : 'Please enter ingredient data.'); return }

    const parsed = parseIngredientText(pastedText)
    if (parsed.length === 0) { setDataError(isKo ? '파싱할 수 있는 데이터가 없습니다.' : 'No data could be parsed.'); return }

    const missingUnit = parsed.filter((r) => !r.unit)
    if (missingUnit.length > 0) {
      const names = missingUnit.map((r) => r.name).join(', ')
      setDataError(isKo ? `단위가 누락되었습니다: ${names}` : `Unit missing for: ${names}`)
      return
    }

    setConfirming(true)
    try {
      await loadIngredientsFromFirestore()

      const rows: ResolvedRow[] = parsed.map((row) => {
        const found = findIngredientByName(row.name)
        const inputAmount = Number.parseFloat(row.amount) || 0
        if (found) {
          const macros = scaledMacros(found, inputAmount, row.unit)
          return {
            ...row,
            ingredientId: found.id,
            isNew: false,
            displayCarbs: macros.carbs,
            displayProtein: macros.protein,
            displayFat: macros.fat,
          }
        }
        return {
          ...row,
          isNew: true,
          displayCarbs: Number.parseFloat(row.carbs) || 0,
          displayProtein: Number.parseFloat(row.protein) || 0,
          displayFat: Number.parseFloat(row.fat) || 0,
        }
      })

      const missingNutrition = rows.filter((r) => r.isNew && (!r.carbs || !r.protein || !r.fat))
      if (missingNutrition.length > 0) {
        const names = missingNutrition.map((r) => r.name).join(', ')
        setDataError(isKo ? `새 식재료의 영양소를 입력해주세요: ${names}` : `Enter nutrition for new ingredients: ${names}`)
        return
      }

      setResolvedRows(rows)
      setResolved(true)
      setDataError('')

      // 영어 번역 시작
      setTranslating(true)
      const translations = await Promise.all(rows.map((row) => translateKoToEn(row.name)))
      setEnRows(
        rows.map((row, i) => ({
          nameEn: translations[i],
          amount: toEnAmount(Number.parseFloat(row.amount) || 0, row.unit),
          unit: toEnUnit(row.unit),
        })),
      )
      setTranslating(false)
    } catch (err) {
      console.error(err)
      setDataError(isKo ? '식재료 조회 실패. 다시 시도해주세요.' : 'Failed to load ingredients. Try again.')
    } finally {
      setConfirming(false)
    }
  }

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
      setSavedRecipes(recipes)
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

  function handleMergeRecipes() {
    const selected = savedRecipes.filter((r) => selectedRecipeIds.has(r.id ?? ''))
    const lineMap = new Map<string, { name: string; amount: number; unit: string }>()
    for (const recipe of selected) {
      for (const item of recipe.items) {
        const ing = [...ingredientByName.values()].find((v) => v.id === item.ingredientId)
        const name = ing ? ing.nameKo || ing.name : item.ingredientId
        const existing = lineMap.get(name)
        if (existing && existing.unit === item.unit) {
          existing.amount += item.amount
        } else {
          lineMap.set(name, { name, amount: item.amount, unit: item.unit })
        }
      }
    }
    const lines = [...lineMap.values()].map((r) => `${r.name}/${r.amount}/${r.unit}`)
    setPastedText(lines.join('\n'))
    setResolved(false)
    setResolvedRows([])
    setEnRows([])
    setDataError('')
    setNameError('')
    setNameKoError('')
    setShowRecipeList(false)
    setSelectedRecipeIds(new Set())
  }

  function handleReset() {
    setResolved(false)
    setResolvedRows([])
    setEnRows([])
    setSideRows([])
  }

  function handleAddMainIngredient(ingredient: Ingredient) {
    if (resolvedRows.some((r) => r.ingredientId === ingredient.id)) return
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
    setSideRows((prev) => [...prev, { ingredientId: ingredient.id, amount: ingredient.baseAmount, unit: ingredient.baseUnit }])
  }

  async function handleSave() {
    let hasNameError = false
    if (!recipeName.trim()) { setNameError(isKo ? '레시피 이름(영문)을 입력해주세요.' : 'Please enter a recipe name (EN).'); hasNameError = true } else setNameError('')
    if (!recipeNameKo.trim()) { setNameKoError(isKo ? '레시피 이름(한글)을 입력해주세요.' : 'Please enter a recipe name (KO).'); hasNameError = true } else setNameKoError('')
    if (hasNameError) return
    if (resolvedRows.some((r) => r.isNew && (!r.carbs || !r.protein || !r.fat))) {
      showToast(isKo ? '새 식재료의 영양소를 입력해주세요.' : 'Enter nutrition for new ingredients.', 'error')
      return
    }
    setSaving(true)
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

      await saveRecipeToFirestore({
        name: recipeName.trim(),
        nameKo: recipeNameKo.trim(),
        imageUrl: '',
        link: recipeLink.trim(),
        memo: '',
        tasteRating: 4,
        items: resolvedRows.map((row, i) => ({
          ingredientId: ingredientIds[i],
          amount: Number.parseFloat(row.amount) || 0,
          unit: row.unit || 'g',
        })),
        sideItems: sideRows.map((row) => ({
          ingredientId: row.ingredientId,
          amount: row.amount,
          unit: row.unit,
        })),
      })

      showToast(isKo ? '레시피가 저장되었습니다.' : 'Recipe saved!', 'success')
      setRecipeName('')
      setRecipeNameKo('')
      setRecipeLink('')
      setPastedText('')
      setResolvedRows([])
      setEnRows([])
      setResolved(false)
    } catch (err) {
      console.error(err)
      showToast(isKo ? '저장 실패. 다시 시도해주세요.' : 'Save failed. Try again.', 'error')
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
      <tfoot>
        <tr className="recipe-table__total recipe-table__muted">
          <td colSpan={3}>{isKoTable ? '합계' : 'Total'}</td>
          <td className="macro">{fmt(totals.carbs)}</td>
          <td className="macro">{fmt(totals.protein)}</td>
          <td className="macro">{fmt(totals.fat)}</td>
        </tr>
        <tr className="recipe-table__division-row recipe-table__muted">
          <td colSpan={3}>
            {isKoTable ? (
              <><input type="number" className="amount-input" min={1} step={1} value={divisionCount}
                onChange={(e) => { const v = Number.parseInt(e.target.value, 10); if (!Number.isNaN(v) && v > 0) setDivisionCount(v) }}
                style={{ width: '60px', display: 'inline-block' }} />{' '}끼로 나누기</>
            ) : (
              <>Divide into {divisionCount} meals</>
            )}
          </td>
          <td className="macro">{fmt(totals.carbs / divisionCount)}</td>
          <td className="macro">{fmt(totals.protein / divisionCount)}</td>
          <td className="macro">{fmt(totals.fat / divisionCount)}</td>
        </tr>
        {sideRows.map((row) => {
          const ing = ingredientById.get(row.ingredientId)
          if (!ing) return null
          const carbsPer100 = ing.carbs / ing.baseAmount * 100
          const sideCarbs = (row.amount * carbsPer100) / 100
          const sideProtein = (row.amount * ing.protein / ing.baseAmount * 100) / 100
          const sideFat = (row.amount * ing.fat / ing.baseAmount * 100) / 100
          return (
            <tr key={row.ingredientId} className="recipe-table__multigrain-row">
              <td>{isKoTable ? (ing.nameKo || ing.name) : ing.name}</td>
              <td>
                <input type="number" className="amount-input" min={0} step={1}
                  value={row.amount}
                  onChange={(e) => { const v = Number.parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0) setSideRows((prev) => prev.map((r) => r.ingredientId === row.ingredientId ? { ...r, amount: v } : r)) }} />
              </td>
              <td>
                <select className="unit-select" value={row.unit} onChange={(e) => setSideRows((prev) => prev.map((r) => r.ingredientId === row.ingredientId ? { ...r, unit: e.target.value } : r))}>
                  {ing.allowedUnits?.map((u) => <option key={u} value={u}>{u}</option>) ?? <option value={ing.baseUnit}>{ing.baseUnit}</option>}
                </select>
              </td>
              <td className="macro">{fmt(sideCarbs)}</td>
              <td className="macro">{fmt(sideProtein)}</td>
              <td className="macro">{fmt(sideFat)}</td>
              <td className="edit-inline__delete-cell">
                <button type="button" className="edit-inline__delete-btn" onClick={() => setSideRows((prev) => prev.filter((r) => r.ingredientId !== row.ingredientId))}>✕</button>
              </td>
            </tr>
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
            <tr className="recipe-table__total">
              <td colSpan={3}><strong>{isKoTable ? '1끼 합계' : 'Per meal'}</strong></td>
              <td className="macro"><strong style={{ color: macroColor(combined.carbs, RECOMMENDED.carbs) }}>{fmt(combined.carbs)}</strong></td>
              <td className="macro"><strong style={{ color: macroColor(combined.protein, RECOMMENDED.protein) }}>{fmt(combined.protein)}</strong></td>
              <td className="macro"><strong style={{ color: macroColor(combined.fat, RECOMMENDED.fat) }}>{fmt(combined.fat)}</strong></td>
            </tr>
          )
        })()}
        <tr className="recipe-table__recommended">
          <td colSpan={3}><strong>{isKoTable ? '한끼 권장량' : 'Recommended per meal'}</strong></td>
          <td className="macro"><strong>77.0</strong></td>
          <td className="macro"><strong>33.0</strong></td>
          <td className="macro"><strong>22.0</strong></td>
        </tr>
      </tfoot>
    )
  }

  const PROMPT_MID = `내가 첨부한 이미지는 요리 레시피 영상의 식재료 목록이다. 이미지에 있는 텍스트를 정확히 추출한 뒤, 아래 규칙에 따라 재정리하라.

`
  const PROMPT_EDIT_AMOUNT = `★ 현재 가지고 있는 주재료: 닭다리살 500g (※ '닭다리살'와 '500g'은 사용자가 원하는 재료명과 양으로 수정하기)`
  const PROMPT_AFTER_1 = `
→ 위 주재료의 양을 기준으로, 모든 식재료의 양을 동일한 비율로 스케일링하라.

[출력 규칙]
1. 레시피 제목을 가장 첫 줄에 출력한다. 형식: 한글 제목 / 영어 제목
2. 이후 모든 식재료는 코드 블록으로 출력한다.
3. 각 행은 하나의 식재료를 의미하며, 각 열은 슬래시(/)로 구분한다.
4. 열의 순서는 반드시 다음을 따른다:
   * 재료명`
  const PROMPT_EDIT_NAMES = `
★ 레시피 이름 (한글): (사용자가 직접 입력)
★ 레시피 이름 (영어): (사용자가 직접 입력)`
  const PROMPT_AFTER_2 = `
   * 재료 양 (숫자만)
   * 재료 양의 단위 (예: 개, g, T 등)
   * 해당 식재료의 총 탄수화물 (g, 숫자만)
   * 해당 식재료의 단백질 (g, 숫자만)
   * 해당 식재료의 지방 (g, 숫자만)
5. 첫 행에 제목(헤더)은 작성하지 않는다.
6. 모든 영양값은 스케일링된 최종 재료 양 기준으로 계산한다.
7. 이미지에서 일부 정보가 누락된 경우, 일반적인 평균값을 사용해 추정한다.
8. 단위가 불명확할 경우, 가장 일반적인 기준으로 해석한다. (예: 1컵, 1T 등)

[출력 예시]
닭갈비 / Dakgalbi
\`\`\`
닭다리살/600/g/0/156/36
양파/0.5/개/9/1/0
\`\`\``
  const PROMPT_EDIT_LINK = `
★ 레시피 영상 링크: (선택)`
  const GPT_PROMPT = PROMPT_MID + PROMPT_EDIT_AMOUNT + PROMPT_AFTER_1 + PROMPT_EDIT_NAMES + PROMPT_AFTER_2 + PROMPT_EDIT_LINK

  if (mode === 'select') {
    return (
      <section className="page">
        <h2 className="page__heading">{isKo ? '레시피 추가' : 'Add Recipe'}</h2>
        <p className="add-recipe__select-subtitle">
          {isKo ? '어떤 방식으로 레시피를 추가하시겠어요?' : 'How would you like to add a recipe?'}
        </p>
        <div className="add-recipe__select-cards">
          <button type="button" className="add-recipe__card add-recipe__card--primary" onClick={() => setMode('sns')}>
            <span className="add-recipe__card-icon">📱</span>
            <span className="add-recipe__card-title">{isKo ? 'SNS에서 레시피 추가하기' : 'Add from SNS'}</span>
            <span className="add-recipe__card-desc">
              {isKo ? 'AI 프롬프트로 영상 속 식재료를 자동 추출합니다' : 'Auto-extract ingredients from video with AI'}
            </span>
          </button>
          <button type="button" className="add-recipe__card" onClick={() => setMode('manual')}>
            <span className="add-recipe__card-icon">✏️</span>
            <span className="add-recipe__card-title">{isKo ? '직접 레시피 작성하기' : 'Write manually'}</span>
            <span className="add-recipe__card-desc">
              {isKo ? '식재료와 영양 정보를 직접 입력합니다' : 'Enter ingredients and nutrition info manually'}
            </span>
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="add-recipe__mode-header">
        <button type="button" className="add-recipe__back-btn" onClick={() => setMode('select')}>
          ← {isKo ? '돌아가기' : 'Back'}
        </button>
        <h2 className="page__heading" style={{ margin: 0 }}>
          {isKo
            ? (mode === 'sns' ? 'SNS에서 레시피 추가하기' : '직접 레시피 작성하기')
            : (mode === 'sns' ? 'Add from SNS' : 'Write manually')}
        </h2>
      </div>

      {mode === 'sns' && (
        <>
          <div className="add-recipe__prompt-header">
            <h3 className="add-recipe__prompt-title">{isKo ? 'AI용 프롬프트' : 'AI Prompt'}</h3>
            <button
              type="button"
              className="add-recipe__prompt-copy"
              onClick={() => navigator.clipboard.writeText(GPT_PROMPT)}
              title={isKo ? '프롬프트 복사' : 'Copy prompt'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              {isKo ? '복사' : 'Copy'}
            </button>
          </div>
          <div className="add-recipe__prompt-box">
            <pre className="add-recipe__prompt-text">
              {PROMPT_MID}
              <span style={{ color: '#dc2626', fontWeight: 600 }}>{PROMPT_EDIT_AMOUNT}</span>
              {PROMPT_AFTER_1}
              <span style={{ color: '#dc2626', fontWeight: 600 }}>{PROMPT_EDIT_NAMES}</span>
              {PROMPT_AFTER_2}
              <span style={{ color: '#dc2626', fontWeight: 600 }}>{PROMPT_EDIT_LINK}</span>
            </pre>
          </div>
        </>
      )}

      <div className="add-recipe__form">
        {mode === 'sns' && (
          <div className="add-recipe__field">
            <label className="add-recipe__label">
              {isKo ? 'AI 응답 붙여넣기 (레시피 제목 + 식재료 데이터)' : 'Paste AI response (recipe title + ingredient data)'}
            </label>
            <p className="add-recipe__hint">
              {isKo
                ? '첫 줄: 레시피 제목 (한글 / English) | 이후: 식재료명/양/단위/탄수화물/단백질/지방'
                : 'First line: recipe title (KO / EN) | Then: name/amount/unit/carbs/protein/fat'}
            </p>
            <textarea className="add-recipe__textarea" value={pastedText} rows={8}
              onChange={(e) => {
                const text = e.target.value
                setPastedText(text)
                setResolved(false)
                setDataError('')
                const firstLine = text.split('\n')[0]?.trim() ?? ''
                if (firstLine.includes(' / ')) {
                  const [ko, en] = firstLine.split(' / ')
                  setRecipeNameKo(ko.trim())
                  setRecipeName(en.trim())
                }
              }}
              placeholder={isKo
                ? '닭갈비 / Dakgalbi\n닭다리살/600/g/0/156/36\n양파/0.5/개/9/1/0'
                : 'Dakgalbi / 닭갈비\nChicken thigh/600/g/0/156/36'} />
            {dataError && <p className="add-recipe__field-error">{dataError}</p>}
          </div>
        )}
        <div className="add-recipe__load-section">
          <button type="button" className="add-recipe__load-btn" onClick={handleOpenRecipeList} disabled={loadingRecipes}>
            {loadingRecipes ? (isKo ? '불러오는 중...' : 'Loading...') : (isKo ? '기존 레시피 불러오기' : 'Load from existing recipes')}
          </button>
          {showRecipeList && savedRecipes.length > 0 && (
            <>
              <ul className="add-recipe__recipe-list">
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
              <button
                type="button"
                className="add-recipe__merge-btn"
                onClick={handleMergeRecipes}
                disabled={selectedRecipeIds.size === 0}
              >
                {isKo
                  ? `선택한 ${selectedRecipeIds.size}개 레시피 합치기`
                  : `Merge ${selectedRecipeIds.size} selected recipe${selectedRecipeIds.size !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>

        {mode === 'sns' && (
          <button type="button" className="add-recipe__confirm-btn" onClick={handleConfirm} disabled={confirming}>
            {confirming ? (isKo ? '조회 중...' : 'Loading...') : (isKo ? '미리보기' : 'Preview')}
          </button>
        )}
      </div>

      {(mode === 'manual' || (resolved && resolvedRows.length > 0)) && (
        <div className="add-recipe__preview">
          <div className="add-recipe__preview-header">
            <h3 className="add-recipe__preview-title">{isKo ? '미리보기' : 'Preview'}</h3>
            {mode === 'sns' && (
              <button type="button" className="edit-inline__cancel-btn" onClick={handleReset}>
                {isKo ? '다시 입력' : 'Reset'}
              </button>
            )}
          </div>

          <div className="recipe-block__title-edit" style={{ marginBottom: '1rem' }}>
            <input
              className="recipe-block__title-input"
              value={recipeNameKo}
              onChange={(e) => { setRecipeNameKo(e.target.value); setNameKoError('') }}
              placeholder="한글 이름"
            />
            <input
              className="recipe-block__title-input"
              value={recipeName}
              onChange={(e) => { setRecipeName(e.target.value); setNameError('') }}
              placeholder="English name"
            />
            {nameKoError && <p className="add-recipe__field-error">{nameKoError}</p>}
            {nameError && <p className="add-recipe__field-error">{nameError}</p>}
          </div>

          <div className="edit-inline__link-field">
            <label className="edit-inline__link-label">{isKo ? '링크 (선택)' : 'Link (optional)'}</label>
            <input
              type="url"
              className="add-recipe__input"
              value={recipeLink}
              onChange={(e) => setRecipeLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* 한글 테이블 */}
          <p className="add-recipe__table-label">🇰🇷 한국어</p>
          <div className="table-container">
            <table className="data-table recipe-table">
              <thead>
                <tr>
                  <th>식재료</th>
                  <th>양</th>
                  <th style={{ textAlign: 'right' }}>단위</th>
                  <th>탄수화물</th>
                  <th>단백질</th>
                  <th>지방</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {resolvedRows.map((row, i) => (
                  <tr key={i} style={{ background: row.isNew ? '#fffbeb' : undefined }}>
                    <td>
                      <input
                        className="edit-inline__input"
                        value={row.name}
                        onChange={(e) => handleRowNameChange(i, e.target.value)}
                      />
                      {row.isNew && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                          새 식재료
                        </span>
                      )}
                    </td>
                    <td>
                      <input type="number" className="amount-input" min={0} step={0.1}
                        value={row.amount}
                        onChange={(e) => handleRowAmountChange(i, e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select className="unit-select" value={row.unit}
                        onChange={(e) => handleRowUnitChange(i, e.target.value)}>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="T">T</option>
                        <option value="t">t</option>
                        <option value="컵">컵</option>
                        <option value="개">개</option>
                        <option value="캔">캔</option>
                        <option value="팩">팩</option>
                        <option value="꼬집">꼬집</option>
                        <option value="oz">oz</option>
                        <option value="lbs">lbs</option>
                      </select>
                    </td>
                    <td className="macro">{fmt(row.displayCarbs)}</td>
                    <td className="macro">{fmt(row.displayProtein)}</td>
                    <td className="macro">{fmt(row.displayFat)}</td>
                    <td className="edit-inline__delete-cell">
                      <button type="button" className="edit-inline__delete-btn" onClick={() => handleRowDelete(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {tfoot('ko')}
            </table>
          </div>

          {resolvedRows.some((r) => r.isNew) && (
            <p style={{ fontSize: '0.85rem', color: '#b45309', margin: '0.5rem 0 0' }}>
              노란 배경 행은 새로운 식재료입니다. 저장 시 데이터베이스에 추가됩니다.
            </p>
          )}

          <div className="edit-bottom-bar">
            <div className="edit-bottom-bar__add">
              <button type="button" className="add-food-btn" style={{ background: 'none', color: 'var(--muted)', border: '1px solid var(--border)' }} onClick={() => setIsAddSideModalOpen(true)}>
                + {isKo ? '부재료 추가' : 'Add side ingredient'}
              </button>
              <button type="button" className="add-food-btn" onClick={() => setIsAddMainModalOpen(true)}>
                + {isKo ? '주재료 추가' : 'Add main ingredient'}
              </button>
            </div>
          </div>

          {/* 영어 테이블 */}
          <p className="add-recipe__table-label" style={{ marginTop: '2rem' }}>🇺🇸 English</p>
          {translating ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Translating...</p>
          ) : (
            <div className="table-container">
              <table className="data-table recipe-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Amount</th>
                    <th style={{ textAlign: 'right' }}>Unit</th>
                    <th>Carbs</th>
                    <th>Protein</th>
                    <th>Fat</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {enRows.map((row, i) => (
                    <tr key={i} style={{ background: resolvedRows[i]?.isNew ? '#fffbeb' : undefined }}>
                      <td>
                        <input
                          className="edit-inline__input"
                          value={row.nameEn}
                          onChange={(e) => setEnRows((prev) => prev.map((r, j) => j === i ? { ...r, nameEn: e.target.value } : r))}
                        />
                        {resolvedRows[i]?.isNew && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                            New
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="amount-input"
                          min={0}
                          step={0.1}
                          value={fmt(row.amount)}
                          onChange={(e) => setEnRows((prev) => prev.map((r, j) => j === i ? { ...r, amount: Number.parseFloat(e.target.value) || 0 } : r))}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <select
                          className="unit-select"
                          value={row.unit}
                          onChange={(e) => setEnRows((prev) => prev.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))}
                        >
                          <option value="oz">oz</option>
                          <option value="lbs">lbs</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="cup">cup</option>
                          <option value="each">each</option>
                          <option value="can">can</option>
                          <option value="pack">pack</option>
                          <option value="pinch">pinch</option>
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                        </select>
                      </td>
                      <td className="macro">{fmt(resolvedRows[i]?.displayCarbs ?? 0)}</td>
                      <td className="macro">{fmt(resolvedRows[i]?.displayProtein ?? 0)}</td>
                      <td className="macro">{fmt(resolvedRows[i]?.displayFat ?? 0)}</td>
                      <td className="edit-inline__delete-cell">
                        <button type="button" className="edit-inline__delete-btn" onClick={() => handleRowDelete(i)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {tfoot('en')}
              </table>
            </div>
          )}

          <button type="button" className="add-recipe__save-btn" onClick={handleSave} disabled={saving || translating}>
            {saving ? (isKo ? '저장 중...' : 'Saving...') : (isKo ? '레시피 추가' : 'Add Recipe')}
          </button>
        </div>
      )}

      <IngredientSearchModal
        isOpen={isAddMainModalOpen}
        onClose={() => setIsAddMainModalOpen(false)}
        onIngredientSelect={handleAddMainIngredient}
        existingIngredientIds={new Set(resolvedRows.map((r) => r.ingredientId).filter(Boolean) as string[])}
        multiSelect
      />
      <IngredientSearchModal
        isOpen={isAddSideModalOpen}
        onClose={() => setIsAddSideModalOpen(false)}
        onIngredientSelect={handleAddSideIngredient}
        existingIngredientIds={new Set(sideRows.map((r) => r.ingredientId))}
        multiSelect
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </section>
  )
}
