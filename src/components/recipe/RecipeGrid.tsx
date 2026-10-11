import { CatalogTags } from '../catalog/CatalogTags'
import { FoodImage } from '../FoodImage'
import { NutritionSummary } from '../NutritionSummary'
import { StarRating } from './StarRating'
import { Link, useNavigate } from 'react-router-dom'
import type { Recipe } from '../../types'

import { resolveRecipeImage } from '../../utils/recipeImage'
import { useLanguage } from '../../context/LanguageContext'
import { trackRecipeView } from '../../utils/analytics'
import { recipeMealMacros } from '../../utils/recipeNutrition'
import { categoryEnglish, getRecipeCategories } from '../../utils/recipeCategory'
import { getTeaTags, teaCategoryEnglish } from '../../utils/teaCategory'
import { discountedPrice, sanitizeProductHtml } from '../../utils/product'

type CardVariant = 'recipe' | 'product'

export function RecipeCard({ recipe, openInNewTab = false, variant = 'recipe' }: { recipe: Recipe; openInNewTab?: boolean; variant?: CardVariant }) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const name = language === 'ko' ? recipe.nameKo : recipe.name
  const imageUrl = resolveRecipeImage(recipe)
  const categories = variant === 'product'
    ? getTeaTags(recipe).map(tag => ({ key: tag, label: language === 'ko' ? tag : teaCategoryEnglish[tag] }))
    : getRecipeCategories(recipe).map(category => ({ key: category, label: language === 'ko' ? category : categoryEnglish[category] }))
  const detailPath = recipe.productId ? `/product/${encodeURIComponent(recipe.productId)}` : `/recipe/${encodeURIComponent(recipe.id)}`
  const macros = variant === 'recipe' ? recipeMealMacros(recipe) : null
  const price = recipe.productPricing ? discountedPrice({ pricing: recipe.productPricing }) : null
  const regularPrice = recipe.productPricing?.regular ?? null
  const description = variant === 'product' ? (new DOMParser().parseFromString(sanitizeProductHtml(recipe.productDescription ?? recipe.memo ?? '').replace(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?>/gi, ' '), 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim() : ''

  function handleClick() {
    if (!recipe.productId) trackRecipeView(recipe.nameKo, recipe.name)
    navigate(detailPath)
  }

  const content = <>
      <div className="recipe-card__image-wrap card-photo">
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
        <CatalogTags tags={categories} />
        <h2 className="recipe-card__name">{name}</h2>
        {variant === 'product' && description && <p className="product-card-description" title={description}>{description}</p>}
        {variant === 'product' && <div className="product-card-price">
          <strong>{price === null ? (language === 'ko' ? '가격 미정' : 'Price unavailable') : `${price.toLocaleString('en-US')}${language === 'ko' ? '원' : ' KRW'}`}</strong>
          {price !== null && regularPrice !== null && price < regularPrice && <del aria-label={language === 'ko' ? '정상 판매가' : 'Regular price'}>{regularPrice.toLocaleString('en-US')}{language === 'ko' ? '원' : ' KRW'}</del>}
        </div>}
        {variant === 'recipe' && macros && <>
          <div className="recipe-card__rating"><StarRating label={language === 'ko' ? '맛' : 'Taste'} value={recipe.tasteRating ?? 4} showLabel={false} /></div>
          <p className="recipe-card__macro-grams">{language === 'ko' ? '탄단지(g)' : 'C/P/F(g)'} <span>{Math.round(macros.carbs)} / {Math.round(macros.protein)} / {Math.round(macros.fat)}</span></p>
          <NutritionSummary {...macros} perMeal showRatio={false} />
        </>}
      </div>
    </>
  if (openInNewTab) return <Link className="recipe-card" to={detailPath} target="_blank" rel="noopener noreferrer" aria-label={`${name} (${language === 'ko' ? '새 탭에서 열기' : 'opens in a new tab'})`} onClick={() => { if (!recipe.productId) trackRecipeView(recipe.nameKo, recipe.name) }}>{content}</Link>
  return <article className="recipe-card" onClick={handleClick}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
    role="button" tabIndex={0} aria-label={name}>{content}</article>
}

export function RecipeGrid({ recipes, variant = 'recipe' }: { recipes: Recipe[]; variant?: CardVariant }) {
  return (
    <div className="recipe-grid">
      {recipes.map((r) => <RecipeCard key={r.id} recipe={r} variant={variant} />)}
    </div>
  )
}
