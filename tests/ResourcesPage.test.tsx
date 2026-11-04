import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ResourcesPage } from '../src/pages/ResourcesPage'
import { deleteResource, loadResources, saveResource, type ResourcePost } from '../src/services/resourceService'

const admin = vi.hoisted(() => ({ isAdmin: false }))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => admin }))
vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'ko' }) }))
vi.mock('../src/services/resourceService', async importOriginal => ({
  ...await importOriginal<typeof import('../src/services/resourceService')>(),
  loadResources: vi.fn(), saveResource: vi.fn(), deleteResource: vi.fn(),
}))
vi.mock('../src/firebase', () => ({ db: {}, storage: {} }))
const post: ResourcePost = { id: 'one', title: '조리 가이드', body: '안내 내용', category: 'guide', createdAt: 1700000000000, updatedAt: 1700000000000, url: 'https://example.com/guide.pdf', fileName: 'guide.pdf', filePath: '' }
beforeEach(() => {
  vi.clearAllMocks(); admin.isAdmin = false
  vi.mocked(loadResources).mockResolvedValue([post])
})
it('lets visitors search, read attachments, and return to the board without admin controls', async () => {
  render(<ResourcesPage />)
  expect(screen.queryByRole('button', { name: '자료 등록' })).toBeNull()
  fireEvent.click(await screen.findByRole('button', { name: /조리 가이드/ }))
  expect(screen.getByText('안내 내용')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'guide.pdf' }).getAttribute('href')).toBe(post.url)
  expect(screen.queryByRole('button', { name: '수정' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /목록으로/ }))
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '없는 자료' } })
  expect(screen.getByText('검색 결과가 없습니다.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '전체 자료 보기' }))
  expect(screen.getByRole('button', { name: /조리 가이드/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '서식' }))
  expect(screen.getByText('검색 결과가 없습니다.')).toBeTruthy()
})
it('preserves an admin draft on failure, then publishes and allows editing and deletion', async () => {
  admin.isAdmin = true
  vi.mocked(saveResource).mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(async value => value)
  vi.mocked(deleteResource).mockResolvedValue()
  render(<ResourcesPage />)
  await screen.findByRole('button', { name: /조리 가이드/ })
  const addButton = screen.getByRole('button', { name: '자료 등록' })
  expect(addButton.parentElement).toBe(screen.getByRole('searchbox').closest('.resources-toolbar'))
  expect(screen.getByRole('searchbox').compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '자료 등록' }))
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '새 자료' } })
  fireEvent.change(screen.getByLabelText('내용'), { target: { value: '본문' } })
  const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
  fireEvent.change(screen.getByLabelText('첨부 파일 (최대 20MB)'), { target: { files: [file] } })
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  await screen.findByRole('alert')
  expect((screen.getByLabelText('제목') as HTMLInputElement).value).toBe('새 자료')
  fireEvent.click(screen.getByRole('button', { name: '저장' }))
  await screen.findByRole('heading', { name: '새 자료' })
  expect(saveResource).toHaveBeenLastCalledWith(expect.objectContaining({ title: '새 자료', body: '본문' }), file)
  fireEvent.click(screen.getByRole('button', { name: '수정' }))
  expect((screen.getByLabelText('제목') as HTMLInputElement).value).toBe('새 자료')
  fireEvent.click(screen.getByRole('button', { name: '취소' }))
  fireEvent.click(screen.getByRole('button', { name: '삭제' }))
  await waitFor(() => expect(deleteResource).toHaveBeenCalled())
  await screen.findByRole('button', { name: /조리 가이드/ })
  expect(screen.queryByRole('button', { name: /새 자료/ })).toBeNull()
})
it('returns from registration using the back button without saving a post', async () => {
  admin.isAdmin = true
  render(<ResourcesPage />)
  await screen.findByRole('button', { name: /조리 가이드/ })
  fireEvent.click(screen.getByRole('button', { name: '자료 등록' }))
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: 'Unsaved draft' } })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  try {
    fireEvent.click(screen.getByRole('button', { name: /뒤로가기/ }))
    expect((screen.getByLabelText('제목') as HTMLInputElement).value).toBe('Unsaved draft')
    fireEvent.click(screen.getByRole('button', { name: /뒤로가기/ }))
    expect(screen.getByRole('button', { name: /조리 가이드/ })).toBeTruthy()
    expect(screen.queryByLabelText('제목')).toBeNull()
    expect(saveResource).not.toHaveBeenCalled()
  } finally { confirm.mockRestore() }
})

it('shows a retryable load error rather than claiming the board is empty', async () => {
  vi.mocked(loadResources).mockRejectedValueOnce(new Error('permission-denied'))
  render(<ResourcesPage />)
  await screen.findByRole('alert')
  expect(screen.queryByText('아직 등록된 자료가 없습니다.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await screen.findByRole('button', { name: /조리 가이드/ })
})
