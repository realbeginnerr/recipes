import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function AddPagePasswordGate({ children }: { children: ReactNode }) {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const ko = language === 'ko'
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)

  function handleCancel() {
    if (window.history.state?.idx > 0) {
      navigate(-1)
    } else {
      navigate(pathname === '/add-ingredient' ? '/ingredients' : '/recipes', { replace: true })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password === '9876') {
      setUnlocked(true)
      setPassword('')
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (unlocked) return <>{children}</>

  return <section className="page mx-auto w-full max-w-sm py-12">
    <h1 className="page__heading">{ko ? '암호 입력' : 'Enter password'}</h1>
    <p className="page__description">{ko ? '추가 페이지에 접근하려면 암호를 입력해 주세요.' : 'Enter the password to access this page.'}</p>
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <label htmlFor="add-page-password">{ko ? '암호' : 'Password'}</label>
      <Input id="add-page-password" type="password" inputMode="numeric" autoComplete="off" autoFocus required
        value={password} onChange={event => { setPassword(event.target.value); setError(false) }}
        aria-invalid={error} aria-describedby={error ? 'add-page-password-error' : undefined} />
      {error && <p id="add-page-password-error" role="alert" className="text-sm text-destructive">
        {ko ? '암호가 올바르지 않습니다.' : 'Incorrect password.'}
      </p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>{ko ? '취소' : 'Cancel'}</Button>
        <Button type="submit" className="flex-1">{ko ? '확인' : 'Continue'}</Button>
      </div>
    </form>
  </section>
}
