import { useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import type { CookingStep } from '../utils/cookingSteps'
import { translateContent } from '../i18n/content'
import './CookingSteps.css'

export function CookingStepsEditor({ steps, onChange, disabled, ko }: { steps: CookingStep[]; onChange: (steps: CookingStep[]) => void; disabled: boolean; ko: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  function updateText(step: CookingStep, value: string, caret: number | null) {
    if (disabled) return
    const lines = value.split(/\r\n|\r|\n/)
    const replacements = lines.map((text, index) => ({ id: index === 0 ? step.id : crypto.randomUUID(), text }))
    onChange(steps.flatMap(current => current.id === step.id ? replacements : [current]))
    if (lines.length > 1 && caret !== null) {
      const prefix = value.slice(0, caret).split(/\r\n|\r|\n/)
      const destination = replacements[prefix.length - 1]
      requestAnimationFrame(() => {
        const field = document.getElementById(`cooking-step-${destination.id}`) as HTMLTextAreaElement | null
        field?.focus()
        const position = prefix[prefix.length - 1].length
        field?.setSelectionRange(position, position)
      })
    }
  }
  function moveStep(id: string, targetId: string) {
    if (disabled || id === targetId) return
    const from = steps.findIndex(step => step.id === id)
    const to = steps.findIndex(step => step.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...steps]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }
  function targetAt(x: number, y: number) {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cooking-step-id]')
    return row && editorRef.current?.contains(row) ? row.dataset.cookingStepId ?? null : null
  }
  function endDrag() { dragging.current = null; setDropTarget(null) }
  return <div ref={editorRef} className="cooking-steps-editor">
    <h3>{ko ? '요리 단계' : 'Cooking steps'}</h3>
    <p className="cooking-steps-help">{ko ? '줄바꿈하면 다음 단계로 나뉩니다. 손잡이를 드래그하거나 손잡이에서 위·아래 방향키로 순서를 바꿀 수 있습니다.' : 'New lines create separate steps. Drag a handle or use its Up/Down arrow keys to reorder.'}</p>
    {steps.map((step, index) => <div key={step.id} data-cooking-step-id={step.id} className={`cooking-step-editor${dropTarget === step.id ? ' is-drop-target' : ''}`}>
      <div className="cooking-step-editor-heading">
      <Button type="button" variant="ghost" size="icon-sm" className="cooking-step-drag-handle" disabled={disabled}
        aria-label={ko ? `${index + 1}단계 순서 변경` : `Reorder step ${index + 1}`}
        onPointerDown={event => {
          if (disabled || event.button !== 0) return
          dragging.current = step.id
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={event => { if (dragging.current) setDropTarget(targetAt(event.clientX, event.clientY)) }}
        onPointerUp={event => {
          const target = targetAt(event.clientX, event.clientY)
          if (dragging.current && target) moveStep(dragging.current, target)
          endDrag()
        }}
        onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onKeyDown={event => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
          event.preventDefault()
          const target = steps[index + (event.key === 'ArrowUp' ? -1 : 1)]
          if (target) moveStep(step.id, target.id)
        }}><GripVertical aria-hidden="true" /></Button>
      <label htmlFor={`cooking-step-${step.id}`}>{ko ? `${index + 1}단계` : `Step ${index + 1}`}</label>
      </div>
      <Textarea id={`cooking-step-${step.id}`} value={step.text} rows={1} disabled={disabled}
        onChange={event => {
          if ((event.nativeEvent as InputEvent).isComposing) {
            onChange(steps.map(current => current.id === step.id ? { ...current, text: event.target.value } : current))
          } else updateText(step, event.target.value, event.target.selectionStart)
        }}
        onCompositionEnd={event => updateText(step, event.currentTarget.value, event.currentTarget.selectionStart)} />
      <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange(steps.filter(current => current.id !== step.id))}>{ko ? '단계 삭제' : 'Delete step'}</Button>
    </div>)}
    <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange([...steps, { id: crypto.randomUUID(), text: '' }])}>{ko ? '단계 추가' : 'Add step'}</Button>
  </div>
}

export function CookingSteps({ recipeId, steps, ko }: { recipeId: string; steps: CookingStep[]; ko: boolean }) {
  const storageKey = `recipe-cooking-progress:${recipeId}`
  const [checked, setChecked] = useState<Record<string, string>>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved as Record<string, string> : {}
    } catch { return {} }
  })
  const activeSteps = steps.filter(step => step.text.trim())
  const completed = (step: CookingStep) => checked[step.id] === step.text
  const next = activeSteps.find(step => !completed(step))?.id
  const doneCount = activeSteps.filter(completed).length
  function save(value: Record<string, string>) {
    setChecked(value)
    try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* Keep progress in memory when storage is unavailable. */ }
  }
  if (!activeSteps.length) return null
  return <section className="detail-notes cooking-steps" aria-label={ko ? '요리 과정' : 'Cooking steps'}>
    <div className="cooking-steps-heading"><h2>{ko ? '요리 과정' : 'Cooking steps'} <span>{doneCount}/{activeSteps.length}</span></h2>
      <Button type="button" variant="ghost" size="sm" disabled={!doneCount} onClick={() => save({})}>{ko ? '체크 초기화' : 'Reset checks'}</Button>
    </div>
    <ol>{activeSteps.map((step, index) => <li key={step.id} className={`${completed(step) ? 'is-complete' : ''} ${next === step.id ? 'is-next' : ''}`}>
      <label><input type="checkbox" checked={completed(step)} onChange={event => {
        const value = { ...checked }
        if (event.target.checked) value[step.id] = step.text
        else delete value[step.id]
        save(value)
      }} /><span className="cooking-step-number">{index + 1}.</span><span className="cooking-step-text">{translateContent(step.text, ko ? 'ko' : 'en')}</span>
      </label>
    </li>)}</ol>
  </section>
}
