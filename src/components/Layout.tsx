import { type FormEvent, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LanguageProvider,
  useLanguage,
} from '../context/LanguageContext'
import { SearchProvider, useSearch } from '../context/SearchContext'
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

function NavMenu() {
  const { language } = useLanguage()
  const { resetHome } = useSearch()

  const links = [
    { to: '/', label: language === 'ko' ? '홈' : 'Home', end: true, onClick: resetHome },
    { to: '/add-recipe', label: language === 'ko' ? '레시피 추가' : 'Add Recipe', end: false },
    { to: '/ingredients', label: language === 'ko' ? '식재료' : 'Ingredients', end: false },
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

  const links = [
    { to: '/', label: language === 'ko' ? '홈' : 'Home', onClick: () => { resetHome(); navigate('/'); setOpen(false) } },
    { to: '/add-recipe', label: language === 'ko' ? '레시피 추가' : 'Add Recipe', onClick: () => { navigate('/add-recipe'); setOpen(false) } },
    { to: '/ingredients', label: language === 'ko' ? '식재료' : 'Ingredients', onClick: () => { navigate('/ingredients'); setOpen(false) } },
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
    <LanguageProvider>
      <SearchProvider>
        <LayoutContent />
      </SearchProvider>
    </LanguageProvider>
  )
}
