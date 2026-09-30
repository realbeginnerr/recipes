import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'

type AddPath = '/add-recipe' | '/add-ingredient' | `/recipe/${string}/edit`
export function isProtectedPagePath(path: string): path is AddPath {
  return path === '/add-recipe' || path === '/add-ingredient' || /^\/recipe\/[^/]+\/edit$/.test(path)
}
const AccessContext = createContext<{ requestAccess: (path: AddPath) => void; approvedPath: AddPath | null } | null>(null)

export function useAddPageAccess() {
  const value = useContext(AccessContext)
  if (!value) throw new Error('AddPageAccessProvider is required')
  return value
}

export function AddPageAccessProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage()
  const { isAdmin, login } = useAdmin()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const ko = language === 'ko'
  const [target, setTarget] = useState<AddPath | null>(null)
  const approvedPath = isAdmin && isProtectedPagePath(pathname) ? pathname : null
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const previousPath = useRef(pathname)
  const requestAccess = useCallback((path: AddPath) => {
    if (isAdmin) {
      navigate(path)
      return
    }
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setPassword('')
    setError(false)
    setTarget(path)
  }, [isAdmin, navigate])
  useEffect(() => {
    if (previousPath.current !== pathname) {
      setTarget(current => current === pathname ? current : null)
      previousPath.current = pathname
    }
  }, [pathname])
  function cancel() {
    if (isSubmitting) return
    setTarget(null)
    setPassword('')
    setError(false)
    if (target && pathname === target) navigate(target === '/add-ingredient' ? '/ingredients' : target.startsWith('/recipe/') ? target.slice(0, -5) : '/recipes', { replace: true })
  }
  return <AccessContext.Provider value={{ requestAccess, approvedPath }}>
    {children}
    <Dialog open={target !== null} onOpenChange={open => { if (!open) cancel() }}>
      <DialogContent initialFocus={input} finalFocus={returnFocus}>
        <DialogHeader>
          <DialogTitle>{ko ? '관리자 로그인' : 'Admin login'}</DialogTitle>
          <DialogDescription>{ko ? '계속하려면 관리자 비밀번호로 로그인해 주세요.' : 'Sign in with your administrator password to continue.'}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={async event => {
          event.preventDefault()
          if (!target || isSubmitting) return
          setIsSubmitting(true)
          setError(false)
          try {
          if (await login(password)) {
            setTarget(null)
            setPassword('')
            navigate(target)
          } else {
            setError(true)
            setPassword('')
            input.current?.focus()
          }
          } catch {
            setError(true)
          } finally {
            setIsSubmitting(false)
          }
        }}>
          <label htmlFor="add-page-password">{ko ? '관리자 비밀번호' : 'Administrator password'}</label>
          <Input ref={input} id="add-page-password" type="password" autoComplete="current-password" required readOnly={isSubmitting}
            value={password} onChange={event => { setPassword(event.target.value); setError(false) }}
            aria-invalid={error} aria-describedby={error ? 'add-page-password-error' : undefined} />
          {error && <p id="add-page-password-error" role="alert" className="text-sm text-destructive">{ko ? '로그인하지 못했습니다. 관리자 비밀번호와 설정을 확인해 주세요.' : 'Unable to sign in. Check your administrator password and configuration.'}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={cancel} disabled={isSubmitting}>{ko ? '취소' : 'Cancel'}</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? (ko ? '로그인 중…' : 'Signing in…') : (ko ? '로그인' : 'Sign in')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </AccessContext.Provider>
}
