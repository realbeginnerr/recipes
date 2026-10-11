import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

const project = 'recipes-5a663'
const bucket = 'recipes-5a663.firebasestorage.app'
const token = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8' }).trim()
async function request(url, options = {}, allowMissing = false) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': project }, signal: AbortSignal.timeout(30000) })
  if (allowMissing && response.status === 404) return null
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`)
  return response.json()
}
const rulesBase = `https://firebaserules.googleapis.com/v1/projects/${project}`
const targets = [
  { file: 'firestore.rules', release: 'cloud.firestore' },
  { file: 'storage.rules', release: `firebase.storage/${bucket}` },
]
const previous = []
for (const target of targets) previous.push(await request(`${rulesBase}/releases/${target.release}`, {}, true))
const indexBase = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups/products/indexes`
const currentIndexes = await request(indexBase)
const desired = JSON.parse(await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8')).indexes[0]
const sameIndex = (index) => index.queryScope === desired.queryScope && JSON.stringify(index.fields.filter(field => field.fieldPath !== '__name__')) === JSON.stringify(desired.fields)
const index = currentIndexes.indexes?.find(sameIndex)
console.log(JSON.stringify({ project, releases: targets.map(target => target.release), productIndex: index?.state ?? 'not-created', existingIndexesPreserved: true }))
if (!process.argv.includes('--apply')) process.exit(0)
await writeFile(new URL(`product-config-backup-${Date.now()}.json`, import.meta.url), JSON.stringify({ previous, currentIndexes }, null, 2))
// Compile both rule files successfully before changing either active release.
const rulesets = []
for (const target of targets) {
  const content = await readFile(new URL(`../${target.file}`, import.meta.url), 'utf8')
  rulesets.push(await request(`${rulesBase}/rulesets`, { method: 'POST', body: JSON.stringify({ source: { files: [{ name: target.file, content }] } }) }))
}
for (const [i, target] of targets.entries()) {
  const release = { name: `projects/${project}/releases/${target.release}`, rulesetName: rulesets[i].name }
  await request(previous[i] ? `${rulesBase}/releases/${target.release}` : `${rulesBase}/releases`, { method: previous[i] ? 'PATCH' : 'POST', body: JSON.stringify(previous[i] ? { release, updateMask: 'rulesetName' } : release) })
  const actual = await request(`${rulesBase}/releases/${target.release}`)
  if (actual.rulesetName !== rulesets[i].name) throw new Error(`Release verification failed: ${target.release}`)
  console.log(`Applied and verified ${target.file}`)
}
if (!index) {
  const operation = await request(indexBase, { method: 'POST', body: JSON.stringify({ queryScope: desired.queryScope, fields: desired.fields }) })
  console.log(`Product index creation started: ${operation.name}`)
} else console.log(`Product index: ${index.state}`)
