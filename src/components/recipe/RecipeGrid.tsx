import { formatTableNumber } from '../../utils/numberFormatting'
import { CatalogTags } from '../catalog/CatalogTags'
import { FoodImage } from '../FoodImage'
import { NutritionSummary } from '../NutritionSummary'
import { StarRating } from './StarRating'
import { Link } from 'react-router-dom'
import type { Recipe } from '../../types'

import { resolveRecipeImage } from '../../utils/recipeImage'
import { useLanguage } from '../../context/LanguageContext'
import { trackRecipeView } from '../../utils/analytics'
import { recipeMealMacros, recipeProteinPowderGrams, recipeNutritionIncomplete } from '../../utils/recipeNutrition'
import { categoryEnglish, getRecipeCategories } from '../../utils/recipeCategory'
import { getTeaTags, teaCategoryEnglish } from '../../utils/teaCategory'
import { discountedPrice, sanitizeProductHtml } from '../../utils/product'
import { getRecipeDisplayName } from '../../utils/displayNames'
import { translateContent } from '../../i18n/content'

type CardVariant = 'recipe' | 'product'

export function RecipeCard({ recipe, openInNewTab = false, variant = 'recipe' }: { recipe: Recipe; openInNewTab?: boolean; variant?: CardVariant }) {
  const { language } = useLanguage()
  const name = getRecipeDisplayName(recipe, language)
  const minutes = recipe.cookingTimeMinutes
  const cookingTime = minutes === undefined
    ? (language === 'ko' ? '확인필요' : 'To be confirmed')
    : minutes < 60
      ? `${minutes}${language === 'ko' ? '분' : ' min'}`
      : [`${Math.floor(minutes / 60)}${language === 'ko' ? '시간' : ' hr'}`, ...(minutes % 60 ? [`${minutes % 60}${language === 'ko' ? '분' : ' min'}`] : [])].join(' ')
  const imageUrl = resolveRecipeImage(recipe)
  const categories = variant === 'product'
    ? getTeaTags(recipe).map(tag => ({ key: tag, label: language === 'ko' ? tag : teaCategoryEnglish[tag] }))
    : getRecipeCategories(recipe).map(category => ({ key: category, label: language === 'ko' ? category : categoryEnglish[category] }))
  const detailPath = recipe.productId ? `/product/${encodeURIComponent(recipe.productId)}` : `/recipe/${encodeURIComponent(recipe.id)}`
  const macros = variant === 'recipe' ? recipeMealMacros(recipe) : null
  const incomplete = variant === 'recipe' && recipeNutritionIncomplete(recipe)
  const powderGrams = variant === 'recipe' ? recipeProteinPowderGrams(recipe) : 0
  const price = recipe.productPricing ? discountedPrice({ pricing: recipe.productPricing }) : null
  const regularPrice = recipe.productPricing?.regular ?? null
  const description = variant === 'product' ? (new DOMParser().parseFromString(sanitizeProductHtml(translateContent(recipe.productDescription ?? recipe.memo, language)).replace(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?>/gi, ' '), 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim() : ''

  const content = <>
      <div className="recipe-card__image-wrap card-photo">
        <FoodImage src={imageUrl} alt={name} className="recipe-card__image" />
      </div>
      <div className="recipe-card__footer">
        <h2 className="recipe-card__name">{name}</h2>
        <CatalogTags tags={categories} />
        {variant === 'product' && description && <p className="product-card-description" title={description}>{description}</p>}
        {variant === 'product' && <div className="product-card-price">
          <strong>{price === null ? (language === 'ko' ? '가격 미정' : 'Price unavailable') : `${price.toLocaleString('en-US', { maximumFractionDigits: 1 })}${language === 'ko' ? '원' : ' KRW'}`}</strong>
          {price !== null && regularPrice !== null && price < regularPrice && <del aria-label={language === 'ko' ? '정상 판매가' : 'Regular price'}>{regularPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}{language === 'ko' ? '원' : ' KRW'}</del>}
        </div>}
        {variant === 'recipe' && macros && <>
          {incomplete && <p className="text-sm">{language === 'ko' ? '일부 재료 제외 · 영양 정보 불완전' : 'Some ingredients excluded · Incomplete nutrition'}</p>}
          <div className="recipe-card__rating"><StarRating label={language === 'ko' ? '맛' : 'Taste'} value={recipe.tasteRating ?? 4} showLabel={false} /></div>
          <p className="recipe-card__macro-grams">{language === 'ko' ? '탄단지(g)' : 'C/P/F(g)'} <span>{formatTableNumber(macros.carbs)} <span className="recipe-card__macro-separator">•</span> {formatTableNumber(macros.protein)}{powderGrams > 0 && <span className="recipe-card__powder-grams" title={language === 'ko' ? `단백질 파우더 섭취량: ${formatTableNumber(powderGrams)}g` : `Protein powder serving: ${formatTableNumber(powderGrams)}g`}> ({formatTableNumber(powderGrams)})</span>} <span className="recipe-card__macro-separator">•</span> {formatTableNumber(macros.fat)}</span></p>
          <NutritionSummary {...macros} perMeal showRatio={false} />
          <p className="recipe-card__cooking-time">{language === 'ko' ? '조리시간' : 'Cooking time'} <span>{cookingTime}</span></p>
        </>}
      </div>
    </>
  if (openInNewTab) return <Link className="recipe-card" to={detailPath} target="_blank" rel="noopener noreferrer" aria-label={`${name} (${language === 'ko' ? '새 탭에서 열기' : 'opens in a new tab'})`} onClick={() => { if (!recipe.productId) trackRecipeView(recipe.nameKo, recipe.name) }}>{content}</Link>
  return <Link className="recipe-card" to={detailPath} aria-label={name}
    onClick={() => { if (!recipe.productId) trackRecipeView(recipe.nameKo, recipe.name) }}>{content}</Link>
}

export function RecipeGrid({ recipes, variant = 'recipe' }: { recipes: Recipe[]; variant?: CardVariant }) {
  return (
    <div className="recipe-grid">
      {recipes.map((r) => <RecipeCard key={r.id} recipe={r} variant={variant} />)}
    </div>
  )
}
