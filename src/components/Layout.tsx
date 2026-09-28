import { SiteHeader } from './SiteHeader'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LanguageProvider, useLanguage } from '../context/LanguageContext'
import { SearchProvider } from '../context/SearchContext'
import { AdminProvider } from '../context/AdminContext'
import { SiteFooter } from './SiteFooter'
import './SiteLayout.css'

function LayoutContent() {
  const { pathname } = useLocation()
  const { language } = useLanguage()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const fullWidth = pathname === '/' || pathname === '/recipes' || pathname === '/ingredients' || (pathname.startsWith('/recipe/') && !pathname.endsWith('/edit'))
  return <div className="site-shell" lang={language}>
    <SiteHeader />
    <main className={fullWidth ? 'reference-main' : 'site-main'}><Outlet /></main>
    <SiteFooter />
  </div>
}

export function Layout() {
  return <AdminProvider><LanguageProvider><SearchProvider><LayoutContent /></SearchProvider></LanguageProvider></AdminProvider>
}
