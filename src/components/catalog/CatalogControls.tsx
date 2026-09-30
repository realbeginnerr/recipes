import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import './CatalogControls.css'

type Option<T extends string> = { value: T; label: string }

export function PageIntro({ title, description, action, titleImage }: {
  title: string
  description: string
  action?: { to: string; label: string; subtle?: boolean }
  titleImage?: { src: string; alt: string }
}) {
  return <header className="catalog-intro"><div className="catalog-container catalog-intro__inner">
    <div>{titleImage ? <div className="catalog-intro__title-with-image"><h1>{title}</h1><img className="catalog-intro__title-image" src={titleImage.src} alt={titleImage.alt} /></div> : <h1>{title}</h1>}{description && <p>{description}</p>}</div>
    {action && <Button nativeButton={false} render={<Link to={action.to} />} variant={action.subtle ? 'link' : 'default'} className={action.subtle ? 'catalog-intro__subtle-action' : 'catalog-primary'}>{!action.subtle && <span aria-hidden="true">＋</span>}{action.label}</Button>}
  </div></header>
}

export function CatalogToolbar({ children }: { children: ReactNode }) {
  return <div className="catalog-toolbar"><div className="catalog-container catalog-toolbar__inner">{children}</div></div>
}

export function CategoryFilter<T extends string>({ label, value, options, onValueChange }: {
  label: string
  value: T | readonly T[]
  options: readonly Option<T>[]
  onValueChange: (value: T) => void
}) {
  return <div className="catalog-filters" role="group" aria-label={label}>
    {options.map(option => <Button key={option.value} type="button" variant="filter" size="compact" aria-pressed={typeof value === 'string' ? value === option.value : value.includes(option.value)} onClick={() => onValueChange(option.value)}>{option.label}</Button>)}
  </div>
}

export function SearchField({ label, value, onValueChange }: {
  label: string
  value: string
  onValueChange: (value: string) => void
}) {
  return <div className="catalog-search"><span aria-hidden="true">⌕</span><Input density="compact" type="search" aria-label={label} placeholder={label} value={value} onChange={event => onValueChange(event.target.value)} /></div>
}

export function SortSelect({ label, value, options, onValueChange }: {
  label: string
  value: string
  options: Option<string>[]
  onValueChange: (value: string) => void
}) {
  return <Select value={value} items={options} onValueChange={next => { if (next !== null) onValueChange(next) }}>
    <SelectTrigger size="compact" aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select>
}
