import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'

const environment = await initializeTestEnvironment({ projectId: 'demo-recipes-products', firestore: { host: '127.0.0.1', port: 8089, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } })
const admin = environment.authenticatedContext('admin', { email: 'hijmjo@gmail.com', email_verified: true }).firestore()
const other = environment.authenticatedContext('other', { email: 'other@example.com', email_verified: true }).firestore()
const guest = environment.unauthenticatedContext().firestore()
const policies = { refund: { enabled: true, defectFee: 0, days: 7, refundDays: 3, exceptions: [], exceptionNotice: false, customConsent: false }, exchange: { defectFee: 0 } }
const product = { teaTags: [], name: 'QA tea', sku: 'QA-TEA', version: 1, deleted: false, draft: false, visibility: 'public', publicAfter: 0, publicUntil: 8640000000000000, policies }
try {
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'products', 'public'), product)
    await setDoc(doc(db, 'products', 'private'), { ...product, visibility: 'private' })
    await setDoc(doc(db, 'products', 'draft'), { ...product, draft: true })
    await setDoc(doc(db, 'products', 'scheduled'), { ...product, visibility: 'scheduled', publicAfter: Date.now() + 3600000 })
    await setDoc(doc(db, 'productAdmin', 'public'), { cost: 1234 })
    await setDoc(doc(db, 'productSkus', 'QA-TEA'), { productId: 'public' })
  })
  await assertSucceeds(getDoc(doc(guest, 'products', 'public')))
  for (const id of ['private', 'draft', 'scheduled']) await assertFails(getDoc(doc(guest, 'products', id)))
  await assertFails(getDoc(doc(guest, 'productAdmin', 'public')))
  await assertFails(getDoc(doc(other, 'productAdmin', 'public')))
  await assertFails(getDoc(doc(guest, 'productSkus', 'QA-TEA')))
  await assertSucceeds(getDoc(doc(admin, 'productAdmin', 'public')))
  await assertSucceeds(getDocs(query(collection(guest, 'products'), where('visibility', 'in', ['public', 'scheduled']), where('draft', '==', false), where('deleted', '==', false), where('publicAfter', '<=', Date.now() - 1000), where('publicUntil', '>=', Date.now()))))
  await assertSucceeds(setDoc(doc(admin, 'products', 'new'), product))
  const incomplete = { ...policies, refund: { ...policies.refund, days: null, refundDays: null } }
  const external = { ...product, compositionType: 'single', purchaseUrl: 'https://shop.example.com/tea', policies: incomplete }
  await assertSucceeds(setDoc(doc(admin, 'products', 'external'), external))
  await assertFails(setDoc(doc(other, 'products', 'external-other'), external))
  await assertFails(setDoc(doc(admin, 'products', 'no-purchase-link'), { ...external, purchaseUrl: '' }))
  await assertFails(setDoc(doc(admin, 'products', 'blend-no-policy'), { ...external, compositionType: 'blend' }))
  await assertFails(setDoc(doc(admin, 'products', 'legacy-blend-no-policy'), { ...external, teaTags: ['\uD63C\uD569\uCC28'] }))

  await assertFails(setDoc(doc(other, 'products', 'new-other'), product))
  await assertFails(setDoc(doc(guest, 'products', 'new-guest'), product))
  await assertFails(setDoc(doc(admin, 'products', 'cost-leak'), { ...product, cost: 1234 }))
  await assertFails(setDoc(doc(admin, 'products', 'short-return'), { ...product, policies: { ...policies, refund: { ...policies.refund, days: 3 } } }))
  await assertFails(setDoc(doc(admin, 'products', 'late-refund'), { ...product, policies: { ...policies, refund: { ...policies.refund, refundDays: 7 } } }))
  await assertFails(setDoc(doc(admin, 'products', 'defect-fee'), { ...product, policies: { ...policies, refund: { ...policies.refund, defectFee: 1000 } } }))
  await assertFails(setDoc(doc(admin, 'products', 'all-no-return'), { ...product, policies: { ...policies, refund: { ...policies.refund, enabled: false } } }))
  await assertFails(setDoc(doc(admin, 'shopSettings', 'default'), { policies: { ...policies, refund: { ...policies.refund, days: 2 } } }))
  await assertSucceeds(setDoc(doc(admin, 'shopSettings', 'default'), { policies }))
  console.log('Verified product public/private/draft/schedule access, admin-only costs, list query, write permissions, and statutory policy constraints.')
} finally { await environment.cleanup() }
