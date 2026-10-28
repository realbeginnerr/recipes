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

console.log(JSON.stringify(documents.filter(item => item.collection === 'taggedProducts').map(({ document }) => ({ id: document.name.split('/').at(-1), name: document.fields.productName?.stringValue, category: document.fields.category?.stringValue, deleted: document.fields.deleted?.booleanValue, updateTime: document.updateTime })), null, 2))
if (process.argv.includes('--apply')) {
  const target = documents.find(item => item.collection === 'taggedProducts' && item.document.name.endsWith('/b46da564-c3d7-492c-a4c6-85df17a1354b'))?.document
  if (!target || target.fields.productName?.stringValue !== '플레이스 매트 원형 네이비 가죽') throw new Error('상품 확인 실패')
  await request(':commit', { method: 'POST', body: JSON.stringify({ writes: [{ update: { name: target.name, fields: { category: { stringValue: '매트' } } }, updateMask: { fieldPaths: ['category'] }, currentDocument: { updateTime: target.updateTime } }] }) })
  const actual = await request('/taggedProducts/b46da564-c3d7-492c-a4c6-85df17a1354b')
  if (actual.fields.category?.stringValue !== '매트') throw new Error('태그 확인 실패')
  console.log('플레이스 매트 원형 네이비 가죽: 매트 태그 적용 확인 완료')
}
