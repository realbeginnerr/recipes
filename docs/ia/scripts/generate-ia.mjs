import { writeFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { iaRoot, readIA, renderMermaid } from './ia-core.mjs'

const args = process.argv.slice(2)
const check = args.includes('--check')
const branchArg = args.find(a => a.startsWith('--branch='))
const branch = branchArg?.slice('--branch='.length)
if (args.some(a => a !== '--check' && a !== branchArg)) throw new Error('사용법: node docs/ia/scripts/generate-ia.mjs [--check] [--branch=NODE_ID]')
for (const version of ['as-is', 'to-be']) {
  const doc = await readIA(path.join(iaRoot, `ia-${version}.yaml`))
  const output = renderMermaid(doc, branch)
  const file = path.join(iaRoot, 'diagrams', `ia-${version}${branch ? '.' + branch : ''}.mmd`)
  if (check) {
    if (await readFile(file, 'utf8') !== output) throw new Error(`${file}: YAML과 다릅니다. 재생성하세요.`)
    console.log(`Info GENERATED_SYNC ${path.basename(file)} 일치`)
  } else {
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, output, 'utf8')
    console.log(`Info GENERATED ${file}`)
  }
}
