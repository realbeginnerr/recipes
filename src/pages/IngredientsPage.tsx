import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { ingredients as staticIngredients } from '../data/ingredients'
import type { Ingredient } from '../types'

export function IngredientsPage() {
  const { language } = useLanguage()
  const [ingredients, setIngredients] = useState<Ingredient[]>(staticIngredients)
  const [isEditing, setIsEditing] = useState(false)
  const [editList, setEditList] = useState<Ingredient[]>(staticIngredients)
  const [newRow, setNewRow] = useState({ name: '', nameKo: '', carbs: '', protein: '', fat: '' })

  const sorted = [...(isEditing ? editList : ingredients)].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  function startEditing() {
    setEditList(ingredients)
    setNewRow({ name: '', nameKo: '', carbs: '', protein: '', fat: '' })
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
  }

  function handleSave() {
    setIngredients(editList)
    setIsEditing(false)
  }

  function handleDelete(id: string) {
    setEditList((prev) => prev.filter((ing) => ing.id !== id))
  }

  function handleAddRow() {
    const name = newRow.name.trim()
    if (!name) return
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (editList.some((ing) => ing.id === id)) return
    const newIng: Ingredient = {
      id,
      name,
      nameKo: newRow.nameKo.trim() || name,
      baseUnit: 'g',
      baseAmount: 100,
      carbs: Number.parseFloat(newRow.carbs) || 0,
      protein: Number.parseFloat(newRow.protein) || 0,
      fat: Number.parseFloat(newRow.fat) || 0,
      conversions: { g: 1, oz: 28.35 },
      allowedUnits: ['g', 'oz'],
    }
    setEditList((prev) => [...prev, newIng])
    setNewRow({ name: '', nameKo: '', carbs: '', protein: '', fat: '' })
  }

  return (
    <section className="page">
      <div className="ing-page__toolbar">
        {isEditing ? (
          <div className="recipe-block__edit-actions">
            <button type="button" className="edit-inline__cancel-btn" onClick={handleCancel}>
              취소
            </button>
            <button type="button" className="edit-inline__save-btn" onClick={handleSave}>
              저장
            </button>
          </div>
        ) : (
          <button type="button" className="recipe-block__edit-btn" onClick={startEditing} aria-label="Edit ingredients">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{language === 'ko' ? '식재료' : 'Ingredient'}</th>
              <th>{language === 'ko' ? '기준량' : 'Per'}</th>
              <th>{language === 'ko' ? '탄수화물 (g)' : 'Carbs (g)'}</th>
              <th>{language === 'ko' ? '단백질 (g)' : 'Protein (g)'}</th>
              <th>{language === 'ko' ? '지방 (g)' : 'Fat (g)'}</th>
              {isEditing && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((ing) => (
              <tr key={ing.id}>
                <td>{language === 'ko' && ing.nameKo ? ing.nameKo : ing.name}</td>
                <td>{ing.baseAmount}{ing.baseUnit}</td>
                <td>{ing.carbs.toFixed(1)}</td>
                <td>{ing.protein.toFixed(1)}</td>
                <td>{ing.fat.toFixed(1)}</td>
                {isEditing && (
                  <td>
                    <button
                      type="button"
                      className="edit-inline__delete-btn"
                      onClick={() => handleDelete(ing.id)}
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {isEditing && (
              <tr className="recipe-table__division-row">
                <td>
                  <input
                    className="edit-inline__input"
                    placeholder={language === 'ko' ? '영문 이름' : 'Name (EN)'}
                    value={newRow.name}
                    onChange={(e) => setNewRow((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="edit-inline__input"
                    style={{ marginTop: '4px' }}
                    placeholder={language === 'ko' ? '한글 이름' : 'Name (KO)'}
                    value={newRow.nameKo}
                    onChange={(e) => setNewRow((p) => ({ ...p, nameKo: e.target.value }))}
                  />
                </td>
                <td>100g</td>
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
                <td>
                  <button type="button" className="add-food-btn" onClick={handleAddRow}>
                    +
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
