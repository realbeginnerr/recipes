import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ProductTagEditor } from '../src/components/recipe/ProductTagEditor'
import type { RecipeProductTag } from '../src/types/shoppable'
import { searchTaggedProducts, saveTaggedProduct, deleteTaggedProduct } from '../src/services/taggedProductService'
const admin = vi.hoisted(() => ({ value: true }))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: admin.value }) }))
vi.mock('../src/services/taggedProductService', () => ({ searchTaggedProducts: vi.fn(), saveTaggedProduct: vi.fn(), deleteTaggedProduct: vi.fn() }))
vi.mock('../src/services/productService', () => ({ uploadProductImage: vi.fn() }))
const product = { id: 'cup', productName: '공용 컵', brandName: '브랜드', thumbnailUrl: '', productUrl: 'https://example.com/cup', deleted: false, updatedAt: 0 }
beforeEach(() => {
  vi.clearAllMocks(); admin.value = true
  vi.mocked(searchTaggedProducts).mockResolvedValue([product])
  vi.mocked(saveTaggedProduct).mockResolvedValue(product)
  vi.mocked(deleteTaggedProduct).mockResolvedValue()
})
function Editor() {
  const [tags, setTags] = useState<RecipeProductTag[]>([])
  return <><ProductTagEditor images={[{ id: 'photo', url: 'https://example.com/photo.jpg' }]} tags={tags} onChange={setTags} disabled={false} onBusyChange={() => {}} /><output data-testid="tags">{JSON.stringify(tags)}</output></>
}
it('searches shared products and adds, moves, and removes a tag', async () => {
  render(<Editor />)
  await screen.findByRole('option', { name: '공용 컵 · 브랜드' })
  fireEvent.change(screen.getByLabelText('기존 상품 검색'), { target: { value: '없는 상품' } })
  expect(screen.queryByRole('option', { name: '공용 컵 · 브랜드' })).toBeNull()
  fireEvent.change(screen.getByLabelText('기존 상품 검색'), { target: { value: '브랜드' } })
  fireEvent.change(screen.getByLabelText('기존 상품 선택'), { target: { value: 'cup' } })
  const canvas = screen.getByAltText('상품 태그 위치 편집').parentElement!
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100 } as DOMRect)
  fireEvent.click(canvas, { clientX: 50, clientY: 75 })
  expect(JSON.parse(screen.getByTestId('tags').textContent!)[0]).toMatchObject({ imageId: 'photo', productId: 'cup', positionX: 25, positionY: 75 })
  fireEvent.change(screen.getByLabelText('가로 위치 (%)'), { target: { value: '80' } })
  expect(JSON.parse(screen.getByTestId('tags').textContent!)[0].positionX).toBe(80)
  fireEvent.click(screen.getByRole('button', { name: '이 사진의 태그 삭제' }))
  expect(screen.getByTestId('tags').textContent).toBe('[]')
})
it('registers a new shared product without needing a recipe save', async () => {
  render(<Editor />)
  fireEvent.click(screen.getByRole('button', { name: '새 상품 등록' }))
  fireEvent.change(screen.getByLabelText('상품명'), { target: { value: '새 컵' } })
  fireEvent.change(screen.getByLabelText('구매 URL'), { target: { value: 'https://example.com/new' } })
  fireEvent.click(screen.getByRole('button', { name: '공용 상품 저장' }))
  await waitFor(() => expect(saveTaggedProduct).toHaveBeenCalledWith(expect.objectContaining({ productName: '새 컵', productUrl: 'https://example.com/new' }), expect.any(String)))
})
it('requires confirmation for global edits and global deletion', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<Editor />)
  await screen.findByRole('option', { name: '공용 컵 · 브랜드' })
  fireEvent.change(screen.getByLabelText('기존 상품 선택'), { target: { value: 'cup' } })
  fireEvent.click(screen.getByRole('button', { name: '공용 상품 수정' }))
  fireEvent.change(screen.getByLabelText('상품명'), { target: { value: '수정한 컵' } })
  fireEvent.click(screen.getByRole('button', { name: '공용 상품 저장' }))
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('모든 레시피'))
  expect(saveTaggedProduct).not.toHaveBeenCalled()
  confirm.mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: '공용 상품 저장' }))
  await waitFor(() => expect(saveTaggedProduct).toHaveBeenCalledWith(expect.objectContaining({ productName: '수정한 컵' }), 'cup'))
  fireEvent.click(screen.getByRole('button', { name: '공용 상품 삭제' }))
  await waitFor(() => expect(deleteTaggedProduct).toHaveBeenCalledWith('cup'))
  confirm.mockRestore()
})
it('does not render or load the admin catalog for non-admin users', () => {
  admin.value = false
  render(<Editor />)
  expect(screen.queryByText('사진 속 상품 태그')).toBeNull()
  expect(searchTaggedProducts).not.toHaveBeenCalled()
})
it('handles catalog failures without allowing an empty product tag', async () => {
  vi.mocked(searchTaggedProducts).mockRejectedValue(new Error('permission-denied'))
  render(<Editor />)
  expect(await screen.findByRole('alert')).toBeDefined()
  expect((screen.getByRole('button', { name: '가운데에 새 태그 추가' }) as HTMLButtonElement).disabled).toBe(true)
})
