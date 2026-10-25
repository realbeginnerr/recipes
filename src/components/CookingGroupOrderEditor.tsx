import { Button } from './ui/button'
import { cookingGroupOrder } from '../utils/recipeCookingGroups'

export function CookingGroupOrderEditor({ items, order, onChange, ko, disabled = false }: {
  items: { cookingGroup?: string }[]; order: string[]; onChange: (order: string[]) => void; ko: boolean; disabled?: boolean
}) {
  const names = cookingGroupOrder(items, order)
  if (names.length < 2) return null
  return <fieldset className="my-5 min-w-0" disabled={disabled}>
    <legend className="mb-3 text-sm font-medium">{ko ? '요리 그룹 표시 순서' : 'Cooking group order'}</legend>
    <ol className="flex flex-col gap-2">
      {names.map((name, index) => <li key={name} className="flex items-center gap-3">
        <span className="flex-1">{index + 1}. {name || (ko ? '기본 재료' : 'Basic ingredients')}</span>
        {([-1, 1] as const).map(direction => <Button key={direction} type="button" variant="outline" size="sm" disabled={disabled || index + direction < 0 || index + direction >= names.length} aria-label={`${name || (ko ? '기본 재료' : 'Basic ingredients')} ${ko ? (direction < 0 ? '위로 이동' : '아래로 이동') : (direction < 0 ? 'move up' : 'move down')}`} onClick={() => {
          const next = [...names]
          ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
          onChange(next)
        }}>{direction < 0 ? '↑' : '↓'}</Button>)}
      </li>)}
    </ol>
  </fieldset>
}
