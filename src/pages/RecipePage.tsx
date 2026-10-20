import { useAddPageAccess } from '../components/AddPageAccessProvider'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { RegistrationActions } from '../components/catalog/RegistrationRequestButton'
import { PageIntro, CatalogToolbar, CategoryFilter, SearchField, SortSelect } from '../components/catalog/CatalogControls'
import { Button } from '@/components/ui/button'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useSearch } from '../context/SearchContext'
import { useAdmin } from '../context/AdminContext'
import { RecipeGrid } from '../components/recipe/RecipeGrid'
import { recipes as staticRecipes } from '../data/recipe'
import { recipeMatchesSearch } from '../utils/search'
import { recipeContainsIngredient } from '../utils/recipeIngredients'
import { ingredientById } from '../data/ingredientCache'
import { loadRecipesFromFirestore, mergeStaticAndFirestoreRecipes } from '../services/recipeService'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import { loadProducts } from '../services/productService'
import { recipeCategories, categoryEnglish, getRecipeCategories, type RecipeCategory } from '../utils/recipeCategory'
import { teaCategoryEnglish, getTeaTags, type TeaCategory } from '../utils/teaCategory'
import type { Recipe } from '../types'
import './RecipePage.css'

export function RecipePage({ blendingTea = false }: { blendingTea?: boolean }) {
  const { requestAccess } = useAddPageAccess()
  const { homeVersion, resetHome } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const appliedSearch = searchParams.get('q') ?? ''
  const ingredientId = searchParams.get('ingredient') ?? ''
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const ko = language === 'ko'
  const itemLabel = blendingTea ? (ko ? '차' : 'Tea') : (ko ? '레시피' : 'Recipes')
  const selectedIngredient = ingredientById.get(ingredientId)
  const ingredientName = selectedIngredient ? (ko ? selectedIngredient.nameKo ?? selectedIngredient.name : selectedIngredient.name) : ingredientId
  const [recipes, setRecipes] = useState<Recipe[]>(staticRecipes)
  const [category, setCategory] = useState<RecipeCategory[]>([])
  const [teaCategory, setTeaCategory] = useState<TeaCategory>('전체')
  const [sortOrder, setSortOrder] = useState('date-desc')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [limit, setLimit] = useState(8)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadFailed(false)
      try {
        await loadIngredientsFromFirestore()
        const docs = await loadRecipesFromFirestore()
        const products = blendingTea ? await loadProducts(isAdmin) : []
        const productCards: Recipe[] = products.map(product => ({ id: `product-${product.id}`, productId: product.seo.slug || product.id, productPricing: product.pricing, productDescription: product.description, catalogOrder: product.order, catalog: 'tea', categories: ['차'], teaTags: product.teaTags, name: product.name, nameKo: product.name, imageUrl: product.images[0]?.url ?? '', imageUrls: product.images.map(image => image.url), items: [], memo: [product.summary, ...product.teaTags].join(' '), createdAt: product.createdAt, hidden: product.draft || product.visibility === 'private' }))
        if (!cancelled) setRecipes([...mergeStaticAndFirestoreRecipes(staticRecipes, docs), ...productCards])
      } catch {
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [loadAttempt, blendingTea, isAdmin])

  const visibleRecipes = useMemo(() => recipes
    .filter(recipe => isAdmin || !recipe.hidden)
    .filter(recipe => blendingTea ? recipe.catalog === 'tea' || getRecipeCategories(recipe).includes('차') : recipe.catalog !== 'tea')
    .filter(recipe => category.length === 0 || getRecipeCategories(recipe).some(value => category.includes(value)))
    .filter(recipe => !blendingTea || teaCategory === '전체' || getTeaTags(recipe).includes(teaCategory))
    .filter(recipe => !appliedSearch || recipeMatchesSearch(recipe, appliedSearch))
    .filter(recipe => !ingredientId || recipeContainsIngredient(recipe, ingredientId))
    .sort((a, b) => {
      if (sortOrder.startsWith('alpha')) {
        const result = (ko ? a.nameKo : a.name).localeCompare(ko ? b.nameKo : b.name, language)
        return sortOrder === 'alpha-asc' ? result : -result
      }
      const result = (a.createdAt ?? 0) - (b.createdAt ?? 0)
      return sortOrder === 'date-asc' ? result : -result
    }), [recipes, category, teaCategory, appliedSearch, ingredientId, isAdmin, sortOrder, ko, language, blendingTea])

  useEffect(() => { setLimit(8) }, [category, teaCategory, appliedSearch, ingredientId, sortOrder, homeVersion])
  useEffect(() => { setCategory([]); setTeaCategory('전체') }, [homeVersion])
  const hasMore = limit < visibleRecipes.length
  useEffect(() => {
    if (!hasMore || loading || !sentinel.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setLimit(current => current + 8)
    }, { rootMargin: '160px' })
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [hasMore, limit, loading])

  return <section className="recipe-catalog recipe-list-catalog" lang={language}>
    <PageIntro
      backgroundImage={blendingTea ? `${import.meta.env.BASE_URL}images/service/tea-header.png` : `${import.meta.env.BASE_URL}images/service/home-care.png`}
      title={blendingTea ? 'Shop' : (ko ? '나에게 해준 요리, 해줄 요리' : 'Gotta eat something tasty tomorrow too')}
      description={blendingTea ? '' : (ko ? '' : 'Find the recipe you’re craving with categories and search.')}
    />
    <CatalogToolbar>
      {blendingTea
        ? <CategoryFilter<TeaCategory> label={ko ? '상품 분류' : 'Product categories'} value={teaCategory} options={(['전체', '에코백', '기타'] as const).map(value => ({ value, label: ko ? value : teaCategoryEnglish[value] }))} onValueChange={setTeaCategory} />
        : <CategoryFilter<RecipeCategory> label={ko ? '레시피 분류' : 'Recipe categories'} value={category.length ? category : ['전체']} options={recipeCategories.map(value => ({ value, label: ko ? value : categoryEnglish[value] }))} onValueChange={value => setCategory(value === '전체' ? [] : [value])} />}
      <SearchField label={blendingTea ? (ko ? '검색' : 'Search') : (ko ? `${itemLabel} 검색` : `Search ${itemLabel.toLowerCase()}`)} value={appliedSearch} onValueChange={value => setSearchParams(current => {
        const next = new URLSearchParams(current)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      }, { replace: true })} />
      <SortSelect label={blendingTea ? (ko ? '상품 정렬' : 'Sort products') : (ko ? '레시피 정렬' : 'Sort recipes')} value={sortOrder} options={[ { value: 'date-desc', label: ko ? '최근 등록순' : 'Newest first' }, { value: 'date-asc', label: ko ? '오래된 등록순' : 'Oldest first' }, { value: 'alpha-asc', label: ko ? 'ㄱ→ㅎ' : 'A→Z' }, { value: 'alpha-desc', label: ko ? 'ㅎ→ㄱ' : 'Z→A' }]} onValueChange={setSortOrder} />
    </CatalogToolbar>
    <div className="catalog-container catalog-results" aria-busy={loading}>
      {ingredientId && <p className="catalog-count">{ko ? `${ingredientName} 포함 레시피` : `Recipes with ${ingredientName}`} · <Button variant="link" size="content" onClick={() => setSearchParams(current => {
        const next = new URLSearchParams(current)
        next.delete('ingredient')
        return next
      })}>{ko ? '재료 필터 해제' : 'Clear ingredient filter'}</Button></p>}
      {!loading && <div className="catalog-count-row"><p className="catalog-count" role="status">{itemLabel} <strong>{visibleRecipes.length}{ko ? '개' : ''}</strong>{appliedSearch && <span> · “{appliedSearch}”</span>}</p>{isAdmin && !blendingTea && <Button onClick={() => requestAccess('/add-recipe')} variant="link" size="content" className="catalog-intro__subtle-action">{ko ? '레시피 추가' : 'Add recipe'}</Button>}</div>}
      {loadFailed ? <ContentState error title={ko ? `${itemLabel}를 불러오지 못했습니다` : `Unable to load ${itemLabel.toLowerCase()}`}><Button className="catalog-primary" onClick={() => setLoadAttempt(n => n + 1)}>{ko ? '다시 시도' : 'Try again'}</Button></ContentState>
        : loading ? <LoadingState skeleton label={ko ? `${itemLabel} 불러오는 중` : `Loading ${itemLabel.toLowerCase()}`} />
        : visibleRecipes.length === 0 ? <ContentState icon={blendingTea ? '🍵' : '🥗'} title={ko ? `조건에 맞는 ${blendingTea ? '차' : itemLabel}가 없어요` : `No ${itemLabel.toLowerCase()} match your selection`} description={ko ? '필터를 조정하거나 새로운 항목을 등록해보세요.' : 'Try adjusting your filters or adding a new item.'}><div className="catalog-empty-actions"><Button className="catalog-primary" onClick={() => { setCategory([]); setSearchParams({}); resetHome() }}>{ko ? '필터 초기화' : 'Reset filters'}</Button>{!blendingTea && <RegistrationActions kind="recipe" />}</div></ContentState>
        : <><RecipeGrid recipes={visibleRecipes.slice(0, limit)} variant={blendingTea ? 'product' : 'recipe'} /><div className="catalog-end" ref={sentinel}>{hasMore ? <Button variant="ghost" size="content" type="button" onClick={() => setLimit(n => n + 8)}>{ko ? `${itemLabel} 더 보기` : `Load more ${itemLabel.toLowerCase()}`}</Button> : <span>🎉 {ko ? blendingTea ? '차를 모두 둘러봤어요!' : '내가 만들어본 레시피 끝!' : `You’ve seen all the ${itemLabel.toLowerCase()}!`}</span>}</div></>}
    </div>
  </section>
}
