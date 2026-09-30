import './RelatedRecipes.css'
import { Link } from 'react-router-dom'
import type { Recipe } from '../../types'
import { useLanguage } from '../../context/LanguageContext'
import { resolveRecipeImage } from '../../utils/recipeImage'
import { FoodImage } from '../FoodImage'

export function RelatedRecipes({ recipes: related, ingredientId }: { recipes: Recipe[]; ingredientId: string }) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const first = related[0]
  return <div className="ingredient-related">
    <div className="ingredient-related-heading">
      <p>{ko ? '관련 레시피' : 'Recipes with this ingredient'}</p>
      {related.length > 1 && <Link className="ingredient-more" to={`/recipes?ingredient=${encodeURIComponent(ingredientId)}`}>{ko ? '더보기' : 'More'}</Link>}
    </div>
    {first ? <Link className="ingredient-recipe" to={`/recipe/${first.id}`}><FoodImage src={resolveRecipeImage(first)} alt="" /><span>{ko ? first.nameKo : first.name}</span></Link> : <span className="ingredient-no-recipes">{ko ? '관련 레시피가 없어요.' : 'No recipes yet.'}</span>}
  </div>
}
