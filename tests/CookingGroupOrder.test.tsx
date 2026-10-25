import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CookingGroupOrderEditor } from '../src/components/CookingGroupOrderEditor'
import { cookingGroupOrder, recipeCookingGroups } from '../src/utils/recipeCookingGroups'

const items = [
  { ingredientId: 'a', defaultAmount: 10, defaultUnit: 'g', cookingGroup: '양념장' },
  { ingredientId: 'b', defaultAmount: 20, defaultUnit: 'g', cookingGroup: '반죽' },
  { ingredientId: 'c', defaultAmount: 30, defaultUnit: 'g', cookingGroup: '양념장' },
]
const rows = items.map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: item.defaultUnit }))
describe('authored cooking group order', () => {
  it('uses appearance order by default and preserves ingredient indices with custom ordering', () => {
    expect(recipeCookingGroups(rows, items).map(group => group.name)).toEqual(['양념장', '반죽'])
    const groups = recipeCookingGroups(rows, items, ['반죽', '양념장'])
    expect(groups.map(group => group.name)).toEqual(['반죽', '양념장'])
    expect(groups[1].entries.map(entry => entry.index)).toEqual([0, 2])
    expect(groups[1].entries.map(entry => entry.row.amount)).toEqual([10, 30])
  })
  it('drops removed groups, deduplicates, appends new groups and supports unnamed ingredients', () => {
    expect(cookingGroupOrder([...items, {}], ['삭제한 그룹', '반죽', '반죽'])).toEqual(['반죽', '양념장', ''])
  })
  it('allows moving groups in both directions without changing the ingredient array', () => {
    function Editor() {
      const [order, setOrder] = useState<string[]>([])
      return <CookingGroupOrderEditor items={items} order={order} onChange={setOrder} ko />
    }
    render(<Editor />)
    fireEvent.click(screen.getByRole('button', { name: '반죽 위로 이동' }))
    expect(screen.getAllByRole('listitem').map(item => item.textContent?.split('↑')[0])).toEqual(['1. 반죽', '2. 양념장'])
    fireEvent.click(screen.getByRole('button', { name: '반죽 아래로 이동' }))
    expect(screen.getAllByRole('listitem')[0].textContent).toContain('양념장')
    expect(items.map(item => item.ingredientId)).toEqual(['a', 'b', 'c'])
  })
})
