import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const base = 'https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents'
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const inputOption = args.find(arg => arg.startsWith('--input='))
if (!inputOption) throw new Error('Pass the source CSV with --input=<path>')
const inputPath = resolve(inputOption.slice('--input='.length))
const reportOption = args.find(arg => arg.startsWith('--report='))
const reportPath = reportOption ? resolve(reportOption.slice('--report='.length)) : null
const accessToken = execFileSync('powershell.exe', [
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  'gcloud auth print-access-token',
], { encoding: 'utf8' }).trim()
const creamOption = args.find(arg => arg.startsWith('--cream-pack-grams='))
const creamGrams = creamOption ? Number(creamOption.split('=')[1]) : 430
if (creamGrams !== undefined && (!Number.isFinite(creamGrams) || creamGrams <= 0)) throw new Error('Invalid cream package weight')

// CSV headers T and t are case-sensitive; quoted names can contain commas.
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.replace(/\r$/, '').trim()); cell = ''
      if (c === '\n') { if (row.some(Boolean)) rows.push(row); row = [] }
    } else cell += c
  }
  if (quoted) throw new Error('Unclosed CSV quote')
  if (cell || row.length) { row.push(cell.trim()); rows.push(row) }
  return rows
}
function number(value, positive = false) {
  if (!value || value === 'N/A') throw new Error(`Missing numeric value: ${value}`)
  const n = Number(value)
  if (!Number.isFinite(n) || (positive ? n <= 0 : n < 0)) throw new Error(`Invalid number: ${value}`)
  return n
}
const normalize = name => name.replace(/\s+/g, '').normalize('NFC')
const aliases = {
  '느타리버섯': '버섯 (느타리)', '양송이 버섯 (중)': '버섯 (양송이)',
  '쫄면 (면)': '쫄면 (면만)', '모짜렐라치즈': '치즈 (모짜렐라)',
  '모짜렐라': '치즈 (모짜렐라)', '파마산 치즈': '치즈 (파마산)',
  '양파 (중)': '양파', '갈은 양파': '양파', '알배추 (중)': '알배추', '가지 (중)': '가지',
  '닭가슴살 (삶은 것)': '닭가슴살 (삶은 후)', '참외 (중)': '참외 (중 사이즈)',
  '후추': '후추가루', '참깨': '깨 (참깨. 통깨)', '통깨': '깨 (참깨. 통깨)',
}
async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { ...options?.headers, Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`)
  return response.json()
}
const csv = parseCsv(await readFile(inputPath, 'utf8'))
const headers = csv.shift()
const expected = ['', '이름순', '재료명', 'g', 'T', 't', 'cup', '개, 장', '병, 캔, 팩', '탄', '단', '지']
if (JSON.stringify(headers) !== JSON.stringify(expected)) throw new Error('Unexpected CSV columns')
const unique = new Map(); const duplicates = []
for (const row of csv) {
  if (row.length !== headers.length) throw new Error(`Invalid CSV row: ${row}`)
  const key = normalize(row[2])
  if (unique.has(key)) {
    if (JSON.stringify(unique.get(key).slice(3)) !== JSON.stringify(row.slice(3))) throw new Error(`Conflicting duplicate: ${row[2]}`)
    duplicates.push(row[2]); continue
  }
  unique.set(key, row)
}
const snapshot = await request(`${base}:runQuery`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'ingredients' }] } }),
})
const documents = snapshot.flatMap(row => row.document ? [row.document] : [])
const matched = new Set(); const writes = []; const changes = []; const pending = []
const conversionFields = ['gramsPerTbsp', 'gramsPerTsp', 'gramsPerCup', 'gramsPerEach', 'gramsPerCan', 'gramsPerPack']
for (const row of unique.values()) {
  const nameKo = row[2]; const grams = number(row[3], true)
  const data = { baseAmount: grams, baseUnit: 'g', carbs: number(row[9]), protein: number(row[10]), fat: number(row[11]) }
  for (const [column, fields] of [[4, ['gramsPerTbsp']], [5, ['gramsPerTsp']], [6, ['gramsPerCup']], [7, ['gramsPerEach']], [8, ['gramsPerCan', 'gramsPerPack']]]) {
    if (row[column] !== 'N/A' && row[column] !== '') {
      for (const field of fields) data[field] = grams / number(row[column], true)
    }
  }
  if (nameKo.startsWith('크림소스 (폰타나.')) {
    // Nutrition is per 100g; the product name specifies a 430g package.
    data.baseAmount = 100
    data.gramsPerCan = creamGrams; data.gramsPerPack = creamGrams
  }
  const matches = documents.filter(doc => {
    const existingName = doc.fields.nameKo?.stringValue ?? ''
    return normalize(aliases[existingName] ?? existingName) === normalize(nameKo)
  })
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, typeof value === 'number' ? { doubleValue: value } : { stringValue: value }]))
  if (matches.length) {
    for (const doc of matches) {
      matched.add(doc.name)
      const renamedFields = doc.fields.nameKo?.stringValue !== nameKo
        ? { name: { stringValue: nameKo === '양파' ? 'onion' : nameKo }, nameKo: { stringValue: nameKo } }
        : {}
      const updateFields = { ...fields, ...renamedFields }
      writes.push({ update: { name: doc.name, fields: updateFields }, updateMask: { fieldPaths: [...new Set([...Object.keys(data), ...Object.keys(renamedFields), ...conversionFields])] }, currentDocument: { updateTime: doc.updateTime } })
      changes.push({ action: 'update', id: doc.name.split('/').pop(), existingName: doc.fields.nameKo?.stringValue, csvName: nameKo, data })
    }
  } else {
    const id = `csv-${createHash('sha256').update(normalize(nameKo)).digest('hex').slice(0, 24)}`
    const name = `${base.slice('https://firestore.googleapis.com/v1/'.length)}/ingredients/${id}`
    writes.push({ update: { name, fields: { ...fields, name: { stringValue: nameKo }, nameKo: { stringValue: nameKo }, createdAt: { integerValue: String(Date.now()) } } }, currentDocument: { exists: false } })
    changes.push({ action: 'create', id, csvName: nameKo, data })
  }
}
const report = { csvRows: csv.length, uniqueRows: unique.size, duplicates, updates: changes.filter(c => c.action === 'update').length, creates: changes.filter(c => c.action === 'create').length, pending, retained: documents.filter(doc => !matched.has(doc.name)).map(doc => doc.fields.nameKo?.stringValue), changes }
console.log(JSON.stringify({ ...report, changes: undefined }, null, 2))
if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2))
if (apply) {
  if (pending.length && !args.includes('--skip-pending')) throw new Error('Unresolved package weight; no changes applied')
  if (writes.length > 500) throw new Error('Too many writes for one atomic commit')
  await writeFile(new URL(`ingredients-backup-${Date.now()}.json`, import.meta.url), JSON.stringify(snapshot, null, 2))
  const result = await request(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) })
  console.log(`Committed ${result.writeResults.length} ingredient changes atomically.`)
}
