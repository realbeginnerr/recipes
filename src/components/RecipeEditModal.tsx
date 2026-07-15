import { useState } from 'react'
import { ingredientById, ingredients } from '../data/ingredients'
import { useLanguage } from '../context/LanguageContext'
import { getIngredientDisplayName } from '../utils/displayNames'
import type { Recipe, RecipeItem } from '../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UnitSelect } from './UnitSelect'

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
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'ko' ? recipe.nameKo : recipe.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-2">
            <label className="text-sm font-medium">이미지 URL</label>
            <Input
              type="text"
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

          <section className="space-y-2">
            <label className="text-sm font-medium">{t.colIngredient}</label>
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
                        <Input
                          type="number"
                          className="w-20"
                          min={0}
                          step="0.1"
                          value={item.defaultAmount}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                        />
                      </td>
                      <td>
                        <UnitSelect
                          value={item.defaultUnit}
                          onValueChange={(v) => handleUnitChange(index, v)}
                          language={language}
                          options={ing.allowedUnits}
                        />
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(index)}
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="relative mt-2">
              <Input
                type="search"
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
