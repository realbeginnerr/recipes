import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import './CatalogControls.css'

type Option<T extends string> = { value: T; label: string }

export function PageIntro({ title, description, action, titleImage }: {
  title: ReactNode
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

export function CategoryFilter<T extends string>({ label, value, options, onValueChange, leadingAction }: {
  label: string
  value: T | readonly T[]
  options: readonly Option<T>[]
  onValueChange: (value: T) => void
  leadingAction?: ReactNode
}) {
  const { language } = useLanguage()
  const id = useId()
  const shell = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [navigation, setNavigation] = useState({ overflow: false, left: false, right: false })
  function updateNavigation() {
    if (!shell.current || !scroller.current || !track.current) return
    const overflow = track.current.scrollWidth > shell.current.clientWidth + 1
    const left = overflow && scroller.current.scrollLeft > 1
    const right = overflow && scroller.current.scrollLeft + scroller.current.clientWidth < scroller.current.scrollWidth - 1
    setNavigation(current => current.overflow === overflow && current.left === left && current.right === right ? current : { overflow, left, right })
  }
  useLayoutEffect(() => {
    updateNavigation()
    const observer = new ResizeObserver(updateNavigation)
    if (shell.current) observer.observe(shell.current)
    if (scroller.current) observer.observe(scroller.current)
    if (track.current) observer.observe(track.current)
    return () => observer.disconnect()
  }, [options, leadingAction, navigation.overflow])
  function move(direction: number) {
    const element = scroller.current
    if (!element) return
    element.scrollBy({ left: direction * Math.max(80, element.clientWidth * .75), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return <div className="catalog-filters-shell" ref={shell} data-overflow={navigation.overflow} role="group" aria-label={label}>
    {navigation.left && <Button type="button" variant="ghost" size="icon-sm" className="catalog-filters__previous" aria-label={language === 'ko' ? '이전 필터 보기' : 'Show previous filters'} aria-controls={id} onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></Button>}
    <div className="catalog-filters" id={id} ref={scroller} onScroll={updateNavigation}>
      <div className="catalog-filters__track" ref={track}>
    {leadingAction && <>{leadingAction}<span className="catalog-filters__divider" aria-hidden="true" /></>}
    {options.map(option => <Button key={option.value} type="button" variant="filter" size="compact" aria-pressed={typeof value === 'string' ? value === option.value : value.includes(option.value)} onClick={() => onValueChange(option.value)}>{option.label}</Button>)}
      </div>
    </div>
    {navigation.right && <><span className="catalog-filters__fade" aria-hidden="true" /><Button type="button" variant="ghost" size="icon-sm" className="catalog-filters__next" aria-label={language === 'ko' ? '다음 필터 보기' : 'Show more filters'} aria-controls={id} onClick={() => move(1)}><ChevronRight aria-hidden="true" /></Button></>}
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
