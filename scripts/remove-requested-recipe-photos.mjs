import { execFileSync } from 'node:child_process'
const names = ['얼그레이 스콘', '고추장 오이 무침', '단호박 스프', '오이들깨 무침', '두부 꽈리고추 볶음', '과일 찹쌀떡', '밤식빵', '탕수육', '맥앤치즈', '무전', '단팥빵', '닭갈비', '쫄면', '피자', '멸치볶음', '가지볶음', '감자탕']
const normalize = name => name.replace(/\s+/g, '')
const targets = new Set(names.map(normalize))
const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
async function request(url, body) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
  return response.json()
}
const rows = await request(base + ':runQuery', { structuredQuery: { from: [{ collectionId: 'recipes' }] } })
const docs = rows.flatMap(row => row.document ? [row.document] : [])
const selected = docs.filter(doc => targets.has(normalize(doc.fields.nameKo?.stringValue ?? '')))
for (const name of names) if (!selected.some(doc => normalize(doc.fields.nameKo.stringValue) === normalize(name))) throw new Error(`Recipe missing: ${name}`)
for (const doc of selected) console.log(JSON.stringify({ name: doc.fields.nameKo.stringValue, id: doc.name.split('/').at(-1), imageUrl: doc.fields.imageUrl, imageUrls: doc.fields.imageUrls, images: doc.fields.images }))
if (process.argv.includes('--apply')) {
  const fields = { imageUrl: { stringValue: '' }, imageUrls: { arrayValue: { values: [] } }, images: { arrayValue: { values: [] } }, productTags: { arrayValue: { values: [] } } }
  await request(base + ':commit', { writes: selected.map(doc => ({ update: { name: doc.name, fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime: doc.updateTime } })) })
  for (const doc of selected) {
    const saved = await request('https://firestore.googleapis.com/v1/' + doc.name)
    if (saved.fields.imageUrl?.stringValue !== '' || ['imageUrls', 'images', 'productTags'].some(key => saved.fields[key]?.arrayValue?.values?.length)) throw new Error(`Verification failed: ${doc.name}`)
  }
  console.log(`Verified cleared photos on ${selected.length} recipes.`)
}
