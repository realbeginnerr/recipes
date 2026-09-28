import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useSearch } from '../context/SearchContext'

export function SiteFooter() {
  const { language } = useLanguage()
  const { resetHome } = useSearch()
  const ko = language === 'ko'
  return <footer className="reference-footer"><div className="reference-container">
    <div className="reference-footer-grid">
      <div><h2>T's Recipe</h2><p>{ko ? '고마운 꼬마를 위한 레시피 기록' : 'Everyday recipes with balanced carbs, protein, and fat. We do the calculations; you just choose.'}</p></div>
      <nav aria-label={ko ? '하단 메뉴' : 'Footer navigation'}><h3>{ko ? '메뉴' : 'Menu'}</h3><Link to="/">{ko ? '홈' : 'Home'}</Link><Link to="/recipes" onClick={resetHome}>{ko ? '레시피' : 'Recipes'}</Link><Link to="/ingredients">{ko ? '식재료' : 'Ingredients'}</Link></nav>
      <div><h3>{ko ? '소셜' : 'Social'}</h3><span>Instagram</span><span>Threads</span><span>YouTube</span></div>
    </div>
    <p className="reference-copyright">© 2026 T's Recipe. All rights reserved.</p>
  </div></footer>
}
