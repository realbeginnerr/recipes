import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'

type AddPath = '/add-recipe' | '/add-ingredient' | '/ingredients/manage' | `/recipe/${string}/edit` | `/ingredient/${string}/edit`
export function isProtectedPagePath(path: string): path is AddPath {
  return path === '/add-recipe' || path === '/add-ingredient' || path === '/ingredients/manage' || /^\/(recipe|ingredient)\/[^/]+\/edit$/.test(path)
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
  const [error, setError] = useState<'not-admin' | 'provider-disabled' | 'unauthorized-domain' | 'popup-blocked' | 'popup-closed' | 'failed' | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const previousPath = useRef(pathname)
  const requestAccess = useCallback((path: AddPath) => {
    if (isAdmin) {
      navigate(path)
      return
    }
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setError(null)
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
    setError(null)
    if (target && pathname === target) navigate(target === '/add-ingredient' || target === '/ingredients/manage' || target.startsWith('/ingredient/') ? '/ingredients' : target.startsWith('/recipe/') ? target.slice(0, -5) : '/recipes', { replace: true })
  }
  async function signIn() {
    if (!target || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await login()
      if (result.ok) {
        setTarget(null)
        navigate(target)
      } else {
        setError(result.reason)
      }
    } catch {
      setError('failed')
    } finally {
      setIsSubmitting(false)
    }
  }
  function getErrorMessage(): string {
    if (error === 'not-admin') return ko ? '허용된 관리자 계정(hijmjo@gmail.com)으로 로그인해 주세요.' : 'Sign in with the authorized administrator account.'
    if (error === 'provider-disabled') return ko ? 'Firebase Console에서 Authentication > Google 로그인을 활성화해 주세요.' : 'Enable Google under Firebase Console > Authentication.'
    if (error === 'unauthorized-domain') return ko ? 'Firebase Console의 승인된 도메인에 realbeginnerr.github.io를 추가해 주세요.' : 'Add realbeginnerr.github.io to Firebase Authentication authorized domains.'
    if (error === 'popup-blocked') return ko ? '브라우저에서 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요.' : 'Allow pop-ups for this site, then try again.'
    if (error === 'popup-closed') return ko ? 'Google 로그인 창이 닫혔습니다. 로그인 창에서 계정을 선택하고 완료해 주세요.' : 'The Google sign-in window closed before sign-in completed.'
    return ko ? 'Google 로그인에 실패했습니다. 개발자 도구 콘솔의 Firebase 오류 코드를 확인해 주세요.' : 'Google sign-in failed. Check the Firebase error code in the developer console.'
  }
  return <AccessContext.Provider value={{ requestAccess, approvedPath }}>
    {children}
    <Dialog open={target !== null} onOpenChange={open => { if (!open) cancel() }}>
      <DialogContent finalFocus={returnFocus}>
        <DialogHeader>
          <DialogTitle>{ko ? '관리자 로그인' : 'Admin login'}</DialogTitle>
          <DialogDescription>{ko ? '관리자 Google 계정으로 로그인해 주세요.' : 'Sign in with the administrator Google account.'}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && <p role="alert" className="text-sm text-destructive">{getErrorMessage()}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={cancel} disabled={isSubmitting}>{ko ? '취소' : 'Cancel'}</Button>
            <Button type="button" className="flex-1" onClick={signIn} disabled={isSubmitting}>{isSubmitting ? (ko ? 'Google 로그인 중…' : 'Signing in…') : (ko ? 'Google로 로그인' : 'Sign in with Google')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </AccessContext.Provider>
}
