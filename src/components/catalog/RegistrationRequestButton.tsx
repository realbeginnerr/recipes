import { Button } from '../ui/button'
import { CONTACT_URL } from '../../constants/contact'
import { useLanguage } from '../../context/LanguageContext'
import { useAddPageAccess } from '../AddPageAccessProvider'

export function RegistrationRequestButton({ kind }: { kind: 'recipe' | 'ingredient' }) {
  const { language } = useLanguage()
  const label = language === 'ko'
    ? kind === 'recipe' ? '레시피 등록 요청' : '식재료 등록 요청'
    : kind === 'recipe' ? 'Request a recipe' : 'Request an ingredient'
  return <Button className="catalog-primary" nativeButton={false} render={<a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" />}>{label}</Button>
}

export function RegistrationActions({ kind }: { kind: 'recipe' | 'ingredient' }) {
  const { language } = useLanguage()
  const { requestAccess } = useAddPageAccess()
  const label = language === 'ko'
    ? kind === 'recipe' ? '레시피 추가' : '식재료 추가'
    : kind === 'recipe' ? 'Add recipe' : 'Add ingredient'
  return <div className="catalog-registration-actions">
    <RegistrationRequestButton kind={kind} />
    <Button className="catalog-primary" onClick={() => requestAccess(kind === 'recipe' ? '/add-recipe' : '/add-ingredient')}>{label}</Button>
  </div>
}
