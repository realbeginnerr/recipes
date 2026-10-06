import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './BackLink.css'

export function BackLink({ to = '/recipes' }: { to?: string }) {
  const { language } = useLanguage()
  return <Link className="detail-back" to={to}>{language === 'ko' ? '← 뒤로가기' : '← All recipes'}</Link>
}
