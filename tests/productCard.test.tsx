import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { RecipeCard } from '../src/components/recipe/RecipeGrid'
import { LanguageProvider } from '../src/context/LanguageContext'
import type { Recipe } from '../src/types'

const item: Recipe = { id: 'tea-qa', name: 'Tea', nameKo: '테스트 차', imageUrl: '', items: [], categories: ['차'] }
function showCard(pricing?: Recipe['productPricing'], variant: 'recipe' | 'product' = 'product') {
  render(<MemoryRouter><LanguageProvider><RecipeCard recipe={{ ...item, productPricing: pricing }} variant={variant} /></LanguageProvider></MemoryRouter>)
}
afterEach(() => vi.restoreAllMocks())
it('shows the saved regular price without recipe nutrition or ratings', () => {
  showCard({ regular: 12000, discount: null, discountStart: '', discountEnd: '', tax: 'taxable' })
  expect(screen.getByText('12,000원')).toBeDefined()
  expect(document.querySelector('.recipe-card__rating')).toBeNull()
  expect(document.querySelector('.catalog-card-summary')).toBeNull()
})
it('shows an active discount and the struck-through original price', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-09T12:00:00+09:00'))
  showCard({ regular: 12000, discount: 9000, discountStart: '2026-10-08T00:00', discountEnd: '2026-10-10T23:59', tax: 'taxable' })
  expect(screen.getByText('9,000원')).toBeDefined()
  expect(screen.getByText('12,000원').tagName).toBe('DEL')
})
it('uses the regular price when the discount period is over', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-09T12:00:00+09:00'))
  showCard({ regular: 12000, discount: 9000, discountStart: '2026-10-07T00:00', discountEnd: '2026-10-08T23:59', tax: 'taxable' })
  expect(screen.getByText('12,000원')).toBeDefined()
  expect(screen.queryByText('9,000원')).toBeNull()
})
it('shows zero-won products without treating them as missing prices', () => {
  showCard({ regular: 0, discount: null, discountStart: '', discountEnd: '', tax: 'taxable' })
  expect(screen.getByText('0원')).toBeDefined()
})
it('does not invent a price for legacy recipe copies without pricing', () => {
  showCard()
  expect(screen.getByText('가격 미정')).toBeDefined()
})
it('preserves the recipe card display', () => {
  showCard(undefined, 'recipe')
  expect(document.querySelector('.product-card-price')).toBeNull()
  expect(document.querySelector('.recipe-card__rating')).not.toBeNull()
})

it('uses only filter-chip tea tags for product card badges', () => {
  const recipe = { ...item, teaTags: ['홍차', '카페인', '차', '전체', '연한 카페인'] } as unknown as Recipe
  const { container } = render(<MemoryRouter><LanguageProvider><RecipeCard recipe={recipe} variant="product" /></LanguageProvider></MemoryRouter>)
  expect(Array.from(container.querySelectorAll('.catalog-category')).map(node => node.textContent)).toEqual(['홍차', '카페인'])
})
it('uses the same known tea tags as filtering for the legacy copied tea', () => {
  const { container } = render(<MemoryRouter><LanguageProvider><RecipeCard recipe={{ ...item, id: 'tea-Tm2NJxtbz7kzRt2aJfxg' }} variant="product" /></LanguageProvider></MemoryRouter>)
  expect(Array.from(container.querySelectorAll('.catalog-category')).map(node => node.textContent)).toEqual(['기타'])
})
