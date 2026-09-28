import './ContentState.css'
import type { ReactNode } from 'react'

export function ContentState({ title, description, icon, children, error = false, variant = 'catalog' }: {
  title: string
  description?: string
  icon?: ReactNode
  children?: ReactNode
  error?: boolean
  variant?: 'catalog' | 'detail' | 'inline'
}) {
  if (variant === 'inline') return <p role={error ? 'alert' : 'status'}>{title} {children}</p>
  return <div className={variant === 'catalog' ? 'catalog-empty' : 'reference-container detail-state'} role={error ? 'alert' : 'status'}>
    {icon && <span aria-hidden="true">{icon}</span>}
    {variant === 'catalog' ? <h2>{title}</h2> : <p>{title}</p>}
    {description && <p>{description}</p>}
    {children}
  </div>
}

export function LoadingState({ label, skeleton = false }: { label: string; skeleton?: boolean }) {
  if (!skeleton) return <div className="reference-container detail-state" role="status">{label}</div>
  return <div className="catalog-skeletons" role="status" aria-label={label}>{Array.from({ length: 6 }, (_, index) => <div className="catalog-skeleton" key={index} aria-hidden="true"><div /><span /><span /></div>)}</div>
}
