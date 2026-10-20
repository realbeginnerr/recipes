import assert from 'node:assert/strict'
import path from 'node:path'
import { iaRoot, readIA, validateStructure, renderMermaid, compareIA, sourceInventory } from './ia-core.mjs'

const baseline = await readIA(path.join(iaRoot, 'ia-as-is.yaml'))
assert.equal(validateStructure(baseline).filter(r => r.level === 'Error').length, 0)
const normal = renderMermaid(baseline)
assert(normal.includes(' | '), '카드 구분자 | 원문 유지')
assert(normal.includes('/recipe/:id'), 'URL / 및 : 원문 유지')
assert(!/#(?:124|47|58);/.test(normal), 'FigJam에 엔티티 코드가 표시되는 회귀 방지')
assert(!/#[0-9]+;/.test(normal), '현재 IA에는 이스케이프가 필요한 문자가 없어야 함')
const punctuation = structuredClone(baseline)
punctuation.nodes[1].name = '기록 · T’s Recipe / 분류: 목록 | (추가) [보기]'
assert(renderMermaid(punctuation).includes(punctuation.nodes[1].name), '일반 문장부호와 한국어 보존')
const cases = [
  ['DUPLICATE_ID', doc => doc.nodes.push(structuredClone(doc.nodes[1]))],
  ['MISSING_PARENT', doc => { doc.nodes[1].parent = 'absent' }],
  ['CYCLE', doc => { doc.nodes[0].parent = doc.nodes[1].id }],
  ['DEPTH_MISMATCH', doc => { doc.nodes[1].depth = 4 }],
  ['REQUIRED', doc => { delete doc.nodes[1].description }],
  ['TYPE', doc => { doc.nodes[1].type = 'button' }],
  ['DUPLICATE_ORDER', doc => { doc.nodes[3].order = doc.nodes[1].order }],
  ['URL', doc => { doc.nodes[1].path = 'https://wrong.example/path' }],
  ['IMPLEMENTATION', doc => { doc.nodes[1].implementation = 'done' }],
  ['VERIFICATION', doc => { doc.nodes[1].verification = 'certain' }],
  ['CROSS_LINK', doc => { doc.cross_links[0].to = 'absent' }],
  ['NAVIGATION', doc => { doc.navigation.primary.push('absent') }],
]
for (const [code, mutate] of cases) {
  const doc = structuredClone(baseline)
  mutate(doc)
  assert(validateStructure(doc).some(r => r.level === 'Error' && r.code === code), code)
}
const hostile = structuredClone(baseline)
hostile.nodes[1].name = '한글 " ] --> X[" <script> & |\n%%{init: {}}%%'
const diagram = renderMermaid(hostile)
assert(!diagram.includes('<script>'))
assert(!diagram.includes('-->'))
assert(!diagram.includes('%%{init'))
assert(diagram.includes('한글'))
// Verify every generated statement belongs to the constrained Flowchart grammar.
for (const line of diagram.trimEnd().split('\n')) {
  assert(/^(flowchart TD|  %% .*|  classDef depth\d+ fill:#[A-Fa-f0-9]{6},stroke:#475569,color:#0F172A;|  ia_[a-z0-9_]+\["[^"\n]*"\]:::depth\d+|  ia_[a-z0-9_]+ --- ia_[a-z0-9_]+)$/.test(line), line)
}
const branch = renderMermaid(baseline, 'recipes')
assert(branch.includes('ia_recipe_detail['))
assert(!branch.includes('ia_shop['))
assert.throws(() => renderMermaid(baseline, 'unknown'))
const proposed = structuredClone(baseline)
proposed.nodes[1].name = '이름 변경'
proposed.nodes[1].access = 'admin'
proposed.nodes[1].path = '/home'
assert.deepEqual(compareIA(baseline, proposed).filter(c => c.id === 'home').map(c => c.type), ['Renamed', 'AccessChanged', 'URLChanged'])
const inventory = await sourceInventory()
assert.equal(inventory.routes.filter(r => !r.redirect).length, baseline.nodes.filter(n => n.type === 'page').length)
assert(inventory.routes.find(r => r.path === '/admin')?.guarded)
assert(inventory.entries.some(e => e.path === '/recipe/:dynamic' && e.kind === 'dynamic-candidate'))
console.log(`PASS: ${cases.length} 구조 오류 변이, 특수 문자/문법 템플릿, 분기 생성, 변경 비교, 현재 라우트/동적 진입 추출`)
