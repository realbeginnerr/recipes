import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { iaRoot, projectRoot, readIA, validateStructure, sourceInventory, compareIA, renderMermaid } from './ia-core.mjs'

const results = []
const add = (level, code, message) => results.push({ level, code, message })
let asis, tobe
try {
  const args = process.argv.slice(2)
  if (args.length && (args.length !== 2 || args[0] !== '--file')) throw new Error('사용법: validate-ia.mjs [--file PATH]')
  if (args.length) {
    const doc = await readIA(path.resolve(args[1]))
    results.push(...validateStructure(doc))
    add('Info', 'SCOPE', '단일 파일 구조 검사만 실행; 코드 대조는 기본 명령 사용')
  } else {
    asis = await readIA(path.join(iaRoot, 'ia-as-is.yaml'))
    tobe = await readIA(path.join(iaRoot, 'ia-to-be.yaml'))
    for (const [label, doc] of [['as-is', asis], ['to-be', tobe]]) {
      results.push(...validateStructure(doc).map(r => ({ ...r, message: `${label}: ${r.message}` })))
      for (const n of doc.nodes ?? []) for (const file of n.source_files ?? []) {
        if (typeof file !== 'string' || path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) continue
        try { await access(path.join(projectRoot, file)) } catch { add('Error', 'SOURCE_MISSING', `${label}/${n.id}: ${file}`) }
      }
    }
    if (!results.some(r => r.level === 'Error')) {
      const { routes, entries, unresolved } = await sourceInventory()
      const pages = routes.filter(r => !r.redirect)
      if (new Set(routes.map(r => r.path)).size !== routes.length) add('Error', 'ROUTE_DUPLICATE', '중복 라우트 또는 중첩 라우트: 추출기 검토 필요')
      for (const r of pages) {
        const n = asis.nodes.find(n => n.type === 'page' && n.path === r.path)
        if (!n) { add('Error', 'ROUTE_MISSING_IA', `코드에만 있음: ${r.path}`); continue }
        if (n.access !== (r.guarded ? 'admin' : 'public')) add('Warning', 'ACCESS_MISMATCH', `${n.id}: 라우트 가드와 access 불일치 가능성; 페이지 내부 권한 검증 필요`)
        const candidates = entries.filter(e => {
          const target = r.path.split('/'), actual = e.path.split('/')
          return target.length === actual.length && target.every((segment, i) => segment.startsWith(':') ? Boolean(actual[i]) : segment === actual[i])
        })
        if (!candidates.length) add('Warning', 'ENTRY_REVIEW', `${n.id} ${r.path}: 진입 링크 증거 없음. 고립 가능성/외부 진입 검증 필요`)
        else if (candidates.every(e => e.kind === 'dynamic-candidate')) add('Info', 'DYNAMIC_ENTRY', `${n.id}: 동적 URL 후보 ${[...new Set(candidates.map(e => e.source))].join(', ')}; 실행 시 접근 가능성 검증 필요`)
      }
      for (const n of asis.nodes.filter(n => n.type === 'page')) if (!pages.some(r => r.path === n.path)) add('Error', 'IA_MISSING_ROUTE', `IA에만 있음: ${n.id} ${n.path}`)
      const redirects = asis.routing?.redirects ?? []
      for (const r of routes.filter(r => r.redirect)) if (!redirects.some(d => d.path === r.path)) add('Error', 'REDIRECT_MISSING', r.path)
      for (const r of redirects) if (!routes.some(d => d.path === r.path && d.redirect)) add('Error', 'REDIRECT_STALE', r.path)
      const app = await readFile(path.join(projectRoot, 'src/App.tsx'), 'utf8')
      for (const r of redirects) if (!app.includes(`to="${r.target}"`)) add('Warning', 'REDIRECT_TARGET', `${r.path}: target 검증 필요`)
      const main = await readFile(path.join(projectRoot, 'src/main.tsx'), 'utf8')
      if (!main.includes(`basename: '${asis.routing.basename}'`)) add('Warning', 'BASENAME', 'basename 변경 가능성: 검증 필요')
      unresolved.forEach(message => add('Warning', 'STATIC_LIMIT', message))
      add('Info', 'ROUTES', `전체 ${routes.length}, 페이지 ${pages.length}, 리다이렉트 ${routes.length - pages.length}`)
      add('Info', 'ACCESS_REVIEW', '페이지 가드 대조 완료. AdminContext·AccessProvider·Firestore·Storage의 실제 배포/로그인 동작은 수동 검증 필요')
      const changes = compareIA(asis, tobe)
      const declared = tobe.changes ?? []
      for (const c of changes) {
        const record = declared.find(d => d.id === c.id && d.type === c.type)
        if (!record) add('Error', 'CHANGE_UNDOCUMENTED', `${c.id}: ${c.type} 변경 이유/문제 ID 기록 필요`)
        else if (!record.reason || !Array.isArray(record.issue_ids)) add('Error', 'CHANGE_REASON', `${c.id}: 이유/문제 ID 필요`)
        if (c.type !== 'Unchanged') add('Info', 'CHANGE', `${c.type}: ${c.id}`)
      }
      for (const c of declared) {
        if (!['Added', 'Removed', 'Moved', 'Renamed', 'Merged', 'Split', 'Unchanged', 'AccessChanged', 'URLChanged'].includes(c.type)) add('Error', 'CHANGE_TYPE', `${c.id}: ${c.type}`)
        if (!changes.some(d => d.id === c.id && d.type === c.type) && !['Merged', 'Split'].includes(c.type)) add('Error', 'CHANGE_STALE', `${c.id}: 오래된 변경 기록 ${c.type}`)
        if (['Merged', 'Split'].includes(c.type) && (!Array.isArray(c.related_ids) || !c.related_ids.length)) add('Error', 'CHANGE_RELATIONS', `${c.id}: 통합/분리 related_ids 필요`)
      }
      for (const removed of changes.filter(c => c.type === 'Removed')) {
        const old = asis.nodes.find(n => n.id === removed.id)
        const substitute = tobe.nodes.find(n => n.path && n.path === old.path)
        if (substitute) add('Warning', 'ID_REPLACED', `${removed.id} → ${substitute.id}: 동일 URL의 ID 유지 검토`)
      }
      for (const [label, doc] of [['as-is', asis], ['to-be', tobe]]) {
        const actual = await readFile(path.join(iaRoot, 'diagrams', `ia-${label}.mmd`), 'utf8')
        if (actual !== renderMermaid(doc)) add('Error', 'DIAGRAM_STALE', `${label}: 재생성 필요`)
      }
      add('Info', 'MERMAID', '안전한 카드/연결선 문법 템플릿 및 YAML 동기화 확인. Mermaid 엔진 렌더링은 별도 검증 필요')
      add('Info', 'NODES', `As-Is ${asis.nodes.length}, To-Be ${tobe.nodes.length}; 유지 ID ${asis.nodes.filter(n => tobe.nodes.some(t => t.id === n.id)).length}`)
    }
  }
} catch (error) { add('Error', 'EXECUTION', error.message) }
for (const r of results) console.log(`${r.level} [${r.code}] ${r.message}`)
for (const level of ['Error', 'Warning', 'Info']) console.log(`${level}: ${results.filter(r => r.level === level).length}`)
console.log('구조 검증은 UX 품질 또는 운영 환경 검증을 의미하지 않습니다.')
if (results.some(r => r.level === 'Error')) process.exitCode = 1
