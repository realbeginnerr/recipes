import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'

type ToastType = 'success' | 'error' | 'info'

type ToastProps = {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    if (duration === 0) return () => cancelAnimationFrame(frame)
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      setVisible(false)
      closeTimer = setTimeout(onClose, 300)
    }, duration)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      clearTimeout(closeTimer)
    }
  }, [duration, onClose, message, type])

  return createPortal(
    <div role={type === 'error' ? 'alert' : 'status'} className={`toast toast--${type} ${visible ? 'toast--visible' : ''}`}>
      <span className="toast__message">{message}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="toast__close"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </Button>
    </div>,
    document.body,
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  const closeToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, closeToast }
}
