import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { toTitleCase } from '../utils/displayNames'
import {
  loadIngredientsFromFirestore,
  saveIngredientToFirestore,
  updateIngredientInFirestore,
  deleteIngredientFromFirestore,
  ingredientByName,
  type FirestoreIngredient,
} from '../services/ingredientService'
import { loadRecipesFromFirestore, type FirestoreRecipe } from '../services/recipeService'
import { saveReport, loadReports, deleteReport, type IngredientReport } from '../services/reportService'
import { Modal } from '../components/Modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UnitSelect } from '../components/UnitSelect'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { isRefinedCarb, isAddedSugarIngredient } from '../data/refinedCarbs'

function dedupeIngredients(isKo: boolean, order: 'alpha-asc' | 'alpha-desc' = 'alpha-asc'): FirestoreIngredient[] {
  const seen = new Set<string>()
  const list: FirestoreIngredient[] = []
  for (const ing of ingredientByName.values()) {
    if (!seen.has(ing.id)) { seen.add(ing.id); list.push(ing) }
  }
  list.sort((a, b) => {
    const cmp = (isKo ? a.nameKo : a.name).localeCompare(isKo ? b.nameKo : b.name, isKo ? 'ko' : 'en')
    return order === 'alpha-asc' ? cmp : -cmp
  })
  return list
}

const UNITS = ['g', 'ml', 'oz', 'lbs', 'T', 't', '컵', '개', '캔', '팩', '꼬집']

type EditRow = FirestoreIngredient & { _dirty?: boolean }

type NewRow = {
  name: string
  nameKo: string
  baseAmount: string
  baseUnit: string
  carbs: string
  protein: string
  fat: string
  gramsPerTbsp: string
  gramsPerTsp: string
  gramsPerCup: string
  gramsPerEach: string
  gramsPerCan: string
  gramsPerPack: string
}

const EMPTY_NEW: NewRow = { name: '', nameKo: '', baseAmount: '100', baseUnit: 'g', carbs: '', protein: '', fat: '', gramsPerTbsp: '', gramsPerTsp: '', gramsPerCup: '', gramsPerEach: '', gramsPerCan: '', gramsPerPack: '' }

const FAVORITES_KEY = 'ingredient_favorites'
function loadFavoritesFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}
function saveFavoritesToStorage(ids: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)))
}

export function IngredientsPage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const isKo = language === 'ko'

  const [ingredients, setIngredients] = useState<FirestoreIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'alpha-asc' | 'alpha-desc'>('alpha-asc')
  const [isEditing, setIsEditing] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [newRow, setNewRow] = useState<NewRow>(EMPTY_NEW)
  const [saving, setSaving] = useState(false)
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; usedIn: FirestoreRecipe[] } | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [reports, setReports] = useState<IngredientReport[]>([])
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [reportTarget, setReportTarget] = useState<FirestoreIngredient | null>(null)
  const [reportNote, setReportNote] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(loadFavoritesFromStorage)
  const [favTab, setFavTab] = useState<'all' | 'favorites'>('all')
  const sectionRef = useRef<HTMLElement>(null)

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFavoritesToStorage(next)
      return next
    })
  }, [])

  useEffect(() => {
    loadIngredientsFromFirestore()
      .then(() => setIngredients(dedupeIngredients(isKo, sortOrder)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    loadReports().then(setReports).catch(console.error)
  }, [isAdmin])

  async function handleReport(ing: FirestoreIngredient, note: string) {
    if (reportedIds.has(ing.id)) return
    try {
      await saveReport(ing.id, ing.nameKo || ing.name, note)
      setReportedIds((prev) => new Set([...prev, ing.id]))
      if (isAdmin) setReports((prev) => [{ id: '', ingredientId: ing.id, ingredientName: ing.nameKo || ing.name, note, reportedAt: Date.now() }, ...prev])
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDismissReport(report: IngredientReport) {
    try {
      if (report.id) await deleteReport(report.id)
      setReports((prev) => prev.filter((r) => r !== report))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!loading) setIngredients(dedupeIngredients(isKo, sortOrder))
  }, [sortOrder, isKo])

  useEffect(() => {
    if (!isEditing) return
    function onMouseDown(e: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        setShowCancelConfirm(true)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isEditing])

  function startEditing() {
    setEditRows(ingredients.map((ing) => ({ ...ing })))
    setNewRow(EMPTY_NEW)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setEditRows([])
    setNewRow(EMPTY_NEW)
  }

  function updateEditRow(id: string, field: keyof FirestoreIngredient, value: string | number | undefined) {
    setEditRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value, _dirty: true } : row)),
    )
  }

  async function handleDeleteRow(id: string) {
    const recipes = await loadRecipesFromFirestore()
    const usedIn = recipes.filter((r) =>
      r.items.some((item) => item.ingredientId === id) ||
      (r.sideItems ?? []).some((item) => item.ingredientId === id)
    )
    if (usedIn.length > 0) {
      setDeleteWarning({ id, usedIn })
    } else {
      setEditRows((prev) => prev.filter((r) => r.id !== id))
    }
  }

  function confirmDelete() {
    if (!deleteWarning) return
    setEditRows((prev) => prev.filter((r) => r.id !== deleteWarning.id))
    setDeleteWarning(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Update changed rows
      const original = new Map(ingredients.map((i) => [i.id, i]))
      for (const row of editRows) {
        const orig = original.get(row.id)
        const changed =
          !orig ||
          orig.name !== row.name ||
          orig.nameKo !== row.nameKo ||
          orig.baseAmount !== row.baseAmount ||
          orig.baseUnit !== row.baseUnit ||
          orig.carbs !== row.carbs ||
          orig.protein !== row.protein ||
          orig.fat !== row.fat ||
          orig.gramsPerTbsp !== row.gramsPerTbsp ||
          orig.gramsPerTsp !== row.gramsPerTsp ||
          orig.gramsPerCup !== row.gramsPerCup ||
          orig.gramsPerEach !== row.gramsPerEach ||
          orig.gramsPerCan !== row.gramsPerCan ||
          orig.gramsPerPack !== row.gramsPerPack
        if (changed) {
          const { _dirty: _, ...data } = row
          await updateIngredientInFirestore(row.id, data)
        }
      }

      // Delete removed rows
      const editIds = new Set(editRows.map((r) => r.id))
      for (const orig of ingredients) {
        if (!editIds.has(orig.id)) {
          await deleteIngredientFromFirestore(orig.id)
        }
      }

      // Add new row if filled
      if (newRow.name.trim()) {
        await saveIngredientToFirestore({
          name: newRow.name.trim(),
          nameKo: newRow.nameKo.trim() || newRow.name.trim(),
          baseAmount: Number.parseFloat(newRow.baseAmount) || 100,
          baseUnit: newRow.baseUnit || 'g',
          carbs: Number.parseFloat(newRow.carbs) || 0,
          protein: Number.parseFloat(newRow.protein) || 0,
          fat: Number.parseFloat(newRow.fat) || 0,
          ...(newRow.gramsPerTbsp ? { gramsPerTbsp: Number.parseFloat(newRow.gramsPerTbsp) } : {}),
          ...(newRow.gramsPerTsp ? { gramsPerTsp: Number.parseFloat(newRow.gramsPerTsp) } : {}),
          ...(newRow.gramsPerCup ? { gramsPerCup: Number.parseFloat(newRow.gramsPerCup) } : {}),
          ...(newRow.gramsPerEach ? { gramsPerEach: Number.parseFloat(newRow.gramsPerEach) } : {}),
          ...(newRow.gramsPerCan ? { gramsPerCan: Number.parseFloat(newRow.gramsPerCan) } : {}),
          ...(newRow.gramsPerPack ? { gramsPerPack: Number.parseFloat(newRow.gramsPerPack) } : {}),
        })
      }

      setIngredients(dedupeIngredients(isKo, sortOrder))
      setIsEditing(false)
      setEditRows([])
      setNewRow(EMPTY_NEW)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const displayRows = isEditing
    ? editRows
    : (favTab === 'favorites' ? ingredients.filter((i) => favorites.has(i.id)) : ingredients)

  return (
    <section className="page" ref={sectionRef}>
      <div className="ing-page__toolbar">
        <ToggleGroup
          value={[favTab]}
          onValueChange={(vals) => { if (vals.length > 0) setFavTab(vals[0] as 'all' | 'favorites') }}
          className="gap-2"
        >
          <ToggleGroupItem value="all" className="rounded-full border border-border h-auto px-[14px] py-1 text-[0.85rem] text-muted-foreground font-normal aria-pressed:border-primary aria-pressed:bg-[var(--accent-soft)] aria-pressed:text-primary aria-pressed:font-semibold hover:bg-transparent">
            {isKo ? '전체' : 'All'}
          </ToggleGroupItem>
          <ToggleGroupItem value="favorites" className="rounded-full border border-border h-auto px-[14px] py-1 text-[0.85rem] text-muted-foreground font-normal aria-pressed:border-primary aria-pressed:bg-[var(--accent-soft)] aria-pressed:text-primary aria-pressed:font-semibold hover:bg-transparent">
            ★ {isKo ? '즐겨찾기' : 'Favorites'}
          </ToggleGroupItem>
        </ToggleGroup>
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha-asc">{isKo ? '이름순 (ㄱ→ㅎ)' : 'Name (A→Z)'}</SelectItem>
            <SelectItem value="alpha-desc">{isKo ? '이름순 (ㅎ→ㄱ)' : 'Name (Z→A)'}</SelectItem>
          </SelectContent>
        </Select>
        {isEditing ? (
          <div className="recipe-block__edit-actions">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              {isKo ? '취소' : 'Cancel'}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '...' : (isKo ? '저장' : 'Save')}
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button type="button" variant="ghost" size="icon-sm" onClick={startEditing} aria-label="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Button>
            <button
              type="button"
              onClick={() => navigate('/add-ingredient')}
              style={{ fontSize: '0.85rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}
            >
              {isKo ? '+ 식재료 추가' : '+ Add Ingredient'}
            </button>
          </div>
        )}
      </div>

      {isAdmin && reports.length > 0 && (
        <div className="ing-reports-panel">
          <p className="ing-reports-panel__title">{isKo ? '신고된 식재료' : 'Reported Ingredients'} ({reports.length})</p>
          <ul className="ing-reports-panel__list">
            {reports.map((r, i) => (
              <li key={r.id || i} className="ing-reports-panel__item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{r.ingredientName}</span>
                  {r.note && <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'pre-wrap' }}>{r.note}</p>}
                </div>
                <span className="ing-reports-panel__date">{new Date(r.reportedAt).toLocaleDateString(isKo ? 'ko-KR' : 'en-US')}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDismissReport(r)} title={isKo ? '해결됨' : 'Dismiss'}>✓</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <svg className="empty-state__icon empty-state__icon--spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
          <p className="empty-state__text">{isKo ? '불러오는 중...' : 'Loading...'}</p>
        </div>
      ) : (
        <div className="table-container table-container--sticky-header">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>{isKo ? '식재료' : 'Ingredient'}</TableHead>
                <TableHead style={{ textAlign: 'right' }}>{isKo ? '양' : 'Amount'}</TableHead>
                <TableHead style={{ textAlign: 'right' }}>{isKo ? '단위' : 'Unit'}</TableHead>
                <TableHead>{isKo ? '탄수화물' : 'Carbs'}</TableHead>
                <TableHead>{isKo ? '단백질' : 'Protein'}</TableHead>
                <TableHead>{isKo ? '지방' : 'Fat'}</TableHead>
                <TableHead style={{ textAlign: 'center' }}>1T=?g</TableHead>
                <TableHead style={{ textAlign: 'center' }}>1t=?g</TableHead>
                <TableHead style={{ textAlign: 'center' }}>1컵=?g</TableHead>
                <TableHead style={{ textAlign: 'center' }}>1개=?g</TableHead>
                <TableHead style={{ textAlign: 'center' }}>1캔=?g</TableHead>
                <TableHead style={{ textAlign: 'center' }}>1팩=?g</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((ing) =>
                isEditing ? (
                  <TableRow key={ing.id}>
                    <TableCell style={{ color: isAddedSugarIngredient(ing.nameKo) ? '#dc2626' : isRefinedCarb(ing.nameKo, ing.name, ing.isRefinedCarb) ? '#ea580c' : undefined }}>
                      <Input
                        value={ing.nameKo || ing.name}
                        onChange={(e) => updateEditRow(ing.id, 'nameKo', e.target.value)}
                        placeholder="한글 이름"
                      />
                      {isKo && (
                        <Input
                          style={{ marginTop: '3px', opacity: 0.6, fontSize: '0.85rem' }}
                          value={ing.name}
                          onChange={(e) => updateEditRow(ing.id, 'name', e.target.value)}
                          placeholder="English name"
                        />
                      )}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={1}
                        value={ing.baseAmount}
                        onChange={(e) => updateEditRow(ing.id, 'baseAmount', Number.parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      <UnitSelect
                        value={ing.baseUnit}
                        onValueChange={(v) => updateEditRow(ing.id, 'baseUnit', v)}
                        language={language}
                        options={UNITS}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        value={ing.carbs}
                        onChange={(e) => updateEditRow(ing.id, 'carbs', Number.parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        value={ing.protein}
                        onChange={(e) => updateEditRow(ing.id, 'protein', Number.parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        value={ing.fat}
                        onChange={(e) => updateEditRow(ing.id, 'fat', Number.parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        placeholder="-"
                        value={ing.gramsPerTbsp ?? ''}
                        onChange={(e) => updateEditRow(ing.id, 'gramsPerTbsp', e.target.value === '' ? undefined : Number.parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        placeholder="-"
                        value={ing.gramsPerTsp ?? ''}
                        onChange={(e) => updateEditRow(ing.id, 'gramsPerTsp', e.target.value === '' ? undefined : Number.parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        placeholder="-"
                        value={ing.gramsPerCup ?? ''}
                        onChange={(e) => updateEditRow(ing.id, 'gramsPerCup', e.target.value === '' ? undefined : Number.parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        placeholder="-"
                        value={ing.gramsPerEach ?? ''}
                        onChange={(e) => updateEditRow(ing.id, 'gramsPerEach', e.target.value === '' ? undefined : Number.parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        placeholder="-"
                        value={ing.gramsPerCan ?? ''}
                        onChange={(e) => updateEditRow(ing.id, 'gramsPerCan', e.target.value === '' ? undefined : Number.parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <Input
                        type="number"
                        className="w-16"
                        min={0}
                        step={0.1}
                        placeholder="-"
                        value={ing.gramsPerPack ?? ''}
                        onChange={(e) => updateEditRow(ing.id, 'gramsPerPack', e.target.value === '' ? undefined : Number.parseFloat(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteRow(ing.id)}
                      >
                        ✕
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={ing.id}>
                    <TableCell style={{ color: isAddedSugarIngredient(ing.nameKo) ? '#dc2626' : isRefinedCarb(ing.nameKo, ing.name, ing.isRefinedCarb) ? '#ea580c' : undefined }}>
                      {isKo && ing.nameKo ? ing.nameKo : toTitleCase(ing.name)}
                      {isKo && ing.name && (
                        <span style={{ display: 'block', fontSize: '0.78rem', opacity: 0.5 }}>{toTitleCase(ing.name)}</span>
                      )}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>{ing.baseAmount}</TableCell>
                    <TableCell style={{ textAlign: 'right' }}>{ing.baseUnit}</TableCell>
                    <TableCell>{Number(ing.carbs).toFixed(1)}</TableCell>
                    <TableCell>{Number(ing.protein).toFixed(1)}</TableCell>
                    <TableCell>{Number(ing.fat).toFixed(1)}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>{ing.gramsPerTbsp ?? '-'}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>{ing.gramsPerTsp ?? '-'}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>{ing.gramsPerCup ?? '-'}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>{ing.gramsPerEach ?? '-'}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>{ing.gramsPerCan ?? '-'}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>{ing.gramsPerPack ?? '-'}</TableCell>
                    <TableCell style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleFavorite(ing.id)}
                        title={favorites.has(ing.id) ? (isKo ? '즐겨찾기 해제' : 'Remove from favorites') : (isKo ? '즐겨찾기 추가' : 'Add to favorites')}
                        style={{ color: favorites.has(ing.id) ? '#f59e0b' : 'var(--border)' }}
                      >
                        {favorites.has(ing.id) ? '★' : '☆'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className={`ing-report-btn${reportedIds.has(ing.id) ? ' ing-report-btn--reported' : ''}`}
                        onClick={() => !reportedIds.has(ing.id) && setReportTarget(ing)}
                        title={isKo ? '잘못된 정보 신고' : 'Report incorrect data'}
                        disabled={reportedIds.has(ing.id)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 3v18M4 3l16 6-16 6" strokeWidth="0"/>
                          <path d="M4 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                          <path d="M4 4l14 5-14 5V4z" fill="currentColor"/>
                        </svg>
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}
              {isEditing && (
                <TableRow className="recipe-table__division-row">
                  <TableCell>
                    <Input
                      placeholder={isKo ? '이름' : 'Name'}
                      value={newRow.nameKo}
                      onChange={(e) => setNewRow((p) => ({ ...p, nameKo: e.target.value, name: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Input
                      type="number"
                      className="w-16"
                      min={0}
                      value={newRow.baseAmount}
                      onChange={(e) => setNewRow((p) => ({ ...p, baseAmount: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <UnitSelect
                      value={newRow.baseUnit}
                      onValueChange={(v) => setNewRow((p) => ({ ...p, baseUnit: v }))}
                      language={language}
                      options={UNITS}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="0"
                      value={newRow.carbs}
                      onChange={(e) => setNewRow((p) => ({ ...p, carbs: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="0"
                      value={newRow.protein}
                      onChange={(e) => setNewRow((p) => ({ ...p, protein: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="0"
                      value={newRow.fat}
                      onChange={(e) => setNewRow((p) => ({ ...p, fat: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="-"
                      value={newRow.gramsPerTbsp}
                      onChange={(e) => setNewRow((p) => ({ ...p, gramsPerTbsp: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="-"
                      value={newRow.gramsPerTsp}
                      onChange={(e) => setNewRow((p) => ({ ...p, gramsPerTsp: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="-"
                      value={newRow.gramsPerCup}
                      onChange={(e) => setNewRow((p) => ({ ...p, gramsPerCup: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="-"
                      value={newRow.gramsPerEach}
                      onChange={(e) => setNewRow((p) => ({ ...p, gramsPerEach: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="-"
                      value={newRow.gramsPerCan}
                      onChange={(e) => setNewRow((p) => ({ ...p, gramsPerCan: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="-"
                      value={newRow.gramsPerPack}
                      onChange={(e) => setNewRow((p) => ({ ...p, gramsPerPack: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {isEditing && (
        <div className="ing-page__toolbar ing-page__toolbar--bottom">
          <div className="recipe-block__edit-actions">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              {isKo ? '취소' : 'Cancel'}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '...' : (isKo ? '저장' : 'Save')}
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showCancelConfirm}
        message={isKo ? '계속 수정하시겠습니까?' : 'Do you want to continue editing?'}
        actions={[
          { label: isKo ? '계속 수정' : 'Keep editing', variant: 'ghost', onClick: () => setShowCancelConfirm(false) },
          { label: isKo ? '저장 안 하고 나가기' : 'Leave without saving', onClick: () => { setShowCancelConfirm(false); handleCancel() } },
        ]}
      />

      <Modal
        isOpen={!!deleteWarning}
        onClose={() => setDeleteWarning(null)}
        message={isKo ? '이 식재료는 다음 레시피에서 사용 중입니다:' : 'This ingredient is used in the following recipes:'}
        actions={[
          { label: isKo ? '취소' : 'Cancel', variant: 'ghost', onClick: () => setDeleteWarning(null) },
          { label: isKo ? '삭제' : 'Delete', variant: 'danger', onClick: confirmDelete },
        ]}
      >
        <ul className="ing-delete-modal__list">
          {deleteWarning?.usedIn.map((r) => (
            <li key={r.id}>
              <a href={`/recipes/#${r.id}`} target="_blank" rel="noopener noreferrer" className="ing-delete-modal__link">
                {isKo ? (r.nameKo || r.name) : r.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="modal__body" style={{ marginTop: '0.5rem' }}>
          {isKo ? '그래도 삭제하시겠습니까?' : 'Delete anyway?'}
        </p>
      </Modal>

      <Modal
        isOpen={!!reportTarget}
        onClose={() => { setReportTarget(null); setReportNote('') }}
        title={isKo ? '식재료 정보 오류 신고' : 'Report Incorrect Data'}
        message={isKo
          ? `'${reportTarget?.nameKo || reportTarget?.name}'의 어떤 정보가 잘못되어 있나요?`
          : `What's incorrect about '${reportTarget?.name}'?`}
        actions={[
          { label: isKo ? '취소' : 'Cancel', variant: 'ghost', onClick: () => { setReportTarget(null); setReportNote('') } },
          { label: isKo ? '신고하기' : 'Report', onClick: () => { handleReport(reportTarget!, reportNote.trim()); setReportTarget(null); setReportNote('') }, disabled: !reportNote.trim() },
        ]}
      >
        <Textarea
          className="add-recipe__textarea"
          rows={3}
          style={{ width: '100%', fontSize: '0.875rem' }}
          placeholder={isKo ? '예) 탄수화물 수치가 실제와 다릅니다. 100g 기준 약 20g이어야 합니다.' : 'e.g. The carbs value seems wrong. It should be around 20g per 100g.'}
          value={reportNote}
          onChange={(e) => setReportNote(e.target.value)}
        />
      </Modal>
    </section>
  )
}
