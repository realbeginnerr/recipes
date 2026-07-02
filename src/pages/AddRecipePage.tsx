import { useLanguage } from '../context/LanguageContext'

export function AddRecipePage() {
  const { language } = useLanguage()

  return (
    <section className="page">
      <h2 className="page__heading">
        {language === 'ko' ? '레시피 추가' : 'Add Recipe'}
      </h2>
    </section>
  )
}
