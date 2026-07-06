import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useLanguage } from '../context/LanguageContext'

const COLLECTION = 'signups'

export function SignupPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'

  const [count, setCount] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'duplicate' | 'error'>('idle')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTION), (snap) => {
      setCount(snap.size)
    })
    return unsub
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setStatus('loading')
    try {
      const q = query(collection(db, COLLECTION), where('email', '==', trimmed))
      const existing = await getDocs(q)
      if (!existing.empty) {
        setStatus('duplicate')
        return
      }
      await addDoc(collection(db, COLLECTION), { email: trimmed, createdAt: Date.now() })
      setStatus('done')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="page signup-page">
      <div className="signup-page__counter">
        <span className="signup-page__counter-number">
          {count === null ? '...' : count.toLocaleString()}
        </span>
        <span className="signup-page__counter-label">
          {isKo ? '명이 신청했습니다' : 'people signed up'}
        </span>
      </div>

      <div className="signup-page__goal">
        {isKo
          ? '신청자가 1,000명을 넘으면 회원가입 서비스를 만들겠습니다.'
          : 'Once 1,000 people sign up, we will build a full membership service.'}
      </div>

      <form className="signup-page__form" onSubmit={handleSubmit}>
        <label className="signup-page__label" htmlFor="signup-email">
          {isKo ? '이메일 주소' : 'Email address'}
        </label>
        <div className="signup-page__row">
          <input
            id="signup-email"
            type="email"
            className="signup-page__input"
            placeholder={isKo ? 'example@email.com' : 'example@email.com'}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
            disabled={status === 'loading' || status === 'done'}
          />
          <button
            type="submit"
            className="signup-page__btn"
            disabled={status === 'loading' || status === 'done' || !email.trim()}
          >
            {status === 'loading'
              ? (isKo ? '신청 중...' : 'Submitting...')
              : status === 'done'
              ? (isKo ? '신청 완료 ✓' : 'Done ✓')
              : (isKo ? '신청하기' : 'Sign up')}
          </button>
        </div>

        {status === 'duplicate' && (
          <p className="signup-page__msg signup-page__msg--warn">
            {isKo ? '이미 신청된 이메일입니다.' : 'This email has already been registered.'}
          </p>
        )}
        {status === 'done' && (
          <p className="signup-page__msg signup-page__msg--ok">
            {isKo ? '신청해 주셔서 감사합니다! 서비스 준비가 되면 알려드리겠습니다.' : 'Thank you! We will notify you when the service is ready.'}
          </p>
        )}
        {status === 'error' && (
          <p className="signup-page__msg signup-page__msg--warn">
            {isKo ? '오류가 발생했습니다. 다시 시도해주세요.' : 'Something went wrong. Please try again.'}
          </p>
        )}
      </form>
    </section>
  )
}
