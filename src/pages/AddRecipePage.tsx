import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { saveRecipeToFirestore } from '../services/recipeService'
import type { FirestoreRecipe } from '../services/recipeService'
import { Toast, useToast } from '../components/Toast'

type ParsedRow = {
  name: string
  amount: string
  unit: string
  carbs: string
  protein: string
  fat: string
}

const VALID_UNITS = new Set(['컵', 'g', 'oz', 'ml', '개', 'T', 't', '꼬집', '적당히'])

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase()
  if (lower === 'g' || lower === 'oz' || lower === 'ml') return lower
  return unit
}

function formatMacro(value: string): string {
  const n = Number.parseFloat(value)
  if (Number.isNaN(n)) return value
  return n.toFixed(1)
}

function parseIngredientText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const cols = line.split('/')
      const unit = normalizeUnit(cols[2]?.trim() ?? '')
      return {
        name: cols[0]?.trim() ?? '',
        amount: cols[1]?.trim() ?? '',
        unit,
        carbs: cols[3]?.trim() ?? '',
        protein: cols[4]?.trim() ?? '',
        fat: cols[5]?.trim() ?? '',
      }
    })
    .filter((row) => row.name.length > 0)
}

function validateRows(rows: ParsedRow[], isKo: boolean): string[] {
  const errors: string[] = []

  const hasMissingCell = rows.some(
    (row) => !row.name || !row.amount || !row.unit || !row.carbs || !row.protein || !row.fat,
  )
  if (hasMissingCell) {
    errors.push(
      isKo
        ? '빈 칸이 있습니다. 모든 열을 입력해주세요.'
        : 'Some cells are empty. Please fill in all columns.',
    )
  }

  const invalidUnits = rows
    .filter((row) => row.unit && !VALID_UNITS.has(row.unit))
    .map((row) => row.unit)
  const uniqueInvalid = [...new Set(invalidUnits)]
  if (uniqueInvalid.length > 0) {
    errors.push(
      isKo
        ? `사용할 수 없는 단위가 있습니다: ${uniqueInvalid.join(', ')} — 사용 가능한 단위: 컵, g, oz, ml, 개, T, t, 꼬집, 적당히`
        : `Invalid unit(s): ${uniqueInvalid.join(', ')} — Allowed: 컵, g, oz, ml, 개, T, t, 꼬집, 적당히`,
    )
  }

  return errors
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

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])
  const [recipeName, setRecipeName] = useState('')
  const [recipeNameKo, setRecipeNameKo] = useState('')
  const [divisionCount, setDivisionCount] = useState(4)
  const [multigrainRiceAmount, setMultigrainRiceAmount] = useState(130)
  const [multigrainRiceUnit, setMultigrainRiceUnit] = useState(() => language === 'en' ? 'oz' : 'g')
  const [pastedText, setPastedText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parsed, setParsed] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast, showToast, closeToast } = useToast()
  const [recipeLink, setRecipeLink] = useState('')
  const [nameError, setNameError] = useState('')
  const [nameKoError, setNameKoError] = useState('')
  const [dataError, setDataError] = useState('')

  function handleConfirm() {
    let hasError = false
    if (!recipeName.trim()) {
      setNameError(isKo ? '레시피 이름(영문)을 입력해주세요.' : 'Please enter a recipe name (EN).')
      hasError = true
    } else {
      setNameError('')
    }
    if (!recipeNameKo.trim()) {
      setNameKoError(isKo ? '레시피 이름(한글)을 입력해주세요.' : 'Please enter a recipe name (KO).')
      hasError = true
    } else {
      setNameKoError('')
    }
    if (!pastedText.trim()) {
      setDataError(isKo ? '식재료 데이터를 입력해주세요.' : 'Please enter ingredient data.')
      hasError = true
    } else {
      setDataError('')
    }
    if (hasError) return
    const rows = parseIngredientText(pastedText)
    setParsedRows(rows)
    setParsed(true)
  }

  const isKo = language === 'ko'

  useEffect(() => {
    if (parsedRows.length === 0) return
    setParsedRows((prev) =>
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

  function handleRowAmountChange(index: number, value: string) {
    setParsedRows((prev) => prev.map((row, i) => i === index ? { ...row, amount: value } : row))
  }

  function handleRowUnitChange(index: number, value: string) {
    setParsedRows((prev) => prev.map((row, i) => i === index ? { ...row, unit: value } : row))
  }

  function handleReset() {
    setParsed(false)
    setParsedRows([])
  }

  async function handleSave() {
    if (!recipeName.trim()) {
      alert(language === 'ko' ? '레시피 이름(영문)을 입력해주세요.' : 'Please enter a recipe name.')
      return
    }
    if (errors.length > 0) {
      alert(isKo ? '오류를 먼저 수정해주세요.' : 'Please fix the errors first.')
      return
    }
    setSaving(true)
    try {
      const recipe: Omit<FirestoreRecipe, 'id' | 'createdAt'> = {
        name: recipeName.trim(),
        nameKo: recipeNameKo.trim() || recipeName.trim(),
        imageUrl: '',
        link: recipeLink.trim(),
        memo: '',
        tasteRating: 4,
        timeRating: 4,
        items: parsedRows.map((row) => ({
          name: row.name,
          nameKo: row.name,
          amount: Number.parseFloat(row.amount) || 0,
          unit: row.unit || 'g',
          carbs: Number.parseFloat(row.carbs) || 0,
          protein: Number.parseFloat(row.protein) || 0,
          fat: Number.parseFloat(row.fat) || 0,
        })),
      }
      await saveRecipeToFirestore(recipe)
      showToast(isKo ? '레시피가 저장되었습니다.' : 'Recipe saved successfully!', 'success')
      setRecipeName('')
      setRecipeNameKo('')
      setPastedText('')
      setParsedRows([])
      setParsed(false)
    } catch (err) {
      console.error(err)
      showToast(isKo ? '저장 실패. 다시 시도해주세요.' : 'Save failed. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const errors = parsed ? validateRows(parsedRows, isKo) : []

  return (
    <section className="page">
      <h2 className="page__heading">
        {isKo ? '레시피 추가' : 'Add Recipe'}
      </h2>

      <div className="add-recipe__form">
        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo ? '레시피 이름 (영문)' : 'Recipe name (EN)'}
          </label>
          <input
            type="text"
            className="add-recipe__input"
            value={recipeName}
            onChange={(e) => { setRecipeName(e.target.value); setNameError('') }}
            placeholder="e.g. Chili Con Carne"
          />
          {nameError && <p className="add-recipe__field-error">{nameError}</p>}
        </div>
        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo ? '레시피 이름 (한글)' : 'Recipe name (KO)'}
          </label>
          <input
            type="text"
            className="add-recipe__input"
            value={recipeNameKo}
            onChange={(e) => { setRecipeNameKo(e.target.value); setNameKoError('') }}
            placeholder="예) 칠리 콘 카르네"
          />
          {nameKoError && <p className="add-recipe__field-error">{nameKoError}</p>}
        </div>

        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo ? '링크 (선택)' : 'Link (optional)'}
          </label>
          <input
            type="url"
            className="add-recipe__input"
            value={recipeLink}
            onChange={(e) => setRecipeLink(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo
              ? '식재료 데이터 입력 (/ 로 열 구분, 줄바꿈으로 행 구분)'
              : 'Enter ingredient data (/ between columns, newlines between rows)'}
          </label>
          <p className="add-recipe__hint">
            {isKo
              ? '열 순서: 식재료명 → 양 → 단위 → 탄수화물 → 단백질 → 지방'
              : 'Column order: name → amount → unit → carbs → protein → fat'}
          </p>
          <textarea
            className="add-recipe__textarea"
            value={pastedText}
            onChange={(e) => { setPastedText(e.target.value); setParsed(false); setDataError('') }}
            placeholder={isKo
              ? '닭가슴살/200/g/0/46/4\n브로콜리/100/g/7/3/0'
              : 'Chicken breast/200/g/0/46/4\nBroccoli/100/g/7/3/0'}
            rows={8}
          />
          {dataError && <p className="add-recipe__field-error">{dataError}</p>}
        </div>

        <button
          type="button"
          className="add-recipe__confirm-btn"
          onClick={handleConfirm}
        >
          {isKo ? '확인' : 'Confirm'}
        </button>
      </div>

      {parsed && parsedRows.length > 0 && (
        <div className="add-recipe__preview">
          <div className="add-recipe__preview-header">
            <h3 className="add-recipe__preview-title">
              {isKo ? '미리보기' : 'Preview'}
            </h3>
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
                {parsedRows.map((row, i) => {
                  return (
                    <tr key={i}>
                      <td style={{ color: !row.name ? '#dc2626' : undefined }}>{row.name || '—'}</td>
                      <td>
                        <input
                          type="number"
                          className="amount-input"
                          min={0}
                          step={0.1}
                          value={row.amount}
                          onChange={(e) => handleRowAmountChange(i, e.target.value)}
                          style={{ borderColor: !row.amount ? '#dc2626' : undefined }}
                        />
                      </td>
                      <td>
                        <select
                          className="unit-select"
                          value={row.unit}
                          onChange={(e) => handleRowUnitChange(i, e.target.value)}
                        >
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
                              <option value="">N/A</option>
                            </>
                          )}
                        </select>
                      </td>
                      <td className="macro" style={{ color: !row.carbs ? '#dc2626' : undefined }}>{row.carbs ? formatMacro(row.carbs) : '—'}</td>
                      <td className="macro" style={{ color: !row.protein ? '#dc2626' : undefined }}>{row.protein ? formatMacro(row.protein) : '—'}</td>
                      <td className="macro" style={{ color: !row.fat ? '#dc2626' : undefined }}>{row.fat ? formatMacro(row.fat) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const totals = parsedRows.reduce(
                    (acc, row) => ({
                      carbs: acc.carbs + (Number.parseFloat(row.carbs) || 0),
                      protein: acc.protein + (Number.parseFloat(row.protein) || 0),
                      fat: acc.fat + (Number.parseFloat(row.fat) || 0),
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
                    <>
                      <tr className="recipe-table__total recipe-table__muted">
                        <td colSpan={3}>{isKo ? '합계' : 'Total'}</td>
                        <td className="macro">{formatMacro(totals.carbs.toString())}</td>
                        <td className="macro">{formatMacro(totals.protein.toString())}</td>
                        <td className="macro">{formatMacro(totals.fat.toString())}</td>
                      </tr>
                      <tr className="recipe-table__division-row recipe-table__muted">
                        <td colSpan={3}>
                          {isKo ? (
                            <><input type="number" className="amount-input" min={1} step={1} value={divisionCount} onChange={(e) => { const v = Number.parseInt(e.target.value, 10); if (!Number.isNaN(v) && v > 0) setDivisionCount(v) }} style={{ width: '60px', display: 'inline-block' }} />{' '}끼로 나누기</>
                          ) : (
                            <>Divide into{' '}<input type="number" className="amount-input" min={1} step={1} value={divisionCount} onChange={(e) => { const v = Number.parseInt(e.target.value, 10); if (!Number.isNaN(v) && v > 0) setDivisionCount(v) }} style={{ width: '60px', display: 'inline-block' }} />{' '}meals</>
                          )}
                        </td>
                        <td className="macro">{formatMacro((totals.carbs / divisionCount).toString())}</td>
                        <td className="macro">{formatMacro((totals.protein / divisionCount).toString())}</td>
                        <td className="macro">{formatMacro((totals.fat / divisionCount).toString())}</td>
                      </tr>
                      <tr className="recipe-table__multigrain-row">
                        <td>{isKo ? '잡곡밥 (쌀:잡곡=2:1)' : 'Multigrain rice (rice:grains=2:1)'}</td>
                        <td>
                          <input type="number" className="amount-input" min={0} step={0.1} value={multigrainRiceAmount} onChange={(e) => { const v = Number.parseFloat(e.target.value); if (!Number.isNaN(v) && v >= 0) setMultigrainRiceAmount(v) }} />
                        </td>
                        <td>
                          <select className="unit-select" value={multigrainRiceUnit} onChange={(e) => setMultigrainRiceUnit(e.target.value)}>
                            <option value="g">g</option>
                            <option value="oz">oz</option>
                          </select>
                        </td>
                        <td className="macro">{formatMacro(riceCarbs.toString())}</td>
                        <td className="macro">{formatMacro(riceProtein.toString())}</td>
                        <td className="macro">{formatMacro(riceFat.toString())}</td>
                      </tr>
                      <tr className="recipe-table__total">
                        <td colSpan={3}><strong>{isKo ? '합계' : 'Combined Total'}</strong></td>
                        <td className="macro"><strong style={{ color: macroColor(combined.carbs, RECOMMENDED.carbs) }}>{formatMacro(combined.carbs.toString())}</strong></td>
                        <td className="macro"><strong style={{ color: macroColor(combined.protein, RECOMMENDED.protein) }}>{formatMacro(combined.protein.toString())}</strong></td>
                        <td className="macro"><strong style={{ color: macroColor(combined.fat, RECOMMENDED.fat) }}>{formatMacro(combined.fat.toString())}</strong></td>
                      </tr>
                      <tr className="recipe-table__recommended">
                        <td colSpan={3}><strong>{isKo ? '한끼 권장량' : 'Recommended per meal'}</strong></td>
                        <td className="macro"><strong>77.0</strong></td>
                        <td className="macro"><strong>33.0</strong></td>
                        <td className="macro"><strong>22.0</strong></td>
                      </tr>
                    </>
                  )
                })()}
              </tfoot>
            </table>
          </div>

          {errors.length > 0 && (
            <ul className="add-recipe__error-list">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="add-recipe__save-btn"
            onClick={handleSave}
            disabled={saving || errors.length > 0}
          >
            {saving
              ? (isKo ? '저장 중...' : 'Saving...')
              : (isKo ? '레시피 저장' : 'Save Recipe')}
          </button>
        </div>
      )}

      {parsed && parsedRows.length === 0 && (
        <p className="add-recipe__error">
          {isKo
            ? '파싱할 수 있는 데이터가 없습니다. 형식을 확인해주세요.'
            : 'No data could be parsed. Please check the format.'}
        </p>
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </section>
  )
}
