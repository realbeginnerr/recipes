import { type FormEvent, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LanguageProvider,
  useLanguage,
} from '../context/LanguageContext'
import { SearchProvider, useSearch } from '../context/SearchContext'
import { AdminProvider, useAdmin } from '../context/AdminContext'
import { LanguageToggle } from './LanguageToggle'

function HeaderTitle() {
  const navigate = useNavigate()
  const { resetHome } = useSearch()
  const { t } = useLanguage()

  function handleClick() {
    resetHome()
    navigate('/', { replace: true })
  }

  return (
    <button
      type="button"
      className="header__title-btn"
      onClick={handleClick}
    >
      {t.appTitle}
    </button>
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (login(pin)) {
      setShowInput(false)
      setPin('')
      setError(false)
    } else {
      setError(true)
    }
  }

  return (
    <div className="admin-btn-wrap">
      <button
        type="button"
        className={`header-nav__link admin-nav-btn${isAdmin ? ' admin-nav-btn--active' : ''}`}
        onClick={handleClick}
      >
        {isAdmin
          ? (language === 'ko' ? '관리자 ✓' : 'Admin ✓')
          : (language === 'ko' ? '관리자' : 'Admin')}
      </button>
      {showInput && !isAdmin && (
        <form className="admin-pin-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            className="admin-pin-input"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false) }}
            placeholder="PIN"
            maxLength={20}
          />
          <button type="submit" className="admin-pin-submit">
            {language === 'ko' ? '확인' : 'OK'}
          </button>
          {error && (
            <span className="admin-pin-error">
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
    { to: '/', label: language === 'ko' ? '홈' : 'Home', end: true, onClick: resetHome },
    ...(isAdmin ? [{ to: '/add-recipe', label: language === 'ko' ? '레시피 추가' : 'Add Recipe', end: false }] : []),
    ...(isAdmin ? [{ to: '/ingredients', label: language === 'ko' ? '식재료' : 'Ingredients', end: false }] : []),
  ]

  return (
    <nav className="header-nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `header-nav__link${isActive ? ' header-nav__link--active' : ''}`
          }
          onClick={link.onClick}
        >
          {link.label}
        </NavLink>
      ))}
      <AdminButton />
    </nav>
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
    <form className="header-search" onSubmit={handleSubmit}>
      <label className="header-search__label" htmlFor="ingredient-search">
        {t.searchLabel}
      </label>
      <input
        id="ingredient-search"
        type="search"
        className="header-search__input"
        placeholder={t.searchPlaceholder}
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
      />
      <button type="submit" className="header-search__button">
        {t.searchButton}
      </button>
    </form>
  )
}

function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const { resetHome } = useSearch()
  const { isAdmin } = useAdmin()

  const links = [
    { to: '/', label: language === 'ko' ? '홈' : 'Home', onClick: () => { resetHome(); navigate('/'); setOpen(false) } },
    ...(isAdmin ? [{ to: '/add-recipe', label: language === 'ko' ? '레시피 추가' : 'Add Recipe', onClick: () => { navigate('/add-recipe'); setOpen(false) } }] : []),
    ...(isAdmin ? [{ to: '/ingredients', label: language === 'ko' ? '식재료' : 'Ingredients', onClick: () => { navigate('/ingredients'); setOpen(false) } }] : []),
  ]

  return (
    <div className="hamburger">
      <button
        type="button"
        className="hamburger__btn"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="hamburger__bar" />
        <span className="hamburger__bar" />
        <span className="hamburger__bar" />
      </button>
      {open && (
        <>
          <div className="hamburger__backdrop" onClick={() => setOpen(false)} />
          <div className="hamburger__menu">
            <button
              type="button"
              className="hamburger__title-btn"
              onClick={() => { resetHome(); navigate('/'); setOpen(false) }}
            >
              {t.appTitle}
            </button>
            <div className="hamburger__divider" />
            {links.map((link) => (
              <button
                key={link.to}
                type="button"
                className="hamburger__title-btn"
                onClick={link.onClick}
              >
                {link.label}
              </button>
            ))}
            <div className="hamburger__divider" />
            <LanguageToggle />
            <div className="hamburger__divider" />
            <AdminButton />
          </div>
        </>
      )}
    </div>
  )
}

function LayoutContent() {
  const { t } = useLanguage()

  return (
    <div className="app">
      <header className="header">
        <HeaderTitle />
        <NavMenu />
        <HeaderSearch />
        <LanguageToggle />
        <HamburgerMenu />
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p className="footer__text">{t.footerCopyright}</p>
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
