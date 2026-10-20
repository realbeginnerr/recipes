import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { load } from 'js-yaml'
import ts from 'typescript'

export const projectRoot = fileURLToPath(new URL('../../../', import.meta.url))
export const iaRoot = path.join(projectRoot, 'docs/ia')
export const required = ['id', 'name', 'parent', 'depth', 'order', 'type', 'path', 'access', 'description', 'implementation', 'verification', 'source_files', 'notes']
export const types = ['category', 'page', 'modal', 'drawer', 'tab', 'section']
export const implementations = ['implemented', 'planned', 'unreachable']
export const verifications = ['code-confirmed', 'needs-verification', 'proposed']
export const accessTypes = ['public', 'admin']

export async function readIA(file) {
  // Default safe YAML schema supports numbers/null; reject custom executable tags.
  const { DEFAULT_SCHEMA } = await import('js-yaml')
  return load(await readFile(file, 'utf8'), { schema: DEFAULT_SCHEMA })
}
export function validateStructure(doc) {
  const results = []
  const add = (level, code, message) => results.push({ level, code, message })
  if (!doc || !Array.isArray(doc.nodes) || !doc.nodes.length) return [{ level: 'Error', code: 'NODES', message: 'nodes 배열이 필요합니다.' }]
  const map = new Map(), orders = new Set(), paths = new Set()
  for (const n of doc.nodes) {
    if (!n || typeof n !== 'object') { add('Error', 'NODE', '노드는 객체여야 합니다.'); continue }
    for (const field of required) if (!Object.hasOwn(n, field)) add('Error', 'REQUIRED', `${n.id}: ${field} 누락`)
    if (typeof n.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(n.id)) add('Error', 'ID', `${n.id}: ID 형식`)
    if (map.has(n.id)) add('Error', 'DUPLICATE_ID', `${n.id}: 중복 ID`)
    map.set(n.id, n)
    for (const field of ['name', 'description']) if (typeof n[field] !== 'string' || !n[field].trim()) add('Error', 'TEXT', `${n.id}: ${field} 문자열 필요`)
    if (typeof n.notes !== 'string') add('Error', 'NOTES', `${n.id}: notes 문자열 필요`)
    if (n.parent !== null && typeof n.parent !== 'string') add('Error', 'PARENT_TYPE', `${n.id}: parent 형식`)
    if (!types.includes(n.type)) add('Error', 'TYPE', `${n.id}: 잘못된 type`)
    if (!accessTypes.includes(n.access)) add('Error', 'ACCESS', `${n.id}: 잘못된 access`)
    if (!implementations.includes(n.implementation)) add('Error', 'IMPLEMENTATION', `${n.id}: 구현 상태`)
    if (!verifications.includes(n.verification)) add('Error', 'VERIFICATION', `${n.id}: 확인 상태`)
    if (!Number.isInteger(n.depth) || n.depth < 0) add('Error', 'DEPTH', `${n.id}: depth 정수 필요`)
    if (n.depth > 5) add('Warning', 'DEEP', `${n.id}: 5Depth 초과 검토 필요`)
    if (!Number.isInteger(n.order) || n.order < 1) add('Error', 'ORDER', `${n.id}: order 양의 정수 필요`)
    const key = JSON.stringify([n.parent, n.order])
    if (orders.has(key)) add('Error', 'DUPLICATE_ORDER', `${n.id}: 형제 순서 중복`)
    orders.add(key)
    if (n.path !== null && (typeof n.path !== 'string' || !/^\/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9_]*)(?:\/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9_]*))*$/.test(n.path) && n.path !== '/')) add('Error', 'URL', `${n.id}: URL 형식 오류`)
    if (n.type === 'page' && n.path === null) add('Error', 'PAGE_PATH', `${n.id}: 페이지 URL 필요`)
    if (n.path !== null && paths.has(n.path)) add('Error', 'DUPLICATE_URL', `${n.id}: URL 중복`)
    if (n.path !== null) paths.add(n.path)
    if (!Array.isArray(n.source_files) || !n.source_files.length || n.source_files.some(f => typeof f !== 'string' || path.isAbsolute(f) || f.split(/[\\/]/).includes('..'))) add('Error', 'SOURCES', `${n.id}: 프로젝트 상대 source_files 필요`)
  }
  if (doc.nodes.filter(n => n?.parent === null).length !== 1) add('Error', 'ROOT', '루트는 1개여야 합니다.')
  for (const n of map.values()) {
    if (n.parent === null) { if (n.depth !== 0) add('Error', 'ROOT_DEPTH', `${n.id}: 루트 depth는 0`) }
    else if (!map.has(n.parent)) add('Error', 'MISSING_PARENT', `${n.id}: 부모 없음 ${n.parent}`)
    else if (n.depth !== map.get(n.parent).depth + 1) add('Error', 'DEPTH_MISMATCH', `${n.id}: 부모 depth + 1 아님`)
    const seen = new Set([n.id])
    let parent = n.parent
    while (map.has(parent)) {
      if (seen.has(parent)) { add('Error', 'CYCLE', `${n.id}: 순환 참조`); break }
      seen.add(parent); parent = map.get(parent).parent
    }
  }
  for (const link of doc.cross_links ?? []) {
    if (!map.has(link.from) || !map.has(link.to)) add('Error', 'CROSS_LINK', `${link.from} → ${link.to}: 없는 노드`)
  }
  for (const group of ['primary', 'utility']) for (const id of doc.navigation?.[group] ?? []) {
    if (!map.has(id)) add('Error', 'NAVIGATION', `${group}: 없는 노드 ${id}`)
  }
  for (const state of doc.state_inventory ?? []) for (const id of state.nodes ?? []) {
    if (!map.has(id)) add('Error', 'STATE_NODE', `상태 목록에 없는 노드 ${id}`)
  }
  return results
}

export async function sourceInventory() {
  const files = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(file)
      else if (/\.[jt]sx?$/.test(entry.name)) files.push(file)
    }
  }
  await walk(path.join(projectRoot, 'src'))
  const sources = await Promise.all(files.map(async file => {
    const text = await readFile(file, 'utf8')
    return ts.createSourceFile(path.relative(projectRoot, file).replaceAll('\\', '/'), text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  }))
  const routes = [], entries = [], unresolved = []
  function textValue(value) {
    if (!value) return null
    if (ts.isJsxExpression(value)) return value.expression ? textValue(value.expression) : null
    return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? value.text : null
  }
  function attributes(node) { return node.attributes.properties.filter(ts.isJsxAttribute) }
  function visit(node, source) {
    // Object-defined GNB links and dynamic template paths are navigation evidence,
    // not proof that their containing component is mounted or data is available.
    if (ts.isPropertyAssignment(node) && ['to', 'href'].includes(node.name.getText(source))) {
      const val = textValue(node.initializer)
      if (val?.startsWith('/')) entries.push({ path: val.split(/[?#]/)[0], source: source.fileName, kind: 'navigation-object' })
    }
    if (ts.isTemplateExpression(node) && node.head.text.startsWith('/')) {
      let val = node.head.text
      for (const span of node.templateSpans) val += ':dynamic' + span.literal.text
      entries.push({ path: val.split(/[?#]/)[0], source: source.fileName, kind: 'dynamic-candidate' })
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source)
      if (tag === 'Route') {
        const attrs = attributes(node), p = attrs.find(a => a.name.getText(source) === 'path')
        const index = attrs.some(a => a.name.getText(source) === 'index')
        if (index || p) {
          const raw = index ? '' : textValue(p.initializer)
          if (raw === null) unresolved.push(`${source.fileName}: dynamic Route`)
          else {
            const element = attrs.find(a => a.name.getText(source) === 'element')?.initializer
            const body = element?.getText(source) ?? ''
            routes.push({ path: raw === '*' ? '*' : '/' + raw.replace(/^\//, ''), redirect: /<Navigate\b/.test(body), guarded: /<AddPagePasswordGate\b/.test(body), source: source.fileName })
          }
        }
      } else {
        for (const a of attributes(node)) if (['to', 'href'].includes(a.name.getText(source))) {
          const val = textValue(a.initializer)
          if (val?.startsWith('/')) entries.push({ path: val.split(/[?#]/)[0], source: source.fileName, kind: tag })
        }
      }
    }
    if (ts.isCallExpression(node) && ['navigate', 'requestAccess'].includes(node.expression.getText(source))) {
      const val = textValue(node.arguments[0])
      if (val?.startsWith('/')) entries.push({ path: val.split(/[?#]/)[0], source: source.fileName, kind: node.expression.getText(source) })
    }
    ts.forEachChild(node, child => visit(child, source))
  }
  sources.forEach(source => visit(source, source))
  return { routes, entries, unresolved }
}

export function compareIA(before, after) {
  const old = new Map(before.nodes.map(n => [n.id, n])), next = new Map(after.nodes.map(n => [n.id, n]))
  const changes = []
  for (const n of before.nodes) if (!next.has(n.id)) changes.push({ id: n.id, type: 'Removed' })
  for (const n of after.nodes) {
    const prev = old.get(n.id)
    if (!prev) { changes.push({ id: n.id, type: 'Added' }); continue }
    const types = []
    if (n.parent !== prev.parent) types.push('Moved')
    if (n.name !== prev.name) types.push('Renamed')
    if (n.access !== prev.access) types.push('AccessChanged')
    if (n.path !== prev.path) types.push('URLChanged')
    for (const type of types.length ? types : ['Unchanged']) changes.push({ id: n.id, type })
  }
  return changes
}

export function renderMermaid(doc, branch) {
  const problems = validateStructure(doc).filter(r => r.level === 'Error')
  if (problems.length) throw new Error(JSON.stringify(problems))
  const byId = new Map(doc.nodes.map(n => [n.id, n]))
  if (branch && !byId.has(branch)) throw new Error(`없는 branch: ${branch}`)
  const keep = n => {
    if (!branch) return true
    let current = n
    while (current) { if (current.id === branch) return true; current = byId.get(current.parent) }
    return false
  }
  const nodes = doc.nodes.filter(keep).sort((a, b) => a.depth - b.depth || a.order - b.order || a.id.localeCompare(b.id))
  // Labels are quoted: ordinary punctuation (notably | / :) is already safe.
  // FigJam preserves numeric entities literally, so use them only for characters
  // that could terminate a label, inject HTML/directives, or create a new line.
  const escape = value => [...value].map(c => /["<>&%\\\u0000-\u001f\u007f\u2028\u2029]/u.test(c) ? `#${c.codePointAt(0)};` : c).join('')
  const id = value => 'ia_' + value.replaceAll('-', '_')
  const lines = ['flowchart TD', '  %% Generated from YAML; hierarchy only, not a user flow.']
  const colors = ['#E2E8F0', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#FCE7F3', '#EDE9FE']
  for (const depth of new Set(nodes.map(n => n.depth))) lines.push(`  classDef depth${depth} fill:${colors[Math.min(depth, 5)]},stroke:#475569,color:#0F172A;`)
  for (const n of nodes) lines.push(`  ${id(n.id)}["${escape(`${n.name} | ${n.id} | ${n.type} | ${n.implementation}${n.path ? ' | ' + n.path : ''}`)}"]:::depth${n.depth}`)
  const included = new Set(nodes.map(n => n.id))
  for (const n of nodes) if (included.has(n.parent)) lines.push(`  ${id(n.parent)} --- ${id(n.id)}`)
  return lines.join('\n') + '\n'
}
