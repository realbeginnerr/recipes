import { useAddPageAccess } from '../components/AddPageAccessProvider'
import { ContentState } from '../components/feedback/ContentState'
import { IngredientCard } from '../components/ingredient/IngredientCard'
import { IngredientsPage as IngredientTable } from './IngredientManagementPage'
import { LayoutGrid, List } from 'lucide-react'
import { PageIntro, CatalogToolbar, CategoryFilter, SearchField } from '../components/catalog/CatalogControls'
import { Button } from '@/components/ui/button'
import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { ingredients as ingredientCache } from '../data/ingredientCache'
import { recipes as staticRecipes } from '../data/recipe'
import { ingredientPresentation } from '../data/ingredientPresentation'
import { ingredientByName, loadIngredientsFromFirestore } from '../services/ingredientService'
import { loadRecipesFromFirestore, mergeStaticAndFirestoreRecipes } from '../services/recipeService'
import type { Ingredient, Recipe } from '../types'
import './RecipePage.css'
import './IngredientsPage.css'
import { recipeContainsIngredient } from '../utils/recipeIngredients'
import { ingredientCategory } from '../utils/ingredientCategory'
import { loadFavoriteIngredientIds } from '../utils/ingredientFavorites'

const categories = ['전체', '탄수화물', '단백질', '지방', '채소', '과일', '기타']
const filterOptions = ['전체', '즐겨찾기', ...categories.slice(1)]
const english: Record<string, string> = { 전체: 'All', 즐겨찾기: 'Favorites', 탄수화물: 'Carbs', 단백질: 'Protein', 지방: 'Fats', 채소: 'Vegetables', 과일: 'Fruit', 기타: 'Other' }
function presentation(ingredient: Ingredient) {
  const name = ingredient.nameKo ?? ingredient.name
  const stored = ingredientByName.get(name) ?? ingredientByName.get(ingredient.name.toLowerCase())
  const reference = ingredientPresentation[name] ?? Object.entries(ingredientPresentation).find(([key]) => name.includes(key))?.[1]
  const category = ingredientCategory(ingredient, stored?.category, reference?.category)
  const hasImageOverride = stored && Object.prototype.hasOwnProperty.call(stored, 'imageUrl')
  const image = hasImageOverride ? stored.imageUrl || undefined : reference?.image
  return { category, image, createdAt: stored?.createdAt ?? 0 }
}

export function IngredientsPage() {
  const { requestAccess } = useAddPageAccess()
  const { language } = useLanguage()
  const ko = language === 'ko'
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>(staticRecipes)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string[]>([])
  const [favorites, setFavorites] = useState(loadFavoriteIngredientIds)
  useEffect(() => {
    const refresh = () => setFavorites(loadFavoriteIngredientIds())
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try { return localStorage.getItem('ingredient-view') === 'list' ? 'list' : 'grid' } catch { return 'grid' }
  })
  function changeView(next: 'grid' | 'list') {
    setView(next)
    try { localStorage.setItem('ingredient-view', next) } catch { /* Keep switching available without storage. */ }
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    async function load() {
      try {
        await loadIngredientsFromFirestore()
        if (!cancelled) {
          setIngredients([...ingredientCache])
          setFavorites(loadFavoriteIngredientIds())
        }
        const docs = await loadRecipesFromFirestore()
        if (!cancelled) setRecipes(mergeStaticAndFirestoreRecipes(staticRecipes, docs))
      } catch { if (!cancelled) setError(true) }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [attempt])
  const visible = useMemo(() => ingredients.filter(ingredient => {
    const match = `${ingredient.name} ${ingredient.nameKo ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    const selectedCategories = category.filter(value => value !== '즐겨찾기')
    return match && (!category.includes('즐겨찾기') || favorites.has(ingredient.id))
      && (selectedCategories.length === 0 || selectedCategories.includes(presentation(ingredient).category))
  }).sort((a, b) => {
    return (ko ? a.nameKo ?? a.name : a.name).localeCompare(ko ? b.nameKo ?? b.name : b.name, language)
  }), [ingredients, query, category, favorites, ko, language])

  return <section className="recipe-catalog ingredient-catalog" lang={language}>
    <PageIntro
      title={ko ? '식재료 정보는 다 여기에' : 'Organizing ingredient info is a chore.. But it has to be done..'}
      description={ko ? '' : 'Search ingredients to find their nutrition and recipes that use them.'}
      titleImage={{ src: `${import.meta.env.BASE_URL}images/라마얼굴만동동 (안경).png`, alt: ko ? '안경 쓴 라마 얼굴' : 'Llama face with glasses' }}
    />
    <CatalogToolbar>
      <CategoryFilter label={ko ? '식재료 분류' : 'Ingredient categories'} value={category.length ? category : ['전체']} options={filterOptions.map(value => ({ value, label: ko ? value : english[value] }))} onValueChange={value => {
        if (value === '즐겨찾기') setFavorites(loadFavoriteIngredientIds())
        setCategory(value === '전체' ? [] : [value])
      }} />
      <SearchField label={ko ? '식재료 검색' : 'Search ingredients'} value={query} onValueChange={setQuery} />
      <div className="flex shrink-0 gap-1" role="group" aria-label={ko ? '레이아웃 보기' : 'Layout view'}>
        <Button type="button" variant="filter" size="icon" aria-pressed={view === 'grid'} aria-label={ko ? '그리드 모드' : 'Grid view'} title={ko ? '그리드 모드' : 'Grid view'} onClick={() => changeView('grid')}><LayoutGrid aria-hidden="true" /></Button>
        <Button type="button" variant="filter" size="icon" aria-pressed={view === 'list'} aria-label={ko ? '리스트 모드' : 'List view'} title={ko ? '리스트 모드' : 'List view'} onClick={() => changeView('list')}><List aria-hidden="true" /></Button>
      </div>
    </CatalogToolbar>
    <div className="catalog-container catalog-results" aria-busy={loading}>
      {!loading && <div className="catalog-count-row"><p className="catalog-count" role="status">{ko ? '식재료 ' : 'Ingredients '}<strong>{visible.length}{ko ? '개' : ''}</strong>{query && <span> · “{query}”</span>}</p><Button onClick={() => requestAccess('/add-ingredient')} variant="link" size="content" className="catalog-intro__subtle-action">{ko ? '식재료 추가' : 'Add ingredient'}</Button></div>}
      {error && <ContentState variant="inline" error title={ko ? '최신 정보를 불러오지 못했습니다. 저장된 정보를 표시합니다.' : 'Could not load the latest data. Showing available ingredients.'}><Button variant="ghost" size="content" onClick={() => setAttempt(value => value + 1)}>{ko ? '다시 시도' : 'Retry'}</Button></ContentState>}
      {visible.length === 0 ? <ContentState icon="⌕" title={ko ? '찾으시는 재료가 아직 없어요.' : 'We could not find that ingredient.'} description={ko ? '다른 이름으로 검색하거나, 철자를 확인해 보세요.' : 'Try another name or check the spelling.'}>{query.trim() && <Button type="button" variant="outline">{ko ? '이 식재료 추가해주세요' : 'Please add this ingredient'}</Button>}</ContentState> :
      view === 'list' ? <IngredientTable visibleIds={visible.map(ingredient => ingredient.id)} /> : <div className="ingredient-grid">{visible.map(ingredient => {
        const related = recipes.filter(recipe => !recipe.hidden && recipeContainsIngredient(recipe, ingredient.id))
        const details = presentation(ingredient)
        return <IngredientCard key={ingredient.id} ingredient={ingredient} image={details.image} category={ko ? details.category : english[details.category]} related={related} onEdit={() => requestAccess(`/ingredient/${ingredient.id}/edit`)} />
      })}</div>}
    </div>
  </section>
}
