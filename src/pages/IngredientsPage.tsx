import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import {
  loadIngredientsFromFirestore,
  saveIngredientToFirestore,
  updateIngredientInFirestore,
  deleteIngredientFromFirestore,
  ingredientByName,
  type FirestoreIngredient,
} from '../services/ingredientService'

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

const UNITS = ['g', 'ml', 'oz', 'lbs', 'T', 't', '컵', '개', '꼬집']

type EditRow = FirestoreIngredient & { _dirty?: boolean }

type NewRow = {
  name: string
  nameKo: string
  baseAmount: string
  baseUnit: string
  carbs: string
  protein: string
  fat: string
}

const EMPTY_NEW: NewRow = { name: '', nameKo: '', baseAmount: '100', baseUnit: 'g', carbs: '', protein: '', fat: '' }

export function IngredientsPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'

  const [ingredients, setIngredients] = useState<FirestoreIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'alpha-asc' | 'alpha-desc'>('alpha-asc')
  const [isEditing, setIsEditing] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [newRow, setNewRow] = useState<NewRow>(EMPTY_NEW)
  const [saving, setSaving] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    loadIngredientsFromFirestore()
      .then(() => setIngredients(dedupeIngredients(isKo, sortOrder)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) setIngredients(dedupeIngredients(isKo, sortOrder))
  }, [sortOrder, isKo])

  useEffect(() => {
    if (!isEditing) return
    function onMouseDown(e: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
        handleCancel()
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

  function updateEditRow(id: string, field: keyof FirestoreIngredient, value: string | number) {
    setEditRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value, _dirty: true } : row)),
    )
  }

  function handleDeleteRow(id: string) {
    setEditRows((prev) => prev.filter((r) => r.id !== id))
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
          orig.fat !== row.fat
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

  const displayRows = isEditing ? editRows : ingredients

  return (
    <section className="page" ref={sectionRef}>
      <div className="recipe-sort">
        <select
          className="recipe-sort__select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
        >
          <option value="alpha-asc">{isKo ? '이름순 (ㄱ→ㅎ)' : 'Name (A→Z)'}</option>
          <option value="alpha-desc">{isKo ? '이름순 (ㅎ→ㄱ)' : 'Name (Z→A)'}</option>
        </select>
      </div>
      <div className="ing-page__toolbar">
        {isEditing ? (
          <div className="recipe-block__edit-actions">
            <button type="button" className="edit-inline__cancel-btn" onClick={handleCancel}>
              {isKo ? '취소' : 'Cancel'}
            </button>
            <button type="button" className="edit-inline__save-btn" onClick={handleSave} disabled={saving}>
              {saving ? '...' : (isKo ? '저장' : 'Save')}
            </button>
          </div>
        ) : (
          <button type="button" className="recipe-block__edit-btn" onClick={startEditing} aria-label="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <svg className="empty-state__icon empty-state__icon--spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
          <p className="empty-state__text">{isKo ? '불러오는 중...' : 'Loading...'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isKo ? '식재료' : 'Ingredient'}</th>
                <th style={{ textAlign: 'right' }}>{isKo ? '양' : 'Amount'}</th>
                <th style={{ textAlign: 'right' }}>{isKo ? '단위' : 'Unit'}</th>
                <th>{isKo ? '탄수화물' : 'Carbs'}</th>
                <th>{isKo ? '단백질' : 'Protein'}</th>
                <th>{isKo ? '지방' : 'Fat'}</th>
                {isEditing && <th />}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((ing) =>
                isEditing ? (
                  <tr key={ing.id}>
                    <td>
                      <input
                        className="edit-inline__input"
                        value={ing.nameKo || ing.name}
                        onChange={(e) => updateEditRow(ing.id, isKo ? 'nameKo' : 'name', e.target.value)}
                        placeholder={isKo ? '한글 이름' : 'Name'}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        className="amount-input"
                        min={0}
                        step={1}
                        value={ing.baseAmount}
                        onChange={(e) => updateEditRow(ing.id, 'baseAmount', Number.parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select
                        className="unit-select"
                        value={ing.baseUnit}
                        onChange={(e) => updateEditRow(ing.id, 'baseUnit', e.target.value)}
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="amount-input"
                        min={0}
                        step={0.1}
                        value={ing.carbs}
                        onChange={(e) => updateEditRow(ing.id, 'carbs', Number.parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="amount-input"
                        min={0}
                        step={0.1}
                        value={ing.protein}
                        onChange={(e) => updateEditRow(ing.id, 'protein', Number.parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="amount-input"
                        min={0}
                        step={0.1}
                        value={ing.fat}
                        onChange={(e) => updateEditRow(ing.id, 'fat', Number.parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="edit-inline__delete-btn"
                        onClick={() => handleDeleteRow(ing.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={ing.id}>
                    <td>{isKo && ing.nameKo ? ing.nameKo : ing.name}</td>
                    <td style={{ textAlign: 'right' }}>{ing.baseAmount}</td>
                    <td style={{ textAlign: 'right' }}>{ing.baseUnit}</td>
                    <td>{Number(ing.carbs).toFixed(1)}</td>
                    <td>{Number(ing.protein).toFixed(1)}</td>
                    <td>{Number(ing.fat).toFixed(1)}</td>
                  </tr>
                ),
              )}
              {isEditing && (
                <tr className="recipe-table__division-row">
                  <td>
                    <input
                      className="edit-inline__input"
                      placeholder={isKo ? '이름' : 'Name'}
                      value={newRow.nameKo}
                      onChange={(e) => setNewRow((p) => ({ ...p, nameKo: e.target.value, name: e.target.value }))}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      className="amount-input"
                      min={0}
                      value={newRow.baseAmount}
                      onChange={(e) => setNewRow((p) => ({ ...p, baseAmount: e.target.value }))}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <select
                      className="unit-select"
                      value={newRow.baseUnit}
                      onChange={(e) => setNewRow((p) => ({ ...p, baseUnit: e.target.value }))}
                    >
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="amount-input"
                      placeholder="0"
                      value={newRow.carbs}
                      onChange={(e) => setNewRow((p) => ({ ...p, carbs: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="amount-input"
                      placeholder="0"
                      value={newRow.protein}
                      onChange={(e) => setNewRow((p) => ({ ...p, protein: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="amount-input"
                      placeholder="0"
                      value={newRow.fat}
                      onChange={(e) => setNewRow((p) => ({ ...p, fat: e.target.value }))}
                    />
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
