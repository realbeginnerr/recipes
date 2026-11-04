import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('../src/firebase', () => ({ db: {}, storage: {} }))
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), doc: vi.fn(() => 'post-ref'), getDocs: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn() }))
vi.mock('firebase/storage', () => ({ ref: vi.fn((_storage, path) => path), uploadBytes: vi.fn(async () => ({ ref: 'file-ref' })), getDownloadURL: vi.fn(async () => 'https://example.com/file'), deleteObject: vi.fn(async () => {}) }))
import { setDoc } from 'firebase/firestore'
import { deleteObject, uploadBytes } from 'firebase/storage'
import { safeResourceUrl, saveResource, type ResourcePost } from '../src/services/resourceService'
const post: ResourcePost = { id: 'one', title: 'Guide', body: 'Text', category: 'guide', createdAt: 1, updatedAt: 1, url: '', fileName: '', filePath: '' }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(setDoc).mockResolvedValue() })
it('rejects unsafe links and oversized files before writing', async () => {
  expect(safeResourceUrl('javascript:alert(1)')).toBe('')
  await expect(saveResource({ ...post, url: 'javascript:alert(1)' })).rejects.toThrow('invalid-url')
  await expect(saveResource(post, { size: 21 * 1024 * 1024 } as File)).rejects.toThrow('file-too-large')
  expect(uploadBytes).not.toHaveBeenCalled(); expect(setDoc).not.toHaveBeenCalled()
})
it('uploads an attachment and stores its public URL with the post', async () => {
  const saved = await saveResource(post, new File(['text'], 'guide.txt'))
  expect(saved.url).toBe('https://example.com/file')
  expect(saved.fileName).toBe('guide.txt')
  expect(setDoc).toHaveBeenCalledWith('post-ref', saved)
})
it('cleans up a new upload when the post cannot be saved', async () => {
  vi.mocked(setDoc).mockRejectedValueOnce(new Error('offline'))
  await expect(saveResource(post, new File(['text'], 'guide.txt'))).rejects.toThrow('offline')
  expect(deleteObject).toHaveBeenCalledWith(expect.stringMatching(/^resources\/one\//))
})
