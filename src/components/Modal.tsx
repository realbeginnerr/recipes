import type { ReactNode } from 'react'

type ModalAction = {
  label: string
  variant?: 'primary' | 'danger' | 'ghost'
  onClick: () => void
  disabled?: boolean
}

type ModalProps = {
  isOpen: boolean
  onClose?: () => void
  title?: string
  message?: string
  children?: ReactNode
  actions?: ModalAction[]
}

export function Modal({ isOpen, onClose, title, message, children, actions }: ModalProps) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <p className="modal__title">{title}</p>}
        {message && <p className="modal__message">{message}</p>}
        {children}
        {actions && actions.length > 0 && (
          <div className="modal__actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`modal__btn modal__btn--${action.variant ?? 'primary'}`}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
