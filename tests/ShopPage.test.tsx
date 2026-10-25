import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ShopPage } from '../src/pages/ShopPage'
import { LanguageProvider } from '../src/context/LanguageContext'
import { searchTaggedProducts } from '../src/services/taggedProductService'
vi.mock('../src/services/taggedProductService', () => ({ searchTaggedProducts: vi.fn() }))
beforeEach(() => vi.mocked(searchTaggedProducts).mockResolvedValue([
  { id: 'cup', productName: '등록한 그릇', brandName: '브랜드', category: '그릇', thumbnailUrl: '', productUrl: 'https://example.com/buy', price: 1000, deleted: false, updatedAt: 2 },
  { id: 'legacy', productName: '기존 상품', thumbnailUrl: '', productUrl: 'https://example.com/legacy', deleted: false, updatedAt: 1 },
  { id: 'deleted', productName: '삭제한 상품', thumbnailUrl: '', productUrl: 'https://example.com/deleted', deleted: true, updatedAt: 0 },
  { id: 'invalid', productName: '잘못된 링크', thumbnailUrl: '', productUrl: 'javascript:alert(1)', deleted: false, updatedAt: 0 },
]))
it('등록 상품 카드는 상세페이지 대신 구매 URL을 새 탭으로 연다', async () => {
  render(<LanguageProvider><ShopPage /></LanguageProvider>)
  const link = await screen.findByRole('link', { name: /등록한 그릇/ })
  expect(link.getAttribute('href')).toBe('https://example.com/buy')
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(screen.getAllByRole('link')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: '그릇', exact: true }))
  expect(screen.queryByRole('link', { name: /기존 상품/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '기타', exact: true }))
  expect(screen.getByRole('link', { name: /기존 상품/ })).toBeDefined()
})
