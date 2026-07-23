import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../types'

const base = import.meta.env.BASE_URL

const localImageMap: Record<string, string> = {
  '닭갈비': `${base}images/닭갈비.png`,
  '쫄면': `${base}images/쫄면.png`,
  '피자': `${base}images/피자.png`,
  '멸치볶음': `${base}images/멸치볶음.jpeg`,
  '가지볶음': `${base}images/가지볶음.jpg`,
  '가지볶음, 멸치볶음': `${base}images/가지볶음.jpg`,
  '버섯 토스트': `${base}images/버섯 토스트.png`,
  '감자탕': `${base}images/감자탕.jpg`,
  '고추바사삭': `${base}images/고추바사삭.jpg`,
  '칠리콘카르네': `${base}images/칠리콘카르네.jpg`,
  '단팥빵': `${base}images/20260710_단팥빵.jpg`,
}

function resolveImage(recipe: Recipe): string {
  if (recipe.imageUrl) return recipe.imageUrl
  return localImageMap[recipe.nameKo] ?? ''
}
import { useLanguage } from '../context/LanguageContext'
import { trackRecipeView } from '../utils/analytics'
import { getRecipeBadge } from '../utils/recipeBadge'
import { RecipeBadge, MacroBadge } from './RecipeBadge'

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const name = language === 'ko' ? recipe.nameKo : recipe.name
  const imageUrl = resolveImage(recipe)
  const badge = getRecipeBadge(recipe)

  function handleClick() {
    trackRecipeView(recipe.nameKo, recipe.name)
    navigate(`/recipe/${recipe.id}`)
  }

  return (
    <article
      className="recipe-card"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      role="button"
      tabIndex={0}
      aria-label={name}
    >
      <div className="recipe-card__image-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="recipe-card__image" />
        ) : (
          <div className="recipe-card__placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
              <path d="M7 2v20"/>
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/>
              <path d="M21 15v7"/>
            </svg>
          </div>
        )}
      </div>
      <div className="recipe-card__footer">
        <span className="recipe-card__name">{name}</span>
        <div style={{ marginTop: '4px', marginBottom: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <RecipeBadge result={badge} language={language} />
          <MacroBadge result={badge} language={language} />
        </div>
      </div>
    </article>
  )
}

export function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="recipe-grid">
      {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
    </div>
  )
}
