import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/utils/recipeRoulette.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { chooseRecipe, rouletteProgress, RECENT_RECIPE_EXCLUSION_COUNT } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const pool = Array.from({ length: 8 }, (_, i) => ({ id: String(i) }))
const history = pool.slice(0, RECENT_RECIPE_EXCLUSION_COUNT).map(recipe => recipe.id)
for (let i = 0; i < 100; i++) assert.ok(!history.includes(chooseRecipe(pool, history, () => i / 100).id))
assert.equal(chooseRecipe([], []), undefined)
assert.equal(chooseRecipe(pool.slice(0, 1), ['0']).id, '0')
assert.equal(chooseRecipe(pool.slice(0, 2), ['0', '1']).id, '1')
assert.equal(chooseRecipe(pool.slice(0, 3), ['deleted', '0', '0', '1', '2']).id, '2')
assert.equal(chooseRecipe(pool, history, () => 0).id, '5')
assert.equal(chooseRecipe(pool, history, () => 0.99999).id, '7')
// Repeated spins respect the rolling five-result window.
let recent = []
for (let i = 0; i < 100; i++) {
  const recipe = chooseRecipe(pool, recent, () => (i % 10) / 10)
  assert.ok(!recent.includes(recipe.id))
  recent = [recipe.id, ...recent].slice(0, RECENT_RECIPE_EXCLUSION_COUNT)
}
assert.equal(rouletteProgress(0), 0)
assert.equal(rouletteProgress(1), 1)
let previousStep = Infinity
for (let i = 1; i <= 100; i++) {
  const step = rouletteProgress(i / 100) - rouletteProgress((i - 1) / 100)
  assert.ok(step > 0 && step <= previousStep)
  previousStep = step
}
console.log('Roulette checks passed: exclusion window, small/empty pools, deleted IDs, repeated spins, and continuous deceleration.')
