import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'

export const resourceCategories = ['guide', 'template', 'reference', 'other'] as const
export type ResourceCategory = typeof resourceCategories[number]
export type ResourcePost = {
  id: string; title: string; body: string; category: ResourceCategory
  createdAt: number; updatedAt: number; url: string; fileName: string; filePath: string
}
export function safeResourceUrl(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
export async function loadResources(): Promise<ResourcePost[]> {
  const result = await getDocs(collection(db, 'resources'))
  return result.docs.map(item => ({ ...item.data(), id: item.id }) as ResourcePost)
    .sort((a, b) => b.createdAt - a.createdAt)
}
export async function saveResource(post: ResourcePost, file?: File) {
  if (!post.title.trim() || !post.body.trim()) throw new Error('missing-fields')
  if (post.url && !safeResourceUrl(post.url)) throw new Error('invalid-url')
  if (file && file.size > 20 * 1024 * 1024) throw new Error('file-too-large')
  const saved = { ...post, title: post.title.trim(), body: post.body.trim(), updatedAt: Date.now() }
  let uploadedPath = ''
  try {
    if (file) {
      uploadedPath = `resources/${post.id}/${crypto.randomUUID()}`
      const uploaded = await uploadBytes(ref(storage, uploadedPath), file, { contentType: file.type || 'application/octet-stream', contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}` })
      saved.url = await getDownloadURL(uploaded.ref)
      saved.fileName = file.name
      saved.filePath = uploadedPath
    }
    await setDoc(doc(db, 'resources', post.id), saved)
    return saved
  } catch (error) {
    if (uploadedPath) await deleteObject(ref(storage, uploadedPath)).catch(() => {})
    throw error
  }
}
export async function deleteResource(post: ResourcePost) {
  await deleteDoc(doc(db, 'resources', post.id))
  if (post.filePath.startsWith(`resources/${post.id}/`)) {
    await deleteObject(ref(storage, post.filePath)).catch(error => console.error('Resource attachment cleanup failed', error))
  }
}
