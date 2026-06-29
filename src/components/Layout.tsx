import { type FormEvent } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
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

function LayoutContent() {
  const { t } = useLanguage()

  return (
    <div className="app">
      <header className="header">
        <HeaderTitle />
        <HeaderSearch />
        <LanguageToggle />
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
