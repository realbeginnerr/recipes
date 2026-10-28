import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
const auth = require('C:/Users/ME/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js')
const account = auth.getGlobalDefaultAccount()
if (!account) throw new Error('Firebase CLI 재로그인이 필요합니다.')
const credentials = account.tokens.expires_at > Date.now() ? account.tokens : await auth.getAccessToken(account.tokens.refresh_token, [])
const project = 'recipes-5a663'
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`
async function request(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { Authorization: `Bearer ${credentials.access_token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Firestore ${response.status}`)
  return response.status === 204 ? null : response.json()
}
const documents = []
for (const collection of ['taggedProducts', 'products', 'recipes']) {
  let pageToken = ''
  do {
    const page = await request(`/${collection}?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`)
    documents.push(...(page.documents ?? []).map(document => ({ collection, document })))
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
}
const matches = documents.filter(({ document }) => ['name', 'nameKo', 'productName'].some(key => /에코\s*백|eco\s*bag|tote\s*bag/i.test(document.fields?.[key]?.stringValue ?? '')))
await writeFile(new URL('ecobag-inspection.json', import.meta.url), JSON.stringify(matches, null, 2))
console.log(JSON.stringify(matches.map(({ collection, document }) => ({ collection, id: document.name.split('/').at(-1), name: document.fields.productName?.stringValue ?? document.fields.nameKo?.stringValue ?? document.fields.name?.stringValue, deleted: document.fields.deleted?.booleanValue ?? false })), null, 2))
if (process.argv.includes('--apply')) {
  if (matches.length !== 1 || matches[0].collection !== 'products' || !matches[0].document.name.endsWith('/shop-eco-bag')) throw new Error('삭제 대상이 예상과 다릅니다. 다시 확인하세요.')
  const target = matches[0].document
  const related = []
  for (const collection of ['productAdmin', 'productSkus', 'productSlugs']) {
    let pageToken = ''
    do {
      const page = await request(`/${collection}?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`)
      for (const document of page.documents ?? []) {
        if ((collection === 'productAdmin' && document.name.endsWith('/shop-eco-bag')) || document.fields?.productId?.stringValue === 'shop-eco-bag') related.push(document)
      }
      pageToken = page.nextPageToken ?? ''
    } while (pageToken)
  }
  const targets = [target, ...related]
  await writeFile(new URL(`ecobag-deletion-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(targets, null, 2))
  await request(':commit', { method: 'POST', body: JSON.stringify({ writes: targets.map(document => ({ delete: document.name, currentDocument: { updateTime: document.updateTime } })) }) })
  for (const document of targets) {
    const response = await fetch(`https://firestore.googleapis.com/v1/${document.name}`, { headers: { Authorization: `Bearer ${credentials.access_token}` }, signal: AbortSignal.timeout(30000) })
    if (response.status !== 404) throw new Error(`삭제 확인 실패: ${response.status}`)
  }
  console.log(JSON.stringify({ deleted: targets.map(document => document.name.split('/documents/')[1]), verified: true }, null, 2))
}
