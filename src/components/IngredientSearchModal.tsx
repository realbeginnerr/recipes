import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { ingredientById } from '../data/ingredients'
import { getIngredientDisplayName } from '../utils/displayNames'
import type { Ingredient } from '../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

const FAVORITES_KEY = 'ingredient_favorites'

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites(ids: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)))
}

type IngredientSearchModalProps = {
  isOpen: boolean
  onClose: () => void
  onIngredientSelect: (ingredient: Ingredient) => void
  existingIngredientIds?: Set<string>
  multiSelect?: boolean
  title?: string
}

export function IngredientSearchModal({
  isOpen,
  onClose,
  onIngredientSelect,
  existingIngredientIds = new Set(),
  multiSelect = false,
  title,
}: IngredientSearchModalProps) {
  const { language, t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [duplicateError, setDuplicateError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'all' | 'favorites'>('all')
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)

  const allIngredients = Array.from(ingredientById.values())

  const visibleIngredients = allIngredients.filter((ingredient) => {
    const displayName = getIngredientDisplayName(ingredient, language).toLowerCase()
    const matchesSearch = displayName.includes(searchQuery.toLowerCase())
    const matchesTab = tab === 'all' || favorites.has(ingredient.id)
    return matchesSearch && matchesTab
  })

  function toggleFavorite(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFavorites(next)
      return next
    })
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent showCloseButton={false} className="flex flex-col gap-0 p-0 max-w-[500px] h-[540px]">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>{title ?? t.addFood}</DialogTitle>
        </DialogHeader>

        <div className="px-6 flex-shrink-0">
          {/* 탭 */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTab('all')}
              style={{
                padding: '4px 14px', borderRadius: '20px', border: '1px solid',
                fontSize: '0.85rem', cursor: 'pointer',
                borderColor: tab === 'all' ? 'var(--primary)' : 'var(--border)',
                background: tab === 'all' ? 'var(--accent-soft)' : 'none',
                color: tab === 'all' ? 'var(--primary)' : 'var(--muted-foreground)',
                fontWeight: tab === 'all' ? 600 : 400,
              }}
            >
              {language === 'ko' ? '전체' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setTab('favorites')}
              style={{
                padding: '4px 14px', borderRadius: '20px', border: '1px solid',
                fontSize: '0.85rem', cursor: 'pointer',
                borderColor: tab === 'favorites' ? 'var(--primary)' : 'var(--border)',
                background: tab === 'favorites' ? 'var(--accent-soft)' : 'none',
                color: tab === 'favorites' ? 'var(--primary)' : 'var(--muted-foreground)',
                fontWeight: tab === 'favorites' ? 600 : 400,
              }}
            >
              ★ {language === 'ko' ? '즐겨찾기' : 'Favorites'}
            </button>
          </div>

          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setDuplicateError('') }}
            placeholder={language === 'ko' ? '식재료 검색...' : 'Search ingredients...'}
            className="mb-2"
            autoFocus
          />
          {duplicateError && (
            <p className="text-xs text-destructive mb-2">{duplicateError}</p>
          )}
        </div>

        <ScrollArea className="flex-1 px-6 min-h-0">
          {visibleIngredients.length === 0 ? (
            <div className="text-center py-4">
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                {tab === 'favorites'
                  ? (language === 'ko' ? '즐겨찾기한 식재료가 없습니다.' : 'No favorites yet.')
                  : (language === 'ko' ? '검색 결과가 없습니다.' : 'No results found.')}
              </p>
              {tab !== 'favorites' && (
                <a
                  href="/recipes/add-ingredient"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '8px 16px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  + {language === 'ko' ? '식재료 추가' : 'Add ingredient'}
                </a>
              )}
            </div>
          ) : (
            <div className="pb-2">
              {visibleIngredients.map((ingredient) => {
                const isSelected = selectedIds.has(ingredient.id)
                const isExisting = existingIngredientIds.has(ingredient.id)
                const isFav = favorites.has(ingredient.id)
                return (
                  <div key={ingredient.id} className="flex items-center gap-1 mb-2">
                    <button
                      type="button"
                      onClick={() => multiSelect ? handleToggle(ingredient) : handleSingleClick(ingredient)}
                      style={{
                        flex: 1,
                        padding: '0.65rem 0.75rem',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: '6px',
                        background: isSelected ? 'var(--accent-soft)' : '#fff',
                        textAlign: 'left',
                        cursor: isExisting ? 'default' : 'pointer',
                        fontSize: '0.9rem',
                        opacity: isExisting ? 0.4 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{getIngredientDisplayName(ingredient, language)}</span>
                      {isExisting
                        ? <span style={{ color: 'var(--muted-foreground)', fontWeight: 700 }}>✓</span>
                        : (multiSelect && isSelected && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>)
                      }
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, ingredient.id)}
                      title={isFav ? (language === 'ko' ? '즐겨찾기 해제' : 'Remove from favorites') : (language === 'ko' ? '즐겨찾기 추가' : 'Add to favorites')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: isFav ? '#f59e0b' : 'var(--border)', padding: '0.4rem', lineHeight: 1, flexShrink: 0 }}
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {multiSelect && (
          <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
            <Button variant="outline" onClick={handleClose}>
              {language === 'ko' ? '취소' : 'Cancel'}
            </Button>
            <Button onClick={handleConfirmMulti} disabled={selectedIds.size === 0}>
              {language === 'ko' ? `추가 (${selectedIds.size})` : `Add (${selectedIds.size})`}
            </Button>
          </div>
        )}

        {!multiSelect && (
          <div className="px-6 py-4 border-t flex justify-end flex-shrink-0">
            <Button variant="outline" onClick={handleClose}>
              {language === 'ko' ? '닫기' : 'Close'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
