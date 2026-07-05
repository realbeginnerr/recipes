import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { saveRecipeToFirestore } from '../services/recipeService'
import {
  loadIngredientsFromFirestore,
  saveIngredientToFirestore,
  findIngredientByName,
  type FirestoreIngredient,
} from '../services/ingredientService'
import { Toast, useToast } from '../components/Toast'

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


function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase()
  if (lower === 'g' || lower === 'oz' || lower === 'ml') return lower
  return unit
}

function parseIngredientText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
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

export function AddRecipePage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const isKo = language === 'ko'

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])

  const [recipeName, setRecipeName] = useState('')
  const [recipeNameKo, setRecipeNameKo] = useState('')
  const [recipeLink, setRecipeLink] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [resolvedRows, setResolvedRows] = useState<ResolvedRow[]>([])
  const [resolved, setResolved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [divisionCount, setDivisionCount] = useState(4)
  const [multigrainRiceAmount, setMultigrainRiceAmount] = useState(130)
  const [multigrainRiceUnit, setMultigrainRiceUnit] = useState(() => language === 'en' ? 'oz' : 'g')
  const [nameError, setNameError] = useState('')
  const [nameKoError, setNameKoError] = useState('')
  const [dataError, setDataError] = useState('')
  const { toast, showToast, closeToast } = useToast()

  useEffect(() => {
    if (resolvedRows.length === 0) return
    setResolvedRows((prev) =>
      prev.map((row) => {
        if (!isKo && row.unit === 'g') {
          const oz = (Number.parseFloat(row.amount) || 0) / 28.3495
          return { ...row, unit: 'oz', amount: oz.toFixed(1) }
        }
        if (isKo && row.unit === 'oz') {
          const g = (Number.parseFloat(row.amount) || 0) * 28.3495
          return { ...row, unit: 'g', amount: g.toFixed(1) }
        }
        return row
      }),
    )
  }, [language, isKo])

  async function handleConfirm() {
    let hasError = false
    if (!recipeName.trim()) { setNameError(isKo ? '레시피 이름(영문)을 입력해주세요.' : 'Please enter a recipe name (EN).'); hasError = true } else setNameError('')
    if (!recipeNameKo.trim()) { setNameKoError(isKo ? '레시피 이름(한글)을 입력해주세요.' : 'Please enter a recipe name (KO).'); hasError = true } else setNameKoError('')
    if (!pastedText.trim()) { setDataError(isKo ? '식재료 데이터를 입력해주세요.' : 'Please enter ingredient data.'); hasError = true } else setDataError('')
    if (hasError) return

    const parsed = parseIngredientText(pastedText)
    if (parsed.length === 0) { setDataError(isKo ? '파싱할 수 있는 데이터가 없습니다.' : 'No data could be parsed.'); return }

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

      // 새 식재료는 영양소 필수
      const missingNutrition = rows.filter(
        (r) => r.isNew && (!r.carbs || !r.protein || !r.fat)
      )
      if (missingNutrition.length > 0) {
        const names = missingNutrition.map((r) => r.name).join(', ')
        setDataError(
          isKo
            ? `새 식재료의 영양소를 입력해주세요: ${names}`
            : `Enter nutrition for new ingredients: ${names}`
        )
        return
      }

      setResolvedRows(rows)
      setResolved(true)
      setDataError('')
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
  }

  function handleReset() {
    setResolved(false)
    setResolvedRows([])
  }

  async function handleSave() {
    if (resolvedRows.some((r) => r.isNew && (!r.carbs || !r.protein || !r.fat))) {
      showToast(isKo ? '새 식재료의 영양소를 입력해주세요.' : 'Enter nutrition for new ingredients.', 'error')
      return
    }
    setSaving(true)
    try {
      const ingredientIds: string[] = []
      for (const row of resolvedRows) {
        if (!row.isNew && row.ingredientId) {
          ingredientIds.push(row.ingredientId)
        } else {
          const id = await saveIngredientToFirestore({
            name: row.name,
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
      })

      showToast(isKo ? '레시피가 저장되었습니다.' : 'Recipe saved!', 'success')
      setRecipeName('')
      setRecipeNameKo('')
      setRecipeLink('')
      setPastedText('')
      setResolvedRows([])
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
  const riceCarbs = (multigrainRiceAmount * 28.5) / 100
  const riceProtein = (multigrainRiceAmount * 3.1) / 100
  const riceFat = (multigrainRiceAmount * 0.8) / 100
  const combined = {
    carbs: totals.carbs / divisionCount + riceCarbs,
    protein: totals.protein / divisionCount + riceProtein,
    fat: totals.fat / divisionCount + riceFat,
  }

  return (
    <section className="page">
      <h2 className="page__heading">{isKo ? '레시피 추가' : 'Add Recipe'}</h2>

      <div className="add-recipe__form">
        <div className="add-recipe__field">
          <label className="add-recipe__label">{isKo ? '레시피 이름 (영문)' : 'Recipe name (EN)'}</label>
          <input type="text" className="add-recipe__input" value={recipeName}
            onChange={(e) => { setRecipeName(e.target.value); setNameError('') }}
            placeholder="e.g. Chili Con Carne" />
          {nameError && <p className="add-recipe__field-error">{nameError}</p>}
        </div>
        <div className="add-recipe__field">
          <label className="add-recipe__label">{isKo ? '레시피 이름 (한글)' : 'Recipe name (KO)'}</label>
          <input type="text" className="add-recipe__input" value={recipeNameKo}
            onChange={(e) => { setRecipeNameKo(e.target.value); setNameKoError('') }}
            placeholder="예) 칠리 콘 카르네" />
          {nameKoError && <p className="add-recipe__field-error">{nameKoError}</p>}
        </div>
        <div className="add-recipe__field">
          <label className="add-recipe__label">{isKo ? '링크 (선택)' : 'Link (optional)'}</label>
          <input type="url" className="add-recipe__input" value={recipeLink}
            onChange={(e) => setRecipeLink(e.target.value)} placeholder="https://..." />
        </div>
        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo ? '식재료 데이터 (/ 로 열 구분, 줄바꿈으로 행 구분)' : 'Ingredient data (/ between columns, newlines between rows)'}
          </label>
          <p className="add-recipe__hint">
            {isKo
              ? '새 식재료: 식재료명/양/단위/탄수화물/단백질/지방 | 기존 식재료: 식재료명/양/단위'
              : 'New ingredient: name/amount/unit/carbs/protein/fat | Existing: name/amount/unit'}
          </p>
          <textarea className="add-recipe__textarea" value={pastedText} rows={8}
            onChange={(e) => { setPastedText(e.target.value); setResolved(false); setDataError('') }}
            placeholder={isKo
              ? '닭가슴살/200/g/0/46/4\n브로콜리/100/g/7/3/0'
              : 'Chicken breast/200/g/0/46/4\nBroccoli/100/g/7/3/0'} />
          {dataError && <p className="add-recipe__field-error">{dataError}</p>}
        </div>
        <button type="button" className="add-recipe__confirm-btn" onClick={handleConfirm} disabled={confirming}>
          {confirming ? (isKo ? '조회 중...' : 'Checking...') : (isKo ? '확인' : 'Confirm')}
        </button>
      </div>

      {resolved && resolvedRows.length > 0 && (
        <div className="add-recipe__preview">
          <div className="add-recipe__preview-header">
            <h3 className="add-recipe__preview-title">{isKo ? '미리보기' : 'Preview'}</h3>
            <button type="button" className="edit-inline__cancel-btn" onClick={handleReset}>
              {isKo ? '다시 입력' : 'Reset'}
            </button>
          </div>
          <div className="table-container">
            <table className="data-table recipe-table">
              <thead>
                <tr>
                  <th>{isKo ? '식재료' : 'Ingredient'}</th>
                  <th>{isKo ? '양' : 'Amount'}</th>
                  <th>{isKo ? '단위' : 'Unit'}</th>
                  <th>{isKo ? '탄수화물' : 'Carbs'}</th>
                  <th>{isKo ? '단백질' : 'Protein'}</th>
                  <th>{isKo ? '지방' : 'Fat'}</th>
                </tr>
              </thead>
              <tbody>
                {resolvedRows.map((row, i) => (
                  <tr key={i} style={{ background: row.isNew ? '#fffbeb' : undefined }}>
                    <td>
                      {row.name}
                      {row.isNew && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                          {isKo ? '새 식재료' : 'New'}
                        </span>
                      )}
                    </td>
                    <td>
                      <input type="number" className="amount-input" min={0} step={0.1}
                        value={row.amount}
                        onChange={(e) => handleRowAmountChange(i, e.target.value)} />
                    </td>
                    <td>
                      <select className="unit-select" value={row.unit}
                        onChange={(e) => handleRowUnitChange(i, e.target.value)}>
                        {isKo ? (
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
                            <option value="g">g</option>
                            <option value="">N/A</option>
                          </>
                        )}
                      </select>
                    </td>
                    <td className="macro">{fmt(row.displayCarbs)}</td>
                    <td className="macro">{fmt(row.displayProtein)}</td>
                    <td className="macro">{fmt(row.displayFat)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="recipe-table__total recipe-table__muted">
                  <td colSpan={3}>{isKo ? '합계' : 'Total'}</td>
                  <td className="macro">{fmt(totals.carbs)}</td>
                  <td className="macro">{fmt(totals.protein)}</td>
                  <td className="macro">{fmt(totals.fat)}</td>
                </tr>
                <tr className="recipe-table__division-row recipe-table__muted">
                  <td colSpan={3}>
                    {isKo ? (
                      <><input type="number" className="amount-input" min={1} step={1} value={divisionCount}
                        onChange={(e) => { const v = Number.parseInt(e.target.value, 10); if (!Number.isNaN(v) && v > 0) setDivisionCount(v) }}
                        style={{ width: '60px', display: 'inline-block' }} />{' '}끼로 나누기</>
                    ) : (
                      <>Divide into{' '}<input type="number" className="amount-input" min={1} step={1} value={divisionCount}
                        onChange={(e) => { const v = Number.parseInt(e.target.value, 10); if (!Number.isNaN(v) && v > 0) setDivisionCount(v) }}
                        style={{ width: '60px', display: 'inline-block' }} />{' '}meals</>
                    )}
                  </td>
                  <td className="macro">{fmt(totals.carbs / divisionCount)}</td>
                  <td className="macro">{fmt(totals.protein / divisionCount)}</td>
                  <td className="macro">{fmt(totals.fat / divisionCount)}</td>
                </tr>
                <tr className="recipe-table__multigrain-row">
                  <td>{isKo ? '잡곡밥 (쌀:잡곡=2:1)' : 'Multigrain rice (rice:grains=2:1)'}</td>
                  <td>
                    <input type="number" className="amount-input" min={0} step={0.1}
                      value={multigrainRiceAmount}
                      onChange={(e) => { const v = Number.parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0) setMultigrainRiceAmount(v) }} />
                  </td>
                  <td>
                    <select className="unit-select" value={multigrainRiceUnit} onChange={(e) => setMultigrainRiceUnit(e.target.value)}>
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                    </select>
                  </td>
                  <td className="macro">{fmt(riceCarbs)}</td>
                  <td className="macro">{fmt(riceProtein)}</td>
                  <td className="macro">{fmt(riceFat)}</td>
                </tr>
                <tr className="recipe-table__total">
                  <td colSpan={3}><strong>{isKo ? '합계' : 'Combined Total'}</strong></td>
                  <td className="macro"><strong style={{ color: macroColor(combined.carbs, RECOMMENDED.carbs) }}>{fmt(combined.carbs)}</strong></td>
                  <td className="macro"><strong style={{ color: macroColor(combined.protein, RECOMMENDED.protein) }}>{fmt(combined.protein)}</strong></td>
                  <td className="macro"><strong style={{ color: macroColor(combined.fat, RECOMMENDED.fat) }}>{fmt(combined.fat)}</strong></td>
                </tr>
                <tr className="recipe-table__recommended">
                  <td colSpan={3}><strong>{isKo ? '한끼 권장량' : 'Recommended per meal'}</strong></td>
                  <td className="macro"><strong>77.0</strong></td>
                  <td className="macro"><strong>33.0</strong></td>
                  <td className="macro"><strong>22.0</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {resolvedRows.some((r) => r.isNew) && (
            <p style={{ fontSize: '0.85rem', color: '#b45309', marginTop: '0.75rem' }}>
              {isKo
                ? '노란 배경 행은 새로운 식재료입니다. 저장 시 데이터베이스에 추가됩니다.'
                : 'Highlighted rows are new ingredients and will be added to the database on save.'}
            </p>
          )}

          <button type="button" className="add-recipe__save-btn" onClick={handleSave} disabled={saving}>
            {saving ? (isKo ? '저장 중...' : 'Saving...') : (isKo ? '레시피 저장' : 'Save Recipe')}
          </button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </section>
  )
}
