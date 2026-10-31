import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recipe } from '../src/types'
import { ingredientById } from '../src/data/ingredientCache'

vi.mock('../src/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => {
  const setDoc = vi.fn()
  return {
    collection: vi.fn(() => 'recipes'), doc: vi.fn((...args: unknown[]) => {
      if (typeof args[2] === 'string' && /^__.*__$/.test(args[2])) {
        throw Object.assign(new Error('Reserved Firestore document ID'), { code: 'invalid-argument' })
      }
      return args.length === 1 ? { id: 'new-recipe' } : args[2] === 'recipe-name-guard' ? 'guard-ref' : 'recipe-ref'
    }),
    getDocs: vi.fn(), getDocsFromServer: vi.fn(), orderBy: vi.fn(), query: vi.fn(), setDoc,
    runTransaction: vi.fn(async (_db, callback) => callback({
      get: vi.fn(async () => ({ data: () => ({ revision: 0 }) })),
      set: (ref: unknown, ...args: unknown[]) => { if (ref !== 'guard-ref') setDoc(ref, ...args) },
    })),
  }
})

import { setDoc, getDocsFromServer, runTransaction } from 'firebase/firestore'
import { saveRecipeToFirestore, updateRecipeInFirestore, convertToRecipe, type FirestoreRecipe } from '../src/services/recipeService'

const recipe = (): Recipe => ({
  id: 'eggplant', name: 'Eggplant Stir-Fry', nameKo: '가지볶음', imageUrl: '',
  items: [
    { ingredientId: 'green-onion', defaultAmount: NaN, defaultUnit: 'g' },
    { ingredientId: 'replacement-soy-sauce', defaultAmount: 80, defaultUnit: 'g' },
  ],
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getDocsFromServer).mockResolvedValue({ docs: [] } as never)
  ingredientById.clear()
  for (const id of ['green-onion', 'replacement-soy-sauce']) {
    ingredientById.set(id, { id, name: id, baseAmount: 100, baseUnit: 'g', carbs: 10, protein: 0, fat: 0, conversions: { g: 1 }, allowedUnits: ['g'] })
  }
})

describe('saving a recipe with existing invalid quantities', () => {
  it('blocks a unit without a conversion before writing', async () => {
    const missing = recipe()
    missing.items[0].defaultAmount = 100
    missing.items[1].defaultUnit = 'T'
    await expect(updateRecipeInFirestore(missing)).rejects.toMatchObject({ code: 'recipe/missing-conversion' })
    expect(setDoc).not.toHaveBeenCalled()
  })
  it('rejects NaN with an identifiable error before writing to Firestore', async () => {
    await expect(updateRecipeInFirestore(recipe())).rejects.toMatchObject({ code: 'recipe/invalid-amount' })
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('saves the replacement ingredient after the invalid quantity is corrected', async () => {
    const corrected = recipe()
    corrected.items[0].defaultAmount = 30
    corrected.items[0].cookingGroup = ' 양념장 '
    await updateRecipeInFirestore(corrected)
    expect(setDoc).toHaveBeenCalledWith('recipe-ref', expect.objectContaining({ items: [
      { ingredientId: 'green-onion', amount: 30, unit: 'g', cookingGroup: '양념장' },
      { ingredientId: 'replacement-soy-sauce', amount: 80, unit: 'g' },
    ] }))
  })
})

it('persists image IDs and product references without embedding product details', async () => {
  const corrected = recipe()
  corrected.nameKo = '사진 테스트'
  corrected.name = 'Photo test'
  corrected.items[0].defaultAmount = 30
  corrected.imageUrl = 'https://example.com/photo.jpg'
  corrected.images = [{ id: 'photo-1', url: corrected.imageUrl }]
  corrected.productTags = [{ id: 'tag-1', imageId: 'photo-1', productId: 'product-1', positionX: 20, positionY: 80 }]
  await updateRecipeInFirestore(corrected)
  expect(setDoc).toHaveBeenCalledWith('recipe-ref', expect.objectContaining({
    images: corrected.images, productTags: corrected.productTags,
  }))
})

describe('recipe name uniqueness at the write boundary', () => {
  const existing = (nameKo: string, name: string, id = 'other', deleted = false) => {
    vi.mocked(getDocsFromServer).mockResolvedValue({ docs: [{ id, data: () => ({ nameKo, name, deleted }) }] } as never)
  }
  const corrected = () => { const value = recipe(); value.items[0].defaultAmount = 30; return value }
  const newRecipe = () => ({ nameKo: '가지볶음', name: 'Eggplant Stir-Fry', imageUrl: '', memo: '', tasteRating: 4, items: [] })
  it.each(['nameKo', 'name'] as const)('blocks creation when only %s matches', async field => {
    existing(field === 'nameKo' ? '가지볶음' : '다른 이름', field === 'name' ? 'Eggplant Stir-Fry' : 'Other')
    await expect(saveRecipeToFirestore(newRecipe())).rejects.toMatchObject({ code: 'recipe/duplicate-name', fields: [field] })
    expect(setDoc).not.toHaveBeenCalled()
  })
  it.each(['nameKo', 'name'] as const)('blocks renaming when only %s matches', async field => {
    existing(field === 'nameKo' ? '가지볶음' : '다른 이름', field === 'name' ? 'Eggplant Stir-Fry' : 'Other')
    await expect(updateRecipeInFirestore(corrected())).rejects.toMatchObject({ code: 'recipe/duplicate-name', fields: [field] })
    expect(setDoc).not.toHaveBeenCalled()
  })
  it('allows saving the same recipe without changing its names', async () => {
    existing('가지볶음', 'Eggplant Stir-Fry', 'eggplant')
    await updateRecipeInFirestore(corrected())
    expect(setDoc).toHaveBeenCalled()
  })
  it('checks static recipes even when they are not in Firestore', async () => {
    await expect(saveRecipeToFirestore({ ...newRecipe(), nameKo: '파스타 샐러드' })).rejects.toMatchObject({ code: 'recipe/duplicate-name', fields: ['nameKo'] })
    expect(setDoc).not.toHaveBeenCalled()
  })
  it('fails closed when the authoritative name scan cannot reach the server', async () => {
    vi.mocked(getDocsFromServer).mockRejectedValueOnce(new Error('offline'))
    await expect(saveRecipeToFirestore(newRecipe())).rejects.toThrow('offline')
    expect(setDoc).not.toHaveBeenCalled()
  })
  it('reads the shared guard before scanning names and writes it with the recipe', async () => {
    const get = vi.fn(async () => ({ data: () => ({ revision: 8 }) }))
    const set = vi.fn()
    vi.mocked(runTransaction).mockImplementationOnce(async (_db, callback) => callback({ get, set } as never))
    await saveRecipeToFirestore(newRecipe())
    expect(get).toHaveBeenCalledWith('guard-ref')
    expect(get.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(getDocsFromServer).mock.invocationCallOrder[0])
    expect(set).toHaveBeenCalledWith('guard-ref', { deleted: true, items: [], revision: 9 })
    expect(set).toHaveBeenCalledWith('recipe-ref', expect.objectContaining({ nameKo: '가지볶음' }))
  })
  it('rescans names on a transaction retry after another tab saved the same name', async () => {
    const transaction = { get: vi.fn(async () => ({ data: () => ({ revision: 1 }) })), set: vi.fn() }
    vi.mocked(runTransaction).mockImplementationOnce(async (_db, callback) => {
      await callback(transaction as never)
      transaction.set.mockClear()
      existing('가지볶음', 'Other')
      return callback(transaction as never)
    })
    await expect(saveRecipeToFirestore(newRecipe())).rejects.toMatchObject({ code: 'recipe/duplicate-name', fields: ['nameKo'] })
    expect(getDocsFromServer).toHaveBeenCalledTimes(2)
    expect(transaction.set).not.toHaveBeenCalled()
  })
  it('does not compare a Firestore recipe against its own static fallback', async () => {
    existing('파스타 샐러드', 'Pasta salad', 'imported-pasta')
    await updateRecipeInFirestore({ ...corrected(), id: 'imported-pasta', nameKo: '파스타 샐러드', name: 'Pasta salad' })
    expect(setDoc).toHaveBeenCalled()
  })
})

it('persists authored group order when saving a recipe', async () => {
  const corrected = recipe()
  corrected.items[0].defaultAmount = 30
  corrected.cookingGroupOrder = ['반죽', '양념장']
  await updateRecipeInFirestore(corrected)
  expect(setDoc).toHaveBeenCalledWith('recipe-ref', expect.objectContaining({ cookingGroupOrder: ['반죽', '양념장'] }))
})

it('persists, loads and clears temporary photo product information', async () => {
  const corrected = recipe()
  corrected.items[0].defaultAmount = 30
  corrected.photoProductDescription = '컵 설명\nhttps://example.com/cup'
  corrected.photoProductUrl = 'https://example.com/buy'
  await updateRecipeInFirestore(corrected)
  const stored = vi.mocked(setDoc).mock.calls[0][1] as unknown as FirestoreRecipe
  expect(convertToRecipe(stored).photoProductDescription).toBe(corrected.photoProductDescription)
  expect(convertToRecipe(stored).photoProductUrl).toBe(corrected.photoProductUrl)
  corrected.photoProductDescription = ''
  corrected.photoProductUrl = ''
  await updateRecipeInFirestore(corrected)
  expect(setDoc).toHaveBeenLastCalledWith('recipe-ref', expect.objectContaining({ photoProductDescription: '', photoProductUrl: '' }))
})
