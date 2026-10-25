import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'
const shared = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock('../src/firebase', () => ({ get db() { return shared.db } }))
import { saveTaggedProduct, loadTaggedProduct, searchTaggedProducts, deleteTaggedProduct } from '../src/services/taggedProductService'
import { saveRecipeToFirestore, loadRecipesFromFirestore, convertToRecipe, updateRecipeInFirestore } from '../src/services/recipeService'
const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip
suite('공용 상품과 레시피 태그 저장 전체 흐름', () => {
  let environment: Awaited<ReturnType<typeof initializeTestEnvironment>>
  beforeAll(async () => {
    environment = await initializeTestEnvironment({ projectId: 'demo-shoppable-flow', firestore: { host: '127.0.0.1', port: 8089, rules: await readFile('firestore.rules', 'utf8') } })
    await environment.clearFirestore()
    shared.db = environment.authenticatedContext('admin', { email: 'hijmjo@gmail.com', email_verified: true }).firestore()
  })
  afterAll(async () => { await environment?.cleanup() })
  it('상품 생성 → 두 레시피 연결 → 공용 상품 수정 → 이미지 변경 → 상품 삭제', async () => {
    const product = await saveTaggedProduct({ productName: '테스트 컵', brandName: '테스트 브랜드', thumbnailUrl: '', productUrl: 'https://example.com/buy', price: 1000 }, 'flow-product')
    expect((await searchTaggedProducts('테스트 브랜드')).map(item => item.id)).toEqual([product.id])
    const data = { name: 'Recipe', nameKo: '레시피', imageUrl: 'https://example.com/a.jpg', imageUrls: ['https://example.com/b.jpg'], images: [{ id: 'a', url: 'https://example.com/a.jpg' }, { id: 'b', url: 'https://example.com/b.jpg' }], productTags: [{ id: 'tag', imageId: 'a', productId: product.id, positionX: 25, positionY: 75 }], memo: '', tasteRating: 4, items: [] }
    const first = await saveRecipeToFirestore(data)
    const second = await saveRecipeToFirestore({ ...data, name: 'Second recipe' })
    const docs = await loadRecipesFromFirestore()
    const recipe = convertToRecipe(docs.find(item => item.id === first)!)
    expect(recipe.productTags).toEqual(data.productTags)
    expect(recipe.images).toEqual(data.images)
    await saveTaggedProduct({ productName: '수정된 컵', thumbnailUrl: '', productUrl: 'https://example.com/new' }, product.id)
    for (const id of [first, second]) {
      const reference = docs.find(item => item.id === id)!.productTags![0].productId
      expect((await loadTaggedProduct(reference))?.productName).toBe('수정된 컵')
    }
    await updateRecipeInFirestore({ ...recipe, imageUrl: data.imageUrls[0], imageUrls: [data.imageUrl] })
    const read = async () => (await loadRecipesFromFirestore()).find(item => item.id === first)!
    expect((await read()).images?.map(image => image.id)).toEqual(['b', 'a'])
    expect((await read()).productTags).toEqual(data.productTags)
    await updateRecipeInFirestore({ ...convertToRecipe(await read()), imageUrl: 'https://example.com/replacement.jpg', imageUrls: [] })
    expect((await read()).productTags).toEqual([])
    await deleteTaggedProduct(product.id)
    expect(await loadTaggedProduct(product.id)).toBeNull()
    expect(await searchTaggedProducts()).toEqual([])
    const guest = environment.unauthenticatedContext().firestore()
    expect((await getDoc(doc(guest, 'recipes', second))).exists()).toBe(true)
  })
})
