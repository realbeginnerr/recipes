import { useState } from 'react'
import { ingredientById, ingredients } from '../data/ingredients'
import { useLanguage } from '../context/LanguageContext'
import { getIngredientDisplayName } from '../utils/displayNames'
import type { Recipe, RecipeItem } from '../types'

type Props = {
  recipe: Recipe
  onSave: (updated: Recipe) => void
  onClose: () => void
}

export function RecipeEditModal({ recipe, onSave, onClose }: Props) {
  const { language, t } = useLanguage()
  const [imageUrl, setImageUrl] = useState(recipe.imageUrl)
  const [items, setItems] = useState<RecipeItem[]>(recipe.items)
  const [addSearch, setAddSearch] = useState('')

  const filteredIngredients = addSearch.trim()
    ? ingredients.filter((ing) =>
        ing.name.toLowerCase().includes(addSearch.toLowerCase()) ||
        (ing.nameKo ?? '').includes(addSearch),
      )
    : []

  function handleAmountChange(index: number, value: string) {
    const parsed = value === '' ? 0 : Number.parseFloat(value)
    if (Number.isNaN(parsed) || parsed < 0) return
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, defaultAmount: parsed } : item)),
    )
  }

  function handleUnitChange(index: number, unit: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, defaultUnit: unit } : item)),
    )
  }

  function handleDelete(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddIngredient(ingredientId: string) {
    if (items.some((item) => item.ingredientId === ingredientId)) return
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    setItems((prev) => [
      ...prev,
      {
        ingredientId,
        defaultAmount: 100,
        defaultUnit: ing.allowedUnits[0],
      },
    ])
    setAddSearch('')
  }

  function handleSave() {
    onSave({ ...recipe, imageUrl, items })
  }

  return (
    <div className="edit-modal__backdrop" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal__header">
          <h2 className="edit-modal__title">
            {language === 'ko' ? recipe.nameKo : recipe.name}
          </h2>
          <button type="button" className="edit-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="edit-modal__body">
          <section className="edit-modal__section">
            <label className="edit-modal__label">이미지 URL</label>
            <input
              type="text"
              className="edit-modal__input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="preview"
                className="edit-modal__image-preview"
              />
            )}
          </section>

          <section className="edit-modal__section">
            <label className="edit-modal__label">{t.colIngredient}</label>
            <table className="edit-modal__table">
              <thead>
                <tr>
                  <th>식재료</th>
                  <th>양</th>
                  <th>단위</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const ing = ingredientById.get(item.ingredientId)
                  if (!ing) return null
                  return (
                    <tr key={item.ingredientId}>
                      <td>{getIngredientDisplayName(ing, language)}</td>
                      <td>
                        <input
                          type="number"
                          className="amount-input"
                          min={0}
                          step="0.1"
                          value={item.defaultAmount}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="unit-select"
                          value={item.defaultUnit}
                          onChange={(e) => handleUnitChange(index, e.target.value)}
                        >
                          {ing.allowedUnits.map((unit) => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="edit-modal__delete-btn"
                          onClick={() => handleDelete(index)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="edit-modal__add">
              <input
                type="search"
                className="edit-modal__input"
                placeholder="식재료 검색해서 추가..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
              />
              {filteredIngredients.length > 0 && (
                <ul className="edit-modal__suggestions">
                  {filteredIngredients.slice(0, 8).map((ing) => (
                    <li key={ing.id}>
                      <button
                        type="button"
                        className="edit-modal__suggestion-btn"
                        onClick={() => handleAddIngredient(ing.id)}
                      >
                        {getIngredientDisplayName(ing, language)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="edit-modal__footer">
          <button type="button" className="edit-modal__cancel-btn" onClick={onClose}>
            취소
          </button>
          <button type="button" className="edit-modal__save-btn" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
