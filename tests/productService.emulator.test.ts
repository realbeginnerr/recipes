import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'
import { emptyProduct } from '../src/utils/product'
import { saveProduct } from '../src/services/productService'

const shared = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock('../src/firebase', () => ({ get db() { return shared.db }, storage: {} }))
const emulatorSuite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip
emulatorSuite('product save transactions against real rules', () => {
  let environment: Awaited<ReturnType<typeof initializeTestEnvironment>>
  beforeAll(async () => {
    environment = await initializeTestEnvironment({ projectId: 'demo-recipes-products', firestore: { host: '127.0.0.1', port: 8089, rules: await readFile('firestore.rules', 'utf8') } })
    await environment.clearFirestore()
    shared.db = environment.authenticatedContext('transaction-admin', { email: 'hijmjo@gmail.com', email_verified: true }).firestore()
  })
  afterAll(async () => { await environment?.cleanup() })
  it('stores costs privately, rejects duplicate SKUs, and detects stale edits', async () => {
    const original = { ...emptyProduct(), id: 'transaction-qa', sku: 'TRANSACTION-QA', name: '테스트 차' }
    const saved = await saveProduct(original, { cost: 4000 }, 0)
    expect(saved.version).toBe(1)
    expect('cost' in saved).toBe(false)
    const adminDb = environment.authenticatedContext('verify-admin', { email: 'hijmjo@gmail.com', email_verified: true }).firestore()
    expect((await getDoc(doc(adminDb, 'productAdmin', saved.id))).data()?.cost).toBe(4000)
    await expect(saveProduct({ ...original, id: 'duplicate-qa' }, { cost: null }, 0)).rejects.toMatchObject({ reason: 'duplicate-sku' })
    await expect(saveProduct(original, { cost: null }, 0)).rejects.toMatchObject({ reason: 'conflict' })
    const renamed = await saveProduct({ ...saved, sku: 'TRANSACTION-QA-NEW' }, { cost: 4000 }, 1)
    expect(renamed.version).toBe(2)
    expect((await getDoc(doc(adminDb, 'productSkus', 'TRANSACTION-QA'))).exists()).toBe(false)
  })
})
