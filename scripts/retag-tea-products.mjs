import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
async function request(suffix, options = {}) {
  const response = await fetch(base + suffix, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
const oldTags = ['홍차', '녹차', '과일차', '혼합차', '카페인', '무카페인']
async function scan() {
  const targets = []
  for (const collectionId of ['products', 'recipes']) {
    const rows = await request(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId }] } }) })
    for (const { document } of rows) {
      if (!document || document.fields.deleted?.booleanValue) continue
      const fields = document.fields
      const tags = (fields.teaTags?.arrayValue?.values ?? []).map(value => value.stringValue)
      const categories = (fields.categories?.arrayValue?.values ?? []).map(value => value.stringValue)
      const tea = tags.some(tag => oldTags.includes(tag)) || fields.compositionType?.stringValue === 'blend' || fields.catalog?.stringValue === 'tea' || categories.includes('차')
      if (tea && JSON.stringify(tags) !== JSON.stringify(['기타'])) targets.push(document)
    }
  }
  return targets
}
const targets = await scan()
console.log(JSON.stringify(targets.map(document => ({ id: document.name.split('/').at(-1), name: document.fields.nameKo?.stringValue ?? document.fields.name?.stringValue }))))
if (process.argv.includes('--apply') && targets.length) {
  await writeFile(new URL(`tea-tags-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(targets, null, 2))
  const now = Date.now()
  const writes = targets.map(document => {
    const fields = { teaTags: { arrayValue: { values: [{ stringValue: '기타' }] } }, updatedAt: { integerValue: String(now) } }
    if (document.name.includes('/products/')) fields.version = { integerValue: String(Number(document.fields.version?.integerValue ?? 0) + 1) }
    return { update: { name: document.name, fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime: document.updateTime } }
  })
  await request(':commit', { method: 'POST', body: JSON.stringify({ writes }) })
  if ((await scan()).length) throw new Error('Tag verification failed')
  console.log(`Updated and verified ${targets.length} tea items with only the 기타 tag.`)
}
