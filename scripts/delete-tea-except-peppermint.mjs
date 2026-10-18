import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
async function request(suffix, options = {}) {
  const response = await fetch(base + suffix, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
async function scan() {
  const tea = []
  for (const collectionId of ['products', 'recipes']) {
    const rows = await request(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId }] } }) })
    for (const { document } of rows) {
      if (!document || document.fields.deleted?.booleanValue) continue
      const f = document.fields
      const tags = (f.teaTags?.arrayValue?.values ?? []).map(value => value.stringValue)
      const categories = (f.categories?.arrayValue?.values ?? []).map(value => value.stringValue)
      if (tags.some(tag => ['홍차', '녹차', '과일차', '혼합차', '카페인', '무카페인'].includes(tag)) || f.catalog?.stringValue === 'tea' || categories.includes('차') || f.compositionType?.stringValue === 'blend') tea.push(document)
    }
  }
  return tea
}
const name = document => document.fields.nameKo?.stringValue ?? document.fields.name?.stringValue ?? ''
const keep = document => ['페퍼민트', '피퍼민트', 'peppermint'].includes(name(document).trim().toLowerCase())
const tea = await scan()
if (!tea.some(keep)) throw new Error('Peppermint not found; no items deleted')
const targets = tea.filter(document => !keep(document))
console.log(JSON.stringify({ keep: tea.filter(keep).map(name), delete: targets.map(name) }))
if (process.argv.includes('--apply') && targets.length) {
  await writeFile(new URL(`tea-deletion-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(targets, null, 2))
  const writes = targets.flatMap(document => {
    const fields = { deleted: { booleanValue: true }, updatedAt: { integerValue: String(Date.now()) } }
    const product = document.name.includes('/products/')
    if (product) {
      fields.visibility = { stringValue: 'private' }
      fields.version = { integerValue: String(Number(document.fields.version?.integerValue ?? 0) + 1) }
    }
    const updates = [{ update: { name: document.name, fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime: document.updateTime } }]
    if (product) {
      const root = document.name.slice(0, document.name.lastIndexOf('/products/'))
      const skus = [document.fields.sku?.stringValue, ...(document.fields.variants?.arrayValue?.values ?? []).map(value => value.mapValue?.fields?.sku?.stringValue)].filter(Boolean)
      for (const sku of new Set(skus)) updates.push({ delete: `${root}/productSkus/${encodeURIComponent(sku.trim().toUpperCase())}` })
      const slug = document.fields.seo?.mapValue?.fields?.slug?.stringValue || document.name.split('/').at(-1)
      updates.push({ delete: `${root}/productSlugs/${encodeURIComponent(slug.trim().toUpperCase())}` })
    }
    return updates
  })
  await request(':commit', { method: 'POST', body: JSON.stringify({ writes }) })
  const remaining = await scan()
  if (!remaining.some(keep) || remaining.some(document => !keep(document))) throw new Error('Deletion verification failed')
  console.log(`Verified: ${targets.length} tea items deleted; peppermint retained.`)
}
