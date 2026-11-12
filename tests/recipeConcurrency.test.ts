import { beforeEach, expect, it, vi } from 'vitest'
import { ingredientById } from '../src/data/ingredientCache'
import { convertToRecipe, updateRecipeInFirestore } from '../src/services/recipeService'
import type { Recipe } from '../src/types'

const state = vi.hoisted(() => ({ stored: { revision: 0 } as Record<string, unknown>, writes: [] as { ref: string; data: any }[] }))
vi.mock('../src/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, _collection: string, id: string) => id,
  collection: () => 'recipes', orderBy: vi.fn(), query: vi.fn(), getDocs: vi.fn(),
  getDocsFromServer: vi.fn(async () => ({ docs: [] })),
  runTransaction: vi.fn(async (_db, callback) => {
    const pending: typeof state.writes = []
    await callback({ get: async (ref: string) => ({ data: () => ref === 'recipe-name-guard' ? { revision: 0 } : state.stored }), set: (ref: string, data: any) => pending.push({ ref, data }) })
    state.writes.push(...pending)
    const write = pending.find(write => write.ref === 'editing')
    if (write) state.stored = write.data
  }),
}))
const draft = (): Recipe => ({ id: 'editing', name: 'Concurrency recipe', nameKo: '동시 수정 테스트', revision: 0, imageUrl: '', items: [] })
beforeEach(() => { state.stored = { revision: 0 }; state.writes = []; ingredientById.clear() })
it('rejects a stale second tab after the first tab saves, without overwriting the first edit', async () => {
  const first = draft(), stale = draft()
  first.memo = 'First tab saved'; stale.memo = 'Stale tab changes'
  await updateRecipeInFirestore(first)
  expect(state.stored.revision).toBe(1)
  state.writes = []
  await expect(updateRecipeInFirestore(stale)).rejects.toMatchObject({ code: 'recipe/conflict' })
  expect(state.stored.memo).toBe('First tab saved')
  expect(state.writes).toEqual([])
  expect(stale.memo).toBe('Stale tab changes')
})
it('does not revive a deleted recipe from an older edit screen', async () => {
  state.stored = { deleted: true, revision: 1 }
  await expect(updateRecipeInFirestore(draft())).rejects.toMatchObject({ code: 'recipe/deleted' })
  expect(state.writes).toEqual([])
  expect(state.stored.deleted).toBe(true)
})
it('reads legacy stored recipes at revision zero and preserves the version on conversion', () => {
  const data = { id: 'editing', name: 'Legacy', nameKo: '기존', imageUrl: '', createdAt: 1, items: [], memo: '', tasteRating: 4 }
  expect(convertToRecipe(data).revision).toBe(0)
  expect(convertToRecipe({ ...data, revision: 3 }).revision).toBe(3)
})
