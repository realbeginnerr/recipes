import { FoodImage } from '../FoodImage'
import { MacroSummary } from '../MacroDisplay'
import { NutritionSummary } from '../NutritionSummary'
import { StarRating } from './StarRating'
import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../../types'

import { resolveRecipeImage } from '../../utils/recipeImage'
import { useLanguage } from '../../context/LanguageContext'
import { trackRecipeView } from '../../utils/analytics'
import { recipeMealMacros } from '../../utils/recipeNutrition'
import { categoryEnglish, getRecipeCategories } from '../../utils/recipeCategory'

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const name = language === 'ko' ? recipe.nameKo : recipe.name
  const imageUrl = resolveRecipeImage(recipe)
  const categories = getRecipeCategories(recipe)
  const { carbs, protein, fat } = recipeMealMacros(recipe)

  function handleClick() {
    trackRecipeView(recipe.nameKo, recipe.name)
    navigate(`/recipe/${recipe.id}`)
  }

  return (
    <article
      className="recipe-card"
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
      role="button"
      tabIndex={0}
      aria-label={name}
    >
      <div className="recipe-card__image-wrap">
        <FoodImage src={imageUrl} alt={name} className="recipe-card__image" empty={<div className="recipe-card__placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
              <path d="M7 2v20"/>
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/>
              <path d="M21 15v7"/>
            </svg>
          </div>} />
      </div>
      <div className="recipe-card__footer">
        <div className="catalog-card-categories">{categories.map(category => <span key={category} className="catalog-category">{language === 'ko' ? category : categoryEnglish[category]}</span>)}</div>
        <h2 className="recipe-card__name">{name}</h2>
        <div className="recipe-card__rating"><StarRating label={language === 'ko' ? '맛' : 'Taste'} value={recipe.tasteRating ?? 4} showLabel={false} /></div>
        <MacroSummary macros={{ carbs, protein, fat }} variant="recipe" />
        <NutritionSummary carbs={carbs} protein={protein} fat={fat} perMeal />
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
