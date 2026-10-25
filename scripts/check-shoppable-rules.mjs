import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc } from 'firebase/firestore'

// Local emulator only: never connects to the configured production Firebase project.
const environment = await initializeTestEnvironment({ projectId: 'demo-shoppable-permissions', firestore: { host: '127.0.0.1', port: 8089, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } })
const admin = environment.authenticatedContext('admin', { email: 'hijmjo@gmail.com', email_verified: true }).firestore()
const guest = environment.unauthenticatedContext().firestore()
const other = environment.authenticatedContext('other', { email: 'other@example.com', email_verified: true }).firestore()
const unverified = environment.authenticatedContext('unverified', { email: 'hijmjo@gmail.com', email_verified: false }).firestore()
const product = { id: 'permission-product', productName: 'Test', thumbnailUrl: '', productUrl: 'https://example.com/product', deleted: false, updatedAt: 0 }
try {
  await assertSucceeds(setDoc(doc(admin, 'taggedProducts', product.id), product))
  for (const db of [guest, other, unverified]) {
    await assertSucceeds(getDoc(doc(db, 'taggedProducts', product.id)))
    await assertSucceeds(getDocs(collection(db, 'taggedProducts')))
    await assertFails(setDoc(doc(db, 'taggedProducts', product.id), { ...product, productName: 'Unauthorized' }))
    await assertFails(setDoc(doc(db, 'taggedProducts', 'new-product'), { ...product, id: 'new-product' }))
    await assertFails(deleteDoc(doc(db, 'taggedProducts', product.id)))
    await assertFails(setDoc(doc(db, 'recipes', 'permission-recipe'), { productTags: [] }, { merge: true }))
  }
  await assertFails(setDoc(doc(admin, 'taggedProducts', product.id), { ...product, productUrl: 'javascript:alert(1)' }))
  await assertFails(setDoc(doc(admin, 'taggedProducts', product.id), { ...product, price: -1 }))
  await assertSucceeds(setDoc(doc(admin, 'taggedProducts', product.id), { ...product, productName: 'Updated' }))
  await assertSucceeds(setDoc(doc(admin, 'recipes', 'permission-recipe'), { productTags: [{ id: 'tag', imageId: 'image', productId: product.id, positionX: 10, positionY: 20 }] }))
  await assertSucceeds(getDoc(doc(guest, 'recipes', 'permission-recipe')))
  await assertSucceeds(setDoc(doc(admin, 'taggedProducts', product.id), { deleted: true, updatedAt: 1 }, { merge: true }))
  await assertSucceeds(deleteDoc(doc(admin, 'taggedProducts', product.id)))
  console.log('Shoppable permissions: all checks passed on the local emulator.')
} finally { await environment.cleanup() }
