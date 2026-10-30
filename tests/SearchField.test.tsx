import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { SearchField } from '../src/components/catalog/CatalogControls'

it('keeps Korean composition local until 고로케 is committed, even while the parent value is unchanged', () => {
  const onValueChange = vi.fn()
  const { rerender } = render(<SearchField label="레시피 검색" value="" onValueChange={onValueChange} />)
  const input = screen.getByRole('searchbox') as HTMLInputElement
  fireEvent.compositionStart(input)
  for (const value of ['ㄱ', '고', '고ㄹ', '고로', '고로ㅋ', '고로케']) {
    fireEvent.change(input, { target: { value } })
    expect(input.value).toBe(value)
    expect(onValueChange).not.toHaveBeenCalled()
  }
  rerender(<SearchField label="레시피 검색" value="" onValueChange={onValueChange} />)
  expect(input.value).toBe('고로케')
  fireEvent.compositionEnd(input, { data: '케' })
  expect(onValueChange.mock.calls).toEqual([['고로케']])
  expect(input.value).toBe('고로케')
})

it('updates ordinary typing immediately without waiting for a router value, and follows external reset/navigation', () => {
  const onValueChange = vi.fn()
  const { rerender } = render(<SearchField label="검색" value="기존" onValueChange={onValueChange} />)
  const input = screen.getByRole('searchbox') as HTMLInputElement
  fireEvent.change(input, { target: { value: 'crab' } })
  expect(input.value).toBe('crab')
  expect(onValueChange).toHaveBeenLastCalledWith('crab')
  rerender(<SearchField label="검색" value="crab" onValueChange={onValueChange} />)
  rerender(<SearchField label="검색" value="" onValueChange={onValueChange} />)
  expect(input.value).toBe('')
  rerender(<SearchField label="검색" value="고로케" onValueChange={onValueChange} />)
  expect(input.value).toBe('고로케')
  fireEvent.change(input, { target: { value: '' } })
  expect(input.value).toBe('')
  expect(onValueChange).toHaveBeenLastCalledWith('')
})

it('preserves composed Korean and focus through real router search updates, then clears the query', async () => {
  function SearchRoute() {
    const [params, setParams] = useSearchParams()
    return <SearchField label="레시피 검색" value={params.get('q') ?? ''} onValueChange={value => {
      setParams(current => {
        const next = new URLSearchParams(current)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      }, { replace: true })
    }} />
  }
  const router = createMemoryRouter([{ path: '/recipes', element: <SearchRoute /> }], { initialEntries: ['/recipes?ingredient=crab'] })
  render(<RouterProvider router={router} />)
  const input = screen.getByRole('searchbox') as HTMLInputElement
  input.focus()
  for (const [partial, committed] of [['ㄱ', '고'], ['고ㄹ', '고로'], ['고로ㅋ', '고로케']]) {
    const previousSearch = router.state.location.search
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: partial } })
    expect(router.state.location.search).toBe(previousSearch)
    expect(input.value).toBe(partial)
    fireEvent.change(input, { target: { value: committed } })
    fireEvent.compositionEnd(input)
    await waitFor(() => expect(new URLSearchParams(router.state.location.search).get('q')).toBe(committed))
    expect(input.value).toBe(committed)
    expect(document.activeElement).toBe(input)
  }
  expect(new URLSearchParams(router.state.location.search).get('ingredient')).toBe('crab')
  fireEvent.change(input, { target: { value: '' } })
  await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('q')).toBe(false))
  expect(input.value).toBe('')
})
