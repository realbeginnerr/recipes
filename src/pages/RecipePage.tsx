import { useAddPageAccess } from '../components/AddPageAccessProvider'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
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
import { recipeCategories, categoryEnglish, getRecipeCategories, type RecipeCategory } from '../utils/recipeCategory'
import type { Recipe } from '../types'
import './RecipePage.css'

export function RecipePage() {
  const { requestAccess } = useAddPageAccess()
  const { homeVersion, resetHome } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const appliedSearch = searchParams.get('q') ?? ''
  const ingredientId = searchParams.get('ingredient') ?? ''
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const ko = language === 'ko'
  const selectedIngredient = ingredientById.get(ingredientId)
  const ingredientName = selectedIngredient ? (ko ? selectedIngredient.nameKo ?? selectedIngredient.name : selectedIngredient.name) : ingredientId
  const [recipes, setRecipes] = useState<Recipe[]>(staticRecipes)
  const [category, setCategory] = useState<RecipeCategory[]>([])
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
        if (!cancelled) setRecipes(mergeStaticAndFirestoreRecipes(staticRecipes, docs))
      } catch {
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [loadAttempt])

  const visibleRecipes = useMemo(() => recipes
    .filter(recipe => isAdmin || !recipe.hidden)
    .filter(recipe => category.length === 0 || getRecipeCategories(recipe).some(value => category.includes(value)))
    .filter(recipe => !appliedSearch || recipeMatchesSearch(recipe, appliedSearch))
    .filter(recipe => !ingredientId || recipeContainsIngredient(recipe, ingredientId))
    .sort((a, b) => {
      if (sortOrder.startsWith('alpha')) {
        const result = (ko ? a.nameKo : a.name).localeCompare(ko ? b.nameKo : b.name, language)
        return sortOrder === 'alpha-asc' ? result : -result
      }
      const result = (a.createdAt ?? 0) - (b.createdAt ?? 0)
      return sortOrder === 'date-asc' ? result : -result
    }), [recipes, category, appliedSearch, ingredientId, isAdmin, sortOrder, ko, language])

  useEffect(() => { setLimit(8) }, [category, appliedSearch, ingredientId, sortOrder, homeVersion])
  useEffect(() => { setCategory([]) }, [homeVersion])
  const hasMore = limit < visibleRecipes.length
  useEffect(() => {
    if (!hasMore || loading || !sentinel.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setLimit(current => current + 8)
    }, { rootMargin: '160px' })
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [hasMore, limit, loading])

  return <section className="recipe-catalog" lang={language}>
    <PageIntro
      title={ko ? '다음주엔 뭘 해줄까?' : 'Gotta eat something tasty tomorrow too'}
      description={ko ? '' : 'Find the recipe you’re craving with categories and search.'}
      titleImage={{ src: `${import.meta.env.BASE_URL}images/라마얼굴만동동 (윙크).png`, alt: ko ? '윙크하는 라마 얼굴' : 'Winking llama face' }}
    />
    <CatalogToolbar>
      <CategoryFilter<RecipeCategory> label={ko ? '레시피 분류' : 'Recipe categories'} value={category.length ? category : ['전체']} options={recipeCategories.map(value => ({ value, label: ko ? value : categoryEnglish[value] }))} onValueChange={value => setCategory(value === '전체' ? [] : [value])} />
      <SearchField label={ko ? '레시피 검색' : 'Search recipes'} value={appliedSearch} onValueChange={value => setSearchParams(current => {
        const next = new URLSearchParams(current)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      }, { replace: true })} />
      <SortSelect label={ko ? '레시피 정렬' : 'Sort recipes'} value={sortOrder} options={[{ value: 'date-desc', label: ko ? '최근 등록순' : 'Newest first' }, { value: 'date-asc', label: ko ? '오래된 등록순' : 'Oldest first' }, { value: 'alpha-asc', label: ko ? '이름순 (ㄱ~ㅎ)' : 'Name (A–Z)' }, { value: 'alpha-desc', label: ko ? '이름순 (ㅎ~ㄱ)' : 'Name (Z–A)' }]} onValueChange={setSortOrder} />
    </CatalogToolbar>
    <div className="catalog-container catalog-results" aria-busy={loading}>
      {ingredientId && <p className="catalog-count">{ko ? `${ingredientName} 포함 레시피` : `Recipes with ${ingredientName}`} · <Button variant="link" size="content" onClick={() => setSearchParams(current => {
        const next = new URLSearchParams(current)
        next.delete('ingredient')
        return next
      })}>{ko ? '재료 필터 해제' : 'Clear ingredient filter'}</Button></p>}
      {!loading && <div className="catalog-count-row"><p className="catalog-count" role="status">{ko ? '레시피 ' : 'Recipes '}<strong>{visibleRecipes.length}{ko ? '개' : ''}</strong>{appliedSearch && <span> · “{appliedSearch}”</span>}</p><Button onClick={() => requestAccess('/add-recipe')} variant="link" size="content" className="catalog-intro__subtle-action">{ko ? '레시피 추가' : 'Add recipe'}</Button></div>}
      {loadFailed ? <ContentState error title={ko ? '레시피를 불러오지 못했습니다' : 'Unable to load recipes'}><Button className="catalog-primary" onClick={() => setLoadAttempt(n => n + 1)}>{ko ? '다시 시도' : 'Try again'}</Button></ContentState>
        : loading ? <LoadingState skeleton label={ko ? '레시피 불러오는 중' : 'Loading recipes'} />
        : visibleRecipes.length === 0 ? <ContentState icon="🥗" title={ko ? '조건에 맞는 레시피가 없어요' : 'No recipes match your selection'} description={ko ? '필터를 조정해보세요.' : 'Try adjusting your filters.'}><div className="flex flex-wrap items-center justify-center gap-2">{appliedSearch.trim() && <Button type="button" variant="outline">{ko ? '이 레시피 추가해주세요' : 'Please add this recipe'}</Button>}<Button className="catalog-primary" onClick={() => { setCategory([]); setSearchParams({}); resetHome() }}>{ko ? '필터 초기화' : 'Reset filters'}</Button></div></ContentState>
        : <><RecipeGrid recipes={visibleRecipes.slice(0, limit)} /><div className="catalog-end" ref={sentinel}>{hasMore ? <Button variant="ghost" size="content" type="button" onClick={() => setLimit(n => n + 8)}>{ko ? '레시피 더 보기' : 'Load more recipes'}</Button> : <span>🎉 {ko ? '내가 만들어본 레시피 끝!' : 'You’ve seen all the recipes!'}</span>}</div></>}
    </div>
  </section>
}
