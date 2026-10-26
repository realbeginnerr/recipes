import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { LanguageToggle } from './LanguageToggle'
import { useAddPageAccess } from './AddPageAccessProvider'
import { useLanguage } from '../context/LanguageContext'
import { useSearch } from '../context/SearchContext'
import { useAdmin } from '../context/AdminContext'
import './SiteHeader.css'
import { CONTACT_URL } from '../constants/contact'
import { shopFeatures } from '../constants/shopFeatures'

export function SiteHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const { resetHome } = useSearch()
  const { isAdmin, logout } = useAdmin()
  const { requestAccess } = useAddPageAccess()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const ko = language === 'ko'
  const links = [
    { to: '/', label: ko ? '홈' : 'Home', end: true },
    { to: '/recipes', label: ko ? '레시피' : 'Recipes', end: false },
    { to: '/ingredients', label: ko ? '식재료' : 'Ingredients', end: false },
    ...(shopFeatures.enabled ? [{ to: '/blending-tea', label: 'Shop', end: false }] : []),
  ]
  useEffect(() => { setMenuOpen(false) }, [pathname])
  const navLinks = links.map(link => <NavLink key={link.to} to={link.to} end={link.end}
    className={({ isActive }) => isActive || (link.to === '/recipes' && pathname.startsWith('/recipe/')) || (link.to === '/blending-tea' && (pathname.startsWith('/product/') || pathname.startsWith('/products/') || pathname === '/shop-settings')) ? 'is-active' : ''}
    onClick={() => { if (link.to === '/recipes') resetHome(); setMenuOpen(false) }}>{link.label}</NavLink>)
  const contactLink = <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Contact</a>
  const adminLink = <Button variant="ghost" size="content" className={`reference-admin-link${pathname === '/admin' ? ' is-active' : ''}`} onClick={async () => {
    setMenuOpen(false)
    if (isAdmin) {
      try { await logout(); navigate('/') } catch (error) { console.error('Admin logout failed', error) }
      return
    }
    requestAccess('/admin')
  }}>{isAdmin ? (ko ? '로그아웃' : 'Sign out') : (ko ? '관리자' : 'Admin')}</Button>
  return <header className="reference-header" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus() } }}>
      <div className="reference-container reference-header-inner">
        <Link className="reference-brand" to="/" aria-label="T's Recipe 홈">
          T'S RECIPE
        </Link>
        <nav className="reference-desktop-nav" aria-label={ko ? '주 메뉴' : 'Main navigation'}>{navLinks}{contactLink}</nav>
        <div className="reference-language-toggle">{adminLink}<LanguageToggle /></div>
        <Button variant="ghost" size="menu" ref={menuButton} className="reference-menu-toggle" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={ko ? (menuOpen ? '메뉴 닫기' : '메뉴 열기') : 'Toggle menu'} onClick={() => setMenuOpen(value => !value)}><span /><span /><span /></Button>
      </div>
      {menuOpen && <nav className="reference-mobile-nav" id="mobile-navigation" aria-label={ko ? '모바일 메뉴' : 'Mobile navigation'}>{navLinks}{contactLink}<div className="reference-mobile-language-toggle">{adminLink}<LanguageToggle /></div></nav>}
    </header>
}
