import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { saveIngredientToFirestore } from '../services/ingredientService'
import { Toast, useToast } from '../components/Toast'

type ParsedRow = {
  name: string
  amount: string
  unit: string
  carbs: string
  protein: string
  fat: string
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

async function translateKoToEn(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json()
    return json?.[0]?.[0]?.[0] ?? text
  } catch {
    return text
  }
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1)
}

const KO_UNITS = ['g', 'ml', 'T', 't', '컵', '개', '꼬집', 'oz', 'lbs']
const EN_UNITS = ['oz', 'lbs', 'tbsp', 'tsp', 'cup', 'each', 'pinch', 'g', 'ml']

const KO_TO_EN_UNIT: Record<string, string> = {
  g: 'oz', ml: 'oz', '컵': 'cup', '개': 'each', '꼬집': 'pinch',
  T: 'tbsp', t: 'tsp', oz: 'oz', lbs: 'lbs',
}

function toEnUnit(unit: string): string {
  return KO_TO_EN_UNIT[unit] ?? unit
}

function toEnAmount(amount: number, unit: string): number {
  if (unit === 'g') return amount / 28.3495
  if (unit === 'ml') return amount / 29.5735
  return amount
}

type ResolvedRow = ParsedRow & {
  nameEn: string
  enAmount: number
  enUnit: string
}

export function AddIngredientPage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const isKo = language === 'ko'
  const { toast, showToast, closeToast } = useToast()

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])

  const [pastedText, setPastedText] = useState('')
  const [rows, setRows] = useState<ResolvedRow[]>([])
  const [resolved, setResolved] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const [dataError, setDataError] = useState('')

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

    const missingNutrition = parsed.filter((r) => !r.carbs || !r.protein || !r.fat)
    if (missingNutrition.length > 0) {
      const names = missingNutrition.map((r) => r.name).join(', ')
      setDataError(isKo ? `영양소를 입력해주세요: ${names}` : `Enter nutrition for: ${names}`)
      return
    }

    setConfirming(true)
    try {
      setTranslating(true)
      const translations = await Promise.all(parsed.map((r) => translateKoToEn(r.name)))
      setRows(
        parsed.map((r, i) => ({
          ...r,
          nameEn: translations[i],
          enAmount: toEnAmount(Number.parseFloat(r.amount) || 0, r.unit),
          enUnit: toEnUnit(r.unit),
        })),
      )
      setTranslating(false)
      setResolved(true)
      setDataError('')
    } finally {
      setConfirming(false)
      setTranslating(false)
    }
  }

  function handleRowChange<K extends keyof ResolvedRow>(index: number, key: K, value: ResolvedRow[K]) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [key]: value } : r))
  }

  function handleRowDelete(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function handleReset() {
    setResolved(false)
    setRows([])
  }

  async function handleSave() {
    setSaving(true)
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const nameEn = row.nameEn || row.name
        const nameKo = row.name
        await saveIngredientToFirestore({
          name: nameEn.toLowerCase(),
          nameKo,
          baseAmount: Number.parseFloat(row.amount) || 100,
          baseUnit: row.unit || 'g',
          carbs: Number.parseFloat(row.carbs) || 0,
          protein: Number.parseFloat(row.protein) || 0,
          fat: Number.parseFloat(row.fat) || 0,
        })
      }
      showToast(isKo ? '식재료가 저장되었습니다.' : 'Ingredient saved!', 'success')
      setPastedText('')
      setRows([])
      setResolved(false)
    } catch {
      showToast(isKo ? '저장 실패. 다시 시도해주세요.' : 'Save failed. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page">
      <h2 className="page__heading">{isKo ? '식재료 추가' : 'Add Ingredient'}</h2>

      <div className="add-recipe__form">
        <div className="add-recipe__field">
          <label className="add-recipe__label">
            {isKo ? '식재료 데이터 (/ 로 열 구분, 줄바꿈으로 행 구분)' : 'Ingredient data (/ between columns, newlines between rows)'}
          </label>
          <p className="add-recipe__hint">
            {isKo
              ? '새 식재료: 식재료명/양/단위/탄수화물/단백질/지방'
              : 'New ingredient: name/amount/unit/carbs/protein/fat'}
          </p>
          <textarea className="add-recipe__textarea" value={pastedText} rows={8}
            onChange={(e) => { setPastedText(e.target.value); setResolved(false); setDataError('') }}
            placeholder={isKo
              ? '닭가슴살/100/g/0/23/2\n'
              : 'Chicken breast/100/g/0/23/2\n'} />
          {dataError && <p className="add-recipe__field-error">{dataError}</p>}
        </div>
        <button type="button" className="add-recipe__confirm-btn" onClick={handleConfirm} disabled={confirming}>
          {confirming ? (isKo ? '조회 중...' : 'Checking...') : (isKo ? '확인' : 'Confirm')}
        </button>
      </div>

      {resolved && rows.length > 0 && (
        <div className="add-recipe__preview">
          <div className="add-recipe__preview-header">
            <h3 className="add-recipe__preview-title">{isKo ? '미리보기' : 'Preview'}</h3>
            <button type="button" className="edit-inline__cancel-btn" onClick={handleReset}>
              {isKo ? '다시 입력' : 'Reset'}
            </button>
          </div>

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
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input className="edit-inline__input" value={row.name}
                        onChange={(e) => handleRowChange(i, 'name', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="amount-input" min={0} step={0.1}
                        value={row.amount}
                        onChange={(e) => handleRowChange(i, 'amount', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select className="unit-select" value={row.unit}
                        onChange={(e) => handleRowChange(i, 'unit', e.target.value)}>
                        {KO_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="macro">{fmt(Number.parseFloat(row.carbs) || 0)}</td>
                    <td className="macro">{fmt(Number.parseFloat(row.protein) || 0)}</td>
                    <td className="macro">{fmt(Number.parseFloat(row.fat) || 0)}</td>
                    <td className="edit-inline__delete-cell">
                      <button type="button" className="edit-inline__delete-btn" onClick={() => handleRowDelete(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <input className="edit-inline__input" value={row.nameEn}
                          onChange={(e) => handleRowChange(i, 'nameEn', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="amount-input" min={0} step={0.1}
                          value={fmt(row.enAmount)}
                          onChange={(e) => handleRowChange(i, 'enAmount', Number.parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <select className="unit-select" value={row.enUnit}
                          onChange={(e) => handleRowChange(i, 'enUnit', e.target.value)}>
                          {EN_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="macro">{fmt(Number.parseFloat(row.carbs) || 0)}</td>
                      <td className="macro">{fmt(Number.parseFloat(row.protein) || 0)}</td>
                      <td className="macro">{fmt(Number.parseFloat(row.fat) || 0)}</td>
                      <td className="edit-inline__delete-cell">
                        <button type="button" className="edit-inline__delete-btn" onClick={() => handleRowDelete(i)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button type="button" className="add-recipe__save-btn" onClick={handleSave} disabled={saving || translating}>
            {saving ? (isKo ? '저장 중...' : 'Saving...') : (isKo ? '식재료 저장' : 'Save Ingredient')}
          </button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </section>
  )
}
