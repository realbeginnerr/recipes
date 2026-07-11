import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { ingredientById } from '../data/ingredients'
import { getIngredientDisplayName } from '../utils/displayNames'
import type { Ingredient } from '../types'

type IngredientSearchModalProps = {
  isOpen: boolean
  onClose: () => void
  onIngredientSelect: (ingredient: Ingredient) => void
  existingIngredientIds?: Set<string>
  multiSelect?: boolean
}

export function IngredientSearchModal({
  isOpen,
  onClose,
  onIngredientSelect,
  existingIngredientIds = new Set(),
  multiSelect = false,
}: IngredientSearchModalProps) {
  const { language, t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [duplicateError, setDuplicateError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filteredIngredients = Array.from(ingredientById.values()).filter((ingredient) => {
    const displayName = getIngredientDisplayName(ingredient, language).toLowerCase()
    return displayName.includes(searchQuery.toLowerCase())
  })

  function handleClose() {
    setSearchQuery('')
    setDuplicateError('')
    setSelectedIds(new Set())
    onClose()
  }

  function handleConfirmMulti() {
    for (const id of selectedIds) {
      const ing = ingredientById.get(id)
      if (ing) onIngredientSelect(ing)
    }
    handleClose()
  }

  function handleSingleClick(ingredient: Ingredient) {
    if (existingIngredientIds.has(ingredient.id)) {
      setDuplicateError(language === 'ko' ? '이미 추가된 식재료입니다.' : 'Already added.')
      return
    }
    onIngredientSelect(ingredient)
    handleClose()
  }

  function handleToggle(ingredient: Ingredient) {
    if (existingIngredientIds.has(ingredient.id)) {
      setDuplicateError(language === 'ko' ? '이미 추가된 식재료입니다.' : 'Already added.')
      return
    }
    setDuplicateError('')
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(ingredient.id)) next.delete(ingredient.id)
      else next.add(ingredient.id)
      return next
    })
  }

  if (!isOpen) return null

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={handleClose}
    >
      <div
        style={{ backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%', height: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)', padding: 0, width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ×
        </button>

        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', paddingRight: '2rem' }}>
          {t.addFood}
        </h2>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setDuplicateError('') }}
          placeholder={language === 'ko' ? '식재료 검색...' : 'Search ingredients...'}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem', marginBottom: duplicateError ? '0.4rem' : '1rem', boxSizing: 'border-box' }}
          autoFocus
        />
        {duplicateError && (
          <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>{duplicateError}</p>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredIngredients.length === 0 ? (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>
              {language === 'ko' ? '검색 결과가 없습니다.' : 'No results found.'}
            </p>
          ) : (
            filteredIngredients.map((ingredient) => {
              const isSelected = selectedIds.has(ingredient.id)
              const isExisting = existingIngredientIds.has(ingredient.id)
              return (
                <button
                  key={ingredient.id}
                  type="button"
                  onClick={() => multiSelect ? handleToggle(ingredient) : handleSingleClick(ingredient)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '6px',
                    background: isSelected ? 'var(--accent-soft)' : '#fff',
                    textAlign: 'left',
                    cursor: isExisting ? 'default' : 'pointer',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    opacity: isExisting ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{getIngredientDisplayName(ingredient, language)}</span>
                  {multiSelect && isSelected && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1rem' }}>✓</span>}
                </button>
              )
            })
          )}
        </div>

        {multiSelect && (
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button type="button" className="modal__btn modal__btn--ghost" onClick={handleClose}>
              {language === 'ko' ? '취소' : 'Cancel'}
            </button>
            <button
              type="button"
              className="modal__btn modal__btn--primary"
              onClick={handleConfirmMulti}
              disabled={selectedIds.size === 0}
            >
              {language === 'ko' ? `추가 (${selectedIds.size})` : `Add (${selectedIds.size})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
