import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

const script = (path: string) => readFileSync(path, 'utf8').match(/<script>([\s\S]*?)<\/script>/)![1]

it.each([
  '/recipes/recipe/gamjatang/edit',
  '/recipes/recipe/gamjatang/edit?tab=cooking&name=a%26b#ingredients',
  '/recipes/ingredients?search=ginger',
])('restores the current route after the static host fallback: %s', path => {
  const original = new URL(path, 'https://example.com')
  let redirected = ''
  runInNewContext(script('public/404.html'), { window: { location: { protocol: original.protocol, hostname: original.hostname, port: original.port, pathname: original.pathname, search: original.search, hash: original.hash, replace: (url: string) => { redirected = url } } } })
  const landing = new URL(redirected)
  let restored = ''
  runInNewContext(script('index.html'), { window: { location: landing, history: { replaceState: (_state: unknown, _title: unknown, url: string) => { restored = url } } } })
  expect(restored).toBe(original.pathname + original.search + original.hash)
})

it('leaves a direct refresh route untouched', () => {
  let replaced = false
  runInNewContext(script('index.html'), { window: { location: new URL('http://localhost:5173/recipes/recipe/test/edit?tab=cooking'), history: { replaceState: () => { replaced = true } } } })
  expect(replaced).toBe(false)
})
