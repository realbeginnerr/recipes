import { createServer } from 'node:net'
import { expect, it } from 'vitest'
// @ts-expect-error The dev launcher runs directly in Node as ESM.
import { checkDevPort } from '../scripts/dev.mjs'

it('rejects an occupied port before Vite can touch the running server cache', async () => {
  const server = createServer()
  await new Promise<void>(resolve => server.listen(0, 'localhost', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP port')
  try {
    await expect(checkDevPort(address.port)).rejects.toMatchObject({ code: 'EADDRINUSE' })
    expect(server.listening).toBe(true)
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
  await expect(checkDevPort(address.port)).resolves.toBeUndefined()
})
