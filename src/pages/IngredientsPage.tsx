import { useLanguage } from '../context/LanguageContext'
import { ingredients } from '../data/ingredients'

export function IngredientsPage() {
  const { language } = useLanguage()

  const sorted = [...ingredients].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section className="page">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{language === 'ko' ? '식재료' : 'Ingredient'}</th>
              <th>{language === 'ko' ? '기준량' : 'Per'}</th>
              <th>{language === 'ko' ? '탄수화물 (g)' : 'Carbs (g)'}</th>
              <th>{language === 'ko' ? '단백질 (g)' : 'Protein (g)'}</th>
              <th>{language === 'ko' ? '지방 (g)' : 'Fat (g)'}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ing) => (
              <tr key={ing.id}>
                <td>{language === 'ko' && ing.nameKo ? ing.nameKo : ing.name}</td>
                <td>{ing.baseAmount}{ing.baseUnit}</td>
                <td>{ing.carbs.toFixed(1)}</td>
                <td>{ing.protein.toFixed(1)}</td>
                <td>{ing.fat.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
