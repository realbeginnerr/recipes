import { useUiCopy } from '../../context/LanguageContext'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: (id: string, descriptionId: string | undefined) => ReactNode }) {
  const copy = useUiCopy()
  const id = useId()
  const descriptionId = error || hint ? `${id}-description` : undefined
  return <div className={`product-field${error ? ' product-field--error' : ''}`}>
    <label htmlFor={id}>{copy(label)}{required && <span className="product-required"> {copy(" (필수)")}</span>}</label>
    {children(id, descriptionId)}
    {(error || hint) && <p id={descriptionId} className={error ? 'product-error' : 'product-hint'}>{copy(error ?? hint ?? '')}</p>}
  </div>
}
export function TextField({ label, value, onChange, error, hint, required, type = 'text', multiline = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string; required?: boolean; type?: string; multiline?: boolean; disabled?: boolean }) {
  return <Field label={label} error={error} hint={hint} required={required}>{(id, descriptionId) => multiline
    ? <Textarea id={id} value={value} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={descriptionId} disabled={disabled} rows={3} />
    : <Input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={descriptionId} disabled={disabled} />}</Field>
}
export function NumberField({ label, value, onChange, error, required, unit, integer = true, disabled = false }: { label: string; value: number | null; onChange: (value: number | null) => void; error?: string; required?: boolean; unit?: string; integer?: boolean; disabled?: boolean }) {
  const format = (number: number | null) => number === null ? '' : number.toLocaleString('en-US', { maximumFractionDigits: 1 })
  const [display, setDisplay] = useState(() => format(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setDisplay(format(value)) }, [value, focused])
  return <Field label={label} error={error} required={required}>{(id, descriptionId) => <div className="product-unit-input"><Input id={id} type="text" inputMode={integer ? 'numeric' : 'decimal'} value={display} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setDisplay(format(value)) }} onChange={event => {
    const raw = event.target.value.replace(/,/g, '')
    if (!raw) { setDisplay(''); onChange(null) }
    else if ((integer ? /^\d{1,13}$/ : /^\d{1,13}(\.\d{0,4})?$/).test(raw)) { const [whole, fraction] = raw.split('.'); setDisplay(Number(whole).toLocaleString('en-US', { maximumFractionDigits: 1 }) + (fraction === undefined ? '' : `.${fraction}`)); onChange(Number(raw)) }
  }} aria-invalid={!!error} aria-describedby={descriptionId} disabled={disabled} />{unit && <span>{unit}</span>}</div>}</Field>
}
export function SelectField<T extends string>({ label, value, options, onChange, error }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; error?: string }) {
  const copy = useUiCopy()
  const items = options.map(option => ({ ...option, label: copy(option.label) }))
  return <Field label={label} error={error}>{(id, descriptionId) => <Select value={value} items={items} onValueChange={next => { if (next !== null) onChange(next) }}><SelectTrigger id={id} aria-invalid={!!error} aria-describedby={descriptionId}><SelectValue /></SelectTrigger><SelectContent>{items.map(option => <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>}</Field>
}
export function CheckField({ label, value, onChange, hint, disabled = false }: { label: string; value: boolean; onChange: (value: boolean) => void; hint?: string; disabled?: boolean }) {
  const copy = useUiCopy()
  return <label className="product-check"><input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} disabled={disabled} /><span>{copy(label)}{hint && <small>{copy(hint)}</small>}</span></label>
}
export function FormSection({ id, title, description, children, collapsible = false }: { id: string; title: string; description?: string; children: ReactNode; collapsible?: boolean }) {
  const content = <>{description && <p className="product-section-description">{description}</p>}<div className="product-fields-grid">{children}</div></>
  return collapsible ? <details className="product-section" id={id}><summary>{title}</summary>{content}</details> : <section className="product-section" id={id} aria-labelledby={`${id}-title`}><h2 id={`${id}-title`}>{title}</h2>{content}</section>
}
