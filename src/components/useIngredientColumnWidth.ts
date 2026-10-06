import { useLayoutEffect, useRef } from 'react'

export function useIngredientColumnWidth() {
  const ref = useRef<HTMLTableElement>(null)
  useLayoutEffect(() => {
    const table = ref.current
    if (!table) return
    let frame = 0
    function measure() {
      const header = table!.tHead?.rows[0]?.cells[0]
      if (!header || !/^(식재료명?|재료명|Ingredient)/i.test(header.textContent?.trim() ?? '')) return
      table!.dataset.ingredientHug = 'true'
      const cells = [header, ...Array.from(table!.tBodies).flatMap(body => Array.from(body.rows).map(row => row.cells[0]).filter(cell => cell && cell.colSpan === 1))]
      let desired = 0
      for (const cell of cells) {
        const style = getComputedStyle(cell)
        const clone = cell.cloneNode(true) as HTMLElement
        Object.assign(clone.style, { position: 'fixed', left: '-100000px', top: '0', display: 'block', width: 'max-content', minWidth: '0', maxWidth: 'none', whiteSpace: 'nowrap', font: style.font, letterSpacing: style.letterSpacing, padding: style.padding, visibility: 'hidden' })
        clone.querySelectorAll<HTMLElement>('*').forEach(element => { element.style.whiteSpace = 'nowrap'; element.style.maxWidth = 'none' })
        clone.querySelectorAll<HTMLInputElement>('input').forEach(input => {
          input.style.width = `${Math.max(12, input.value.length + 2)}ch`
          input.style.minWidth = '0'
        })
        document.body.append(clone)
        desired = Math.max(desired, clone.getBoundingClientRect().width)
        clone.remove()
      }
      const columnCount = Array.from(table!.tHead!.rows[0].cells).reduce((count, cell) => count + cell.colSpan, 0)
      const tableWidth = table!.getBoundingClientRect().width
      const minimumWidth = tableWidth / columnCount
      const maximumWidth = tableWidth * 0.4
      const defaultRatio = Number(table!.dataset.ingredientDefaultRatio)
      const preferredWidth = defaultRatio > 0 ? tableWidth * defaultRatio : Math.ceil(desired)
      header.style.width = `${Math.min(maximumWidth, Math.max(minimumWidth, preferredWidth))}px`
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    measure()
    const resize = new ResizeObserver(schedule)
    resize.observe(table)
    const mutations = new MutationObserver(schedule)
    mutations.observe(table, { childList: true, subtree: true, characterData: true })
    table.addEventListener('input', schedule)
    void document.fonts.ready.then(schedule)
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect(); table.removeEventListener('input', schedule) }
  })
  return ref
}
