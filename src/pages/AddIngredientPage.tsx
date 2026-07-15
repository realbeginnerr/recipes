import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { saveIngredientToFirestore } from '../services/ingredientService'
import { Toast, useToast } from '../components/Toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UnitSelect } from '../components/UnitSelect'

const KO_TO_EN_UNIT: Record<string, string> = {
  g: 'oz', ml: 'oz', '컵': 'cup', '개': 'each', '캔': 'can', '팩': 'pack', '꼬집': 'pinch',
  T: 'tbsp', t: 'tsp', oz: 'oz', lbs: 'lbs',
}

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase()
  if (lower === 'g' || lower === 'oz' || lower === 'ml') return lower
  return unit
}

function toEnUnit(unit: string): string { return KO_TO_EN_UNIT[unit] ?? unit }
function toEnAmount(amount: number, unit: string): number {
  if (unit === 'g') return amount / 28.3495
  if (unit === 'ml') return amount / 29.5735
  return amount
}
function fmt(n: number): string { return (Math.round(n * 10) / 10).toFixed(1) }

async function translateKoToEn(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json()
    return json?.[0]?.[0]?.[0] ?? text
  } catch { return text }
}

type AiRow = {
  nameKo: string; nameEn: string
  amount: string; unit: string; enAmount: number; enUnit: string
  carbs: string; protein: string; fat: string
}

type ManualRow = {
  nameKo: string; amount: string; unit: string
  carbs: string; protein: string; fat: string
}

const EMPTY_MANUAL: ManualRow = { nameKo: '', amount: '100', unit: 'g', carbs: '', protein: '', fat: '' }

const AI_PROMPT = `아래 식재료들의 영양 정보를 알려줘.
형식: 식재료명(한글)/기준량/단위/탄수화물(g)/단백질(g)/지방(g)
기준량은 100g 또는 대표 단위(1개, 1T 등) 사용. 제목 행 없이 결과만 출력.
예시: 닭가슴살/100/g/0/23/2

[여기에 식재료 목록 입력]`

export function AddIngredientPage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const isKo = language === 'ko'
  const { toast, showToast, closeToast } = useToast()

  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true })
  }, [isAdmin, navigate])

  const [mode, setMode] = useState<'select' | 'ai' | 'manual'>('select')

  // AI mode state
  const [pastedText, setPastedText] = useState('')
  const [aiRows, setAiRows] = useState<AiRow[]>([])
  const [aiResolved, setAiResolved] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [dataError, setDataError] = useState('')
  const [copied, setCopied] = useState(false)

  // Manual mode state
  const [manualRows, setManualRows] = useState<ManualRow[]>([{ ...EMPTY_MANUAL }])

  const [saving, setSaving] = useState(false)

  async function handleAiConfirm() {
    if (!pastedText.trim()) { setDataError(isKo ? '데이터를 입력해주세요.' : 'Please enter data.'); return }
    const parsed = pastedText.split('\n').map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('`'))
      .map((l) => { const c = l.split('/'); return { nameKo: c[0]?.trim() ?? '', amount: c[1]?.trim() ?? '', unit: normalizeUnit(c[2]?.trim() ?? ''), carbs: c[3]?.trim() ?? '', protein: c[4]?.trim() ?? '', fat: c[5]?.trim() ?? '' } })
      .filter((r) => r.nameKo.length > 0)
    if (parsed.length === 0) { setDataError(isKo ? '파싱할 수 있는 데이터가 없습니다.' : 'No data could be parsed.'); return }
    const missingUnit = parsed.filter((r) => !r.unit)
    if (missingUnit.length > 0) { setDataError(isKo ? `단위 누락: ${missingUnit.map((r) => r.nameKo).join(', ')}` : `Unit missing: ${missingUnit.map((r) => r.nameKo).join(', ')}`); return }
    setConfirming(true); setTranslating(true)
    try {
      const translations = await Promise.all(parsed.map((r) => translateKoToEn(r.nameKo)))
      setAiRows(parsed.map((r, i) => ({ ...r, nameEn: translations[i], enAmount: toEnAmount(Number.parseFloat(r.amount) || 0, r.unit), enUnit: toEnUnit(r.unit) })))
      setAiResolved(true); setDataError('')
    } finally { setConfirming(false); setTranslating(false) }
  }

  function handleAiRowChange<K extends keyof AiRow>(i: number, key: K, val: AiRow[K]) {
    setAiRows((prev) => prev.map((r, j) => j === i ? { ...r, [key]: val } : r))
  }

  function handleManualRowChange<K extends keyof ManualRow>(i: number, key: K, val: ManualRow[K]) {
    setManualRows((prev) => prev.map((r, j) => j === i ? { ...r, [key]: val } : r))
  }

  async function handleSaveAi() {
    setSaving(true)
    try {
      for (const row of aiRows) {
        await saveIngredientToFirestore({ name: (row.nameEn || row.nameKo).toLowerCase(), nameKo: row.nameKo, baseAmount: Number.parseFloat(row.amount) || 100, baseUnit: row.unit || 'g', carbs: Number.parseFloat(row.carbs) || 0, protein: Number.parseFloat(row.protein) || 0, fat: Number.parseFloat(row.fat) || 0 })
      }
      showToast(isKo ? '저장되었습니다.' : 'Saved!', 'success')
      setPastedText(''); setAiRows([]); setAiResolved(false)
    } catch { showToast(isKo ? '저장 실패. 다시 시도해주세요.' : 'Save failed.', 'error') }
    finally { setSaving(false) }
  }

  async function handleSaveManual() {
    const valid = manualRows.filter((r) => r.nameKo.trim() && r.carbs && r.protein && r.fat)
    if (valid.length === 0) { showToast(isKo ? '입력 내용을 확인해주세요.' : 'Check your input.', 'error'); return }
    setSaving(true)
    try {
      for (const row of valid) {
        const nameEn = await translateKoToEn(row.nameKo)
        await saveIngredientToFirestore({ name: nameEn.toLowerCase(), nameKo: row.nameKo, baseAmount: Number.parseFloat(row.amount) || 100, baseUnit: row.unit || 'g', carbs: Number.parseFloat(row.carbs) || 0, protein: Number.parseFloat(row.protein) || 0, fat: Number.parseFloat(row.fat) || 0 })
      }
      showToast(isKo ? '저장되었습니다.' : 'Saved!', 'success')
      setManualRows([{ ...EMPTY_MANUAL }])
    } catch { showToast(isKo ? '저장 실패. 다시 시도해주세요.' : 'Save failed.', 'error') }
    finally { setSaving(false) }
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // 선택 화면
  if (mode === 'select') {
    return (
      <section className="page">
        <h2 className="page__heading">{isKo ? '식재료 추가' : 'Add Ingredient'}</h2>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
          {isKo ? '식재료를 어떻게 추가할까요?' : 'How would you like to add ingredients?'}
        </p>
        <div className="add-recipe__select-cards">
          <button type="button"
            className="flex flex-col items-start gap-2 p-8 border-[1.5px] border-primary rounded-xl bg-primary/8 text-left cursor-pointer transition-all hover:shadow-md hover:border-foreground/40"
            onClick={() => setMode('ai')}>
            <span className="text-3xl leading-none">🤖</span>
            <span className="text-base font-semibold text-primary">{isKo ? 'AI로 여러 개 한번에 추가' : 'Add multiple with AI'}</span>
            <span className="text-sm text-muted-foreground leading-relaxed">
              {isKo ? 'ChatGPT에게 영양 정보를 받아 한 번에 여러 식재료를 추가합니다' : 'Get nutrition info from ChatGPT and add multiple at once'}
            </span>
          </button>
          <button type="button"
            className="flex flex-col items-start gap-2 p-8 border-[1.5px] border-border rounded-xl bg-card text-left cursor-pointer transition-all hover:shadow-md hover:border-muted-foreground/40"
            onClick={() => setMode('manual')}>
            <span className="text-3xl leading-none">✏️</span>
            <span className="text-base font-semibold text-foreground">{isKo ? '직접 입력하기' : 'Enter manually'}</span>
            <span className="text-sm text-muted-foreground leading-relaxed">
              {isKo ? '식재료명과 영양 정보를 직접 입력합니다' : 'Type in ingredient name and nutrition info'}
            </span>
          </button>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      </section>
    )
  }

  // AI 모드
  if (mode === 'ai') {
    return (
      <section className="page">
        <div className="add-recipe__mode-header">
          <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('select'); setAiResolved(false); setPastedText(''); setAiRows([]); setDataError('') }}>
            ← {isKo ? '뒤로' : 'Back'}
          </Button>
          <h2 className="page__heading" style={{ margin: 0 }}>{isKo ? 'AI로 식재료 추가' : 'Add with AI'}</h2>
        </div>

        {!aiResolved && (
          <>
            <div className="add-recipe__prompt-header">
              <p className="add-recipe__prompt-label">{isKo ? '① AI에게 아래 프롬프트를 복사해서 붙여넣기' : '① Copy prompt below and paste to AI'}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyPrompt}>
                {copied ? (isKo ? '복사됨 ✓' : 'Copied ✓') : (isKo ? '복사' : 'Copy')}
              </Button>
            </div>
            <pre className="add-recipe__prompt-box" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: 'var(--text-body)' }}>{AI_PROMPT}</pre>

            <div className="add-recipe__form">
              <div className="add-recipe__field">
                <label className="add-recipe__label">{isKo ? '② AI 응답 붙여넣기' : '② Paste AI response'}</label>
                <p className="add-recipe__hint">{isKo ? '형식: 식재료명/기준량/단위/탄수화물/단백질/지방' : 'Format: name/amount/unit/carbs/protein/fat'}</p>
                <Textarea value={pastedText} rows={8} className="font-mono text-sm"
                  onChange={(e) => { setPastedText(e.target.value); setDataError('') }}
                  placeholder={'닭가슴살/100/g/0/23/2\n두부/100/g/2/9/4'} />
                {dataError && <p className="add-recipe__field-error">{dataError}</p>}
              </div>
              <Button type="button" onClick={handleAiConfirm} disabled={confirming}>
                {confirming ? (isKo ? '처리 중...' : 'Processing...') : (isKo ? '미리보기' : 'Preview')}
              </Button>
            </div>
          </>
        )}

        {aiResolved && aiRows.length > 0 && (
          <div className="add-recipe__preview">
            <div className="add-recipe__preview-header">
              <h3 className="add-recipe__preview-title">{isKo ? '미리보기' : 'Preview'}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => { setAiResolved(false); setAiRows([]) }}>
                {isKo ? '다시 입력' : 'Reset'}
              </Button>
            </div>

            <p className="add-recipe__table-label">🇰🇷 한국어</p>
            <div className="table-container">
              <table className="data-table recipe-table">
                <thead><tr><th>식재료</th><th>양</th><th style={{ textAlign: 'right' }}>단위</th><th>탄수화물</th><th>단백질</th><th>지방</th><th className="edit-inline__delete-cell"><Button type="button" variant="ghost" size="icon-sm" title="전체 삭제" onClick={() => setAiRows([])}>✕</Button></th></tr></thead>
                <tbody>
                  {aiRows.map((row, i) => (
                    <tr key={i}>
                      <td><Input className="h-7 text-sm" value={row.nameKo} onChange={(e) => handleAiRowChange(i, 'nameKo', e.target.value)} /></td>
                      <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={row.amount} onChange={(e) => handleAiRowChange(i, 'amount', e.target.value)} /></td>
                      <td style={{ textAlign: 'right' }}><UnitSelect value={row.unit} onValueChange={(v) => handleAiRowChange(i, 'unit', v)} language="ko" /></td>
                      <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={row.carbs} onChange={(e) => handleAiRowChange(i, 'carbs', e.target.value)} /></td>
                      <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={row.protein} onChange={(e) => handleAiRowChange(i, 'protein', e.target.value)} /></td>
                      <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={row.fat} onChange={(e) => handleAiRowChange(i, 'fat', e.target.value)} /></td>
                      <td className="edit-inline__delete-cell"><Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setAiRows((p) => p.filter((_, j) => j !== i))}>✕</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="add-recipe__table-label" style={{ marginTop: '2rem' }}>🇺🇸 English</p>
            {translating ? <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Translating...</p> : (
              <div className="table-container">
                <table className="data-table recipe-table">
                  <thead><tr><th>Ingredient</th><th>Amount</th><th style={{ textAlign: 'right' }}>Unit</th><th>Carbs</th><th>Protein</th><th>Fat</th><th /></tr></thead>
                  <tbody>
                    {aiRows.map((row, i) => (
                      <tr key={i}>
                        <td><Input className="h-7 text-sm" value={row.nameEn} onChange={(e) => handleAiRowChange(i, 'nameEn', e.target.value)} /></td>
                        <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={fmt(row.enAmount)} onChange={(e) => handleAiRowChange(i, 'enAmount', Number.parseFloat(e.target.value) || 0)} /></td>
                        <td style={{ textAlign: 'right' }}><UnitSelect value={row.enUnit} onValueChange={(v) => handleAiRowChange(i, 'enUnit', v)} language="en" /></td>
                        <td>{fmt(Number.parseFloat(row.carbs) || 0)}</td>
                        <td>{fmt(Number.parseFloat(row.protein) || 0)}</td>
                        <td>{fmt(Number.parseFloat(row.fat) || 0)}</td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button type="button" size="lg" className="w-full mt-4" onClick={handleSaveAi} disabled={saving || translating}>
              {saving ? (isKo ? '저장 중...' : 'Saving...') : (isKo ? `식재료 ${aiRows.length}개 추가` : `Add ${aiRows.length} ingredient(s)`)}
            </Button>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      </section>
    )
  }

  // 직접 입력 모드
  return (
    <section className="page">
      <div className="add-recipe__mode-header">
        <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('select'); setManualRows([{ ...EMPTY_MANUAL }]) }}>
          ← {isKo ? '뒤로' : 'Back'}
        </Button>
        <h2 className="page__heading" style={{ margin: 0 }}>{isKo ? '직접 입력하기' : 'Enter manually'}</h2>
      </div>

      <div className="table-container" style={{ marginTop: '1rem' }}>
        <table className="data-table recipe-table">
          <thead>
            <tr>
              <th>{isKo ? '식재료명' : 'Name'}</th>
              <th>{isKo ? '기준량' : 'Amount'}</th>
              <th style={{ textAlign: 'right' }}>{isKo ? '단위' : 'Unit'}</th>
              <th>{isKo ? '탄수화물' : 'Carbs'}</th>
              <th>{isKo ? '단백질' : 'Protein'}</th>
              <th>{isKo ? '지방' : 'Fat'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {manualRows.map((row, i) => (
              <tr key={i}>
                <td><Input className="h-7 text-sm" value={row.nameKo} placeholder={isKo ? '닭가슴살' : 'Chicken breast'} onChange={(e) => handleManualRowChange(i, 'nameKo', e.target.value)} /></td>
                <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} value={row.amount} onChange={(e) => handleManualRowChange(i, 'amount', e.target.value)} /></td>
                <td style={{ textAlign: 'right' }}><UnitSelect value={row.unit} onValueChange={(v) => handleManualRowChange(i, 'unit', v)} language="ko" /></td>
                <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} placeholder="0" value={row.carbs} onChange={(e) => handleManualRowChange(i, 'carbs', e.target.value)} /></td>
                <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} placeholder="0" value={row.protein} onChange={(e) => handleManualRowChange(i, 'protein', e.target.value)} /></td>
                <td><Input type="number" className="h-7 w-20 text-sm" min={0} step={0.1} placeholder="0" value={row.fat} onChange={(e) => handleManualRowChange(i, 'fat', e.target.value)} /></td>
                <td className="edit-inline__delete-cell">
                  {manualRows.length > 1 && <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setManualRows((p) => p.filter((_, j) => j !== i))}>✕</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="edit-bottom-bar" style={{ marginTop: '0.75rem' }}>
        <div className="edit-bottom-bar__add">
          <Button type="button" variant="outline" size="sm" onClick={() => setManualRows((p) => [...p, { ...EMPTY_MANUAL }])}>
            + {isKo ? '행 추가' : 'Add row'}
          </Button>
          <Button type="button" size="lg" onClick={handleSaveManual} disabled={saving}>
            {saving ? (isKo ? '저장 중...' : 'Saving...') : (isKo ? '식재료 추가' : 'Add ingredients')}
          </Button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </section>
  )
}
