import { useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import type { CookingStep } from '../utils/cookingSteps'
import './CookingSteps.css'

export function CookingStepsEditor({ steps, onChange, disabled, ko }: { steps: CookingStep[]; onChange: (steps: CookingStep[]) => void; disabled: boolean; ko: boolean }) {
  return <div className="cooking-steps-editor">
    <h3>{ko ? '요리 단계' : 'Cooking steps'}</h3>
    {steps.map((step, index) => <div key={step.id} className="cooking-step-editor">
      <label htmlFor={`cooking-step-${step.id}`}>{ko ? `${index + 1}단계` : `Step ${index + 1}`}</label>
      <Textarea id={`cooking-step-${step.id}`} value={step.text} rows={3} disabled={disabled} onChange={event => onChange(steps.map(current => current.id === step.id ? { ...current, text: event.target.value } : current))} />
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
      }} /><span className="cooking-step-number">{index + 1}.</span><span className="cooking-step-text">{step.text}</span>
      {next === step.id && <span className="cooking-step-next">{ko ? '다음 단계' : 'Next'}</span>}</label>
    </li>)}</ol>
  </section>
}
