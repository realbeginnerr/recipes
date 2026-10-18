import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const imageUrl = 'https://img1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2FXavmo%2FdJMcajqpEe6%2FAAAAAAAAAAAAAAAAAAAAAAeB6AKPUOqkC3oaiBevV54pN0QTw3Q2XnPJgHdPMNEz%2Fimg.jpg%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1793458799%26allow_ip%3D%26allow_referer%3D%26signature%3D%252Fsquc6iUa3fhDY8WMHcGzgjCakE%253D'
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
const token = execFileSync('gcloud.cmd', ['auth', 'print-access-token'], { encoding: 'utf8', shell: true }).trim()
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
  return response.json()
}
const results = await request(`${base}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'recipes' }], where: { fieldFilter: { field: { fieldPath: 'nameKo' }, op: 'EQUAL', value: { stringValue: '짜장밥' } } } } }) })
const documents = results.map(result => result.document).filter(document => document && !document.fields.deleted?.booleanValue)
assert.equal(documents.length, 1, 'Expected one active 짜장밥 recipe')
const document = documents[0]
const primary = document.fields.imageUrl?.stringValue || document.fields.imageUrls?.arrayValue?.values?.find(value => value.stringValue?.trim())?.stringValue || ''
const images = [...new Set([primary, ...(document.fields.imageUrls?.arrayValue?.values ?? []).map(value => value.stringValue)].filter(value => value?.trim()))]
assert.ok(images.length >= 2, 'Expected existing second thumbnail')
console.log(JSON.stringify({ id: document.name.split('/').pop(), images, replacement: imageUrl }))
if (process.argv.includes('--apply')) {
  const image = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) })
  assert.ok(image.ok && image.headers.get('content-type')?.startsWith('image/'), 'Replacement must be accessible image')
  await image.arrayBuffer()
  writeFileSync(`scripts/jjajang-thumbnail-backup-${Date.now()}.json`, JSON.stringify(document, null, 2))
  const oldSecond = images[1]
  const values = document.fields.imageUrls.arrayValue.values.map(value => value.stringValue === oldSecond ? { stringValue: imageUrl } : value)
  const updated = await request(`${base}/recipes/${document.name.split('/').pop()}?updateMask.fieldPaths=imageUrls&currentDocument.updateTime=${encodeURIComponent(document.updateTime)}`, { method: 'PATCH', body: JSON.stringify({ fields: { imageUrls: { arrayValue: { values } } } }) })
  assert.deepEqual(updated.fields.imageUrls.arrayValue.values, values)
  assert.equal(updated.fields.imageUrl?.stringValue, document.fields.imageUrl?.stringValue)
  console.log('Updated and verified second thumbnail.')
}
