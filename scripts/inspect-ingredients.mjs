import { writeFile } from 'node:fs/promises'
const response = await fetch('https://firestore.googleapis.com/v1/projects/recipes-5a663/databases/(default)/documents:runQuery', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'ingredients' }] } }),
  signal: AbortSignal.timeout(15000),
})
if (!response.ok) throw new Error(await response.text())
const result = await response.json()
await writeFile('scripts/ingredients-before-import.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify(result.filter(row => row.document).map(({ document }) => ({ id: document.name.split('/').pop(), name: document.fields.nameKo?.stringValue }))))
