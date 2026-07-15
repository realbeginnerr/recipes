import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

function toButtonVariant(v?: 'primary' | 'danger' | 'ghost') {
  if (v === 'danger') return 'destructive' as const
  if (v === 'ghost') return 'outline' as const
  return 'default' as const
}

export function Modal({ isOpen, onClose, title, message, children, actions }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose() }}>
      <DialogContent showCloseButton={!!onClose}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {message && <p className="text-sm text-foreground">{message}</p>}
        {children}
        {actions && actions.length > 0 && (
          <DialogFooter>
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={toButtonVariant(action.variant)}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            ))}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
