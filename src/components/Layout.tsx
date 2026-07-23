import { type FormEvent, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { trackSignupClick } from '../utils/analytics'
import {
  LanguageProvider,
  useLanguage,
} from '../context/LanguageContext'
import { SearchProvider, useSearch } from '../context/SearchContext'
import { AdminProvider, useAdmin } from '../context/AdminContext'
import { LanguageToggle } from './LanguageToggle'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function HeaderTitle() {
  const navigate = useNavigate()
  const location = useLocation()
  const { resetHome } = useSearch()
  const { t } = useLanguage()

  function handleClick() {
    resetHome()
    if (location.pathname === '/') {
      navigate(0)
    } else {
      navigate('/')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="m-0 p-0 h-auto text-[1.05rem] font-bold text-foreground whitespace-nowrap flex-shrink-0 hover:text-primary hover:bg-transparent transition-colors"
      onClick={handleClick}
    >
      {t.appTitle}
    </Button>
  )
}

function AdminButton() {
  const { isAdmin, login, logout } = useAdmin()
  const { language } = useLanguage()
  const [showInput, setShowInput] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    if (isAdmin) {
      logout()
      return
    }
    setShowInput((prev) => !prev)
    setPin('')
    setError(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await login(pin)
    if (ok) {
      setShowInput(false)
      setPin('')
      setError(false)
    } else {
      setError(true)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`px-[0.65rem] py-[0.35rem] rounded-md text-sm bg-transparent border-none cursor-pointer transition-all whitespace-nowrap ${
          isAdmin
            ? 'opacity-100 text-primary font-semibold'
            : 'opacity-10 text-foreground hover:opacity-100 hover:text-primary'
        }`}
        onClick={handleClick}
      >
        {isAdmin
          ? (language === 'ko' ? '관리자 ✓' : 'Admin ✓')
          : (language === 'ko' ? '관리자' : 'Admin')}
      </button>
      {showInput && !isAdmin && (
        <form
          className="absolute top-[calc(100%+6px)] left-0 flex items-center gap-[0.4rem] bg-card border border-border rounded-lg px-3 py-2 shadow-[var(--shadow)] z-[200] whitespace-nowrap max-[768px]:fixed max-[768px]:top-12 max-[768px]:left-1/2 max-[768px]:-translate-x-1/2"
          onSubmit={handleSubmit}
        >
          <Input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false) }}
            placeholder="PIN"
            maxLength={20}
            className="w-28"
          />
          <Button type="submit" size="sm">
            {language === 'ko' ? '확인' : 'OK'}
          </Button>
          {error && (
            <span className="text-xs text-destructive">
              {language === 'ko' ? '잘못된 PIN' : 'Wrong PIN'}
            </span>
          )}
        </form>
      )}
    </div>
  )
}

function NavMenu() {
  const { language } = useLanguage()
  const { resetHome } = useSearch()
  const { isAdmin } = useAdmin()

  const links = [
    { to: '/eating-out', label: language === 'ko' ? '외식/배달' : 'Eating Out', end: false, onClick: undefined, locked: false },
    { to: '/', label: language === 'ko' ? '집밥 요리' : 'Recipes', end: true, onClick: resetHome, locked: false },
    { to: '/ingredients', label: language === 'ko' ? '식재료' : 'Ingredients', end: false, locked: !isAdmin },
  ]

  return (
    <nav className="flex items-center gap-1 flex-shrink-0 max-[1079px]:hidden">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `px-[0.65rem] py-[0.35rem] rounded-md text-sm no-underline whitespace-nowrap transition-colors ${
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-primary'
            }`
          }
          onClick={link.onClick}
        >
          {link.label}
          {link.locked && <span className="ml-1 text-[0.75em] opacity-50">🔒</span>}
        </NavLink>
      ))}
      <AdminButton />
    </nav>
  )
}

function SignupLink() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  if (isAdmin) return null
  return (
    <NavLink
      to="/signup"
      className="flex-shrink-0 px-[1.1rem] py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold whitespace-nowrap no-underline hover:brightness-105 transition-all"
      onClick={trackSignupClick}
    >
      {language === 'ko' ? '회원가입 신청' : 'Sign Up'}
    </NavLink>
  )
}

function HeaderSearch() {
  const { searchInput, setSearchInput, applySearch } = useSearch()
  const { t } = useLanguage()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    applySearch()
  }

  return (
    <form className="flex items-center gap-2 ml-auto flex-shrink min-w-0" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="ingredient-search">
        {t.searchLabel}
      </label>
      <div className="relative flex items-center">
        <Input
          id="ingredient-search"
          type="search"
          className="w-[min(220px,40vw)] pr-8"
          placeholder={t.searchPlaceholder}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 bottom-0 w-8 h-auto text-primary hover:bg-transparent hover:brightness-105"
          aria-label={t.searchButton}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </Button>
      </div>
    </form>
  )
}

function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { resetHome } = useSearch()
  const { isAdmin } = useAdmin()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const links = [
    { to: '/eating-out', label: language === 'ko' ? '외식/배달' : 'Eating Out', onClick: () => { navigate('/eating-out'); setOpen(false) }, locked: false },
    { to: '/', label: language === 'ko' ? '집밥 요리' : 'Recipes', onClick: () => { resetHome(); navigate('/'); setOpen(false) }, locked: false },
    { to: '/ingredients', label: language === 'ko' ? '식재료' : 'Ingredients', onClick: () => { navigate('/ingredients'); setOpen(false) }, locked: !isAdmin },
  ]

  return (
    <div className="relative min-[1080px]:hidden" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="flex flex-col justify-center items-center gap-[5px] w-8 h-8 p-1"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="block w-5 h-[2px] bg-foreground rounded" />
        <span className="block w-5 h-[2px] bg-foreground rounded" />
        <span className="block w-5 h-[2px] bg-foreground rounded" />
      </Button>
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 min-w-[180px] bg-card border border-border rounded-xl shadow-lg z-[200] py-2 flex flex-col gap-1">
          <div className="h-px bg-border mx-3 my-1" />
          {links.map((link) => (
            <Button
              key={link.to}
              type="button"
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm text-foreground hover:text-primary h-auto"
              onClick={link.onClick}
            >
              {link.label}
              {link.locked && <span className="ml-1 text-[0.75em] opacity-50">🔒</span>}
            </Button>
          ))}
          <div className="h-px bg-border mx-3 my-1" />
          <div className="px-3 py-1">
            <LanguageToggle />
          </div>
          <div className="h-px bg-border mx-3 my-1" />
          <div className="px-3 py-1">
            <AdminButton />
          </div>
        </div>
      )}
    </div>
  )
}

function LayoutContent() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-[100] flex items-center flex-nowrap gap-x-4 gap-y-3 bg-[rgba(250,249,245,0.92)] backdrop-blur-sm border-b border-border shadow-[var(--shadow)] px-5 py-[0.65rem]">
        <HeaderTitle />
        <NavMenu />
        <HeaderSearch />
        <SignupLink />
        <div className="max-[1079px]:hidden">
          <LanguageToggle />
        </div>
        <HamburgerMenu />
      </header>
      <main className="flex-1 px-5 pt-[3.75rem] max-w-[900px] w-full mx-auto">
        <Outlet />
      </main>
      <footer className="mt-[130px] bg-card border-t border-border px-5 py-4 text-center">
        <p className="m-0 text-sm text-muted-foreground">{t.footerCopyright}</p>
      </footer>
    </div>
  )
}

export function Layout() {
  return (
    <AdminProvider>
      <LanguageProvider>
        <SearchProvider>
          <LayoutContent />
        </SearchProvider>
      </LanguageProvider>
    </AdminProvider>
  )
}
