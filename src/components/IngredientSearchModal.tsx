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
}

export function IngredientSearchModal({
  isOpen,
  onClose,
  onIngredientSelect,
  existingIngredientIds = new Set(),
}: IngredientSearchModalProps) {
  const { language, t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [duplicateError, setDuplicateError] = useState('')

  const filteredIngredients = Array.from(ingredientById.values()).filter(
    (ingredient) => {
      const displayName = getIngredientDisplayName(ingredient, language).toLowerCase()
      const query = searchQuery.toLowerCase()
      return displayName.includes(query)
    },
  )

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '500px',
          width: '90%',
          height: '500px',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--muted)',
            padding: '0',
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
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
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.9rem',
            marginBottom: duplicateError ? '0.4rem' : '1rem',
            boxSizing: 'border-box',
          }}
          autoFocus
        />
        {duplicateError && (
          <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>
            {duplicateError}
          </p>
        )}
        <div
          style={{
            maxHeight: '350px',
            overflowY: 'auto',
          }}
        >
          {filteredIngredients.length === 0 ? (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>
              {language === 'ko' ? '검색 결과가 없습니다.' : 'No results found.'}
            </p>
          ) : (
            filteredIngredients.map((ingredient) => (
              <button
                key={ingredient.id}
                type="button"
                onClick={() => {
                  if (existingIngredientIds.has(ingredient.id)) {
                    setDuplicateError(
                      language === 'ko'
                        ? '이미 레시피에 추가된 식재료입니다.'
                        : 'This ingredient is already in the recipe.'
                    )
                    return
                  }
                  onIngredientSelect(ingredient)
                  onClose()
                  setSearchQuery('')
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                }}
              >
                {getIngredientDisplayName(ingredient, language)}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
