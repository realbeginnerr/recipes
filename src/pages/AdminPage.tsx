import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'
import { useLanguage } from '../context/LanguageContext'
import { Button } from '../components/ui/button'
import { recipes as staticRecipes } from '../data/recipe'
import { ingredients as ingredientCache } from '../data/ingredientCache'
import { loadRecipesFromFirestore, mergeStaticAndFirestoreRecipes } from '../services/recipeService'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import { loadProducts } from '../services/productService'
import type { Ingredient, Recipe } from '../types'
import type { Product } from '../types/product'
import './AdminPage.css'

export function AdminPage() {
  const { logout } = useAdmin()
  const { language } = useLanguage()
  const ko = language === 'ko'
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    async function load() {
      const [recipeResult, ingredientResult, productResult] = await Promise.allSettled([
        loadRecipesFromFirestore(), loadIngredientsFromFirestore(), loadProducts(true),
      ])
      if (cancelled) return
      setRecipes(recipeResult.status === 'fulfilled' ? mergeStaticAndFirestoreRecipes(staticRecipes, recipeResult.value) : [])
      setIngredients(ingredientResult.status === 'fulfilled' ? [...ingredientCache] : [])
      setProducts(productResult.status === 'fulfilled' ? productResult.value : [])
      setError([recipeResult, ingredientResult, productResult].some(result => result.status === 'rejected'))
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [attempt])
  const matches = (name: string) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  return <div className="admin-page">
    <header className="admin-heading"><h1>{ko ? '관리자' : 'Admin'}</h1><Button variant="outline" onClick={async () => { try { await logout(); navigate('/') } catch { setError(true) } }}>{ko ? '로그아웃' : 'Sign out'}</Button></header>
    <div className="admin-actions">
      <Link to="/add-recipe">{ko ? '레시피 추가' : 'Add recipe'}</Link>
      <Link to="/add-ingredient">{ko ? '식재료 추가' : 'Add ingredient'}</Link>
      <Link to="/ingredients/manage">{ko ? '식재료 일괄 관리 · 제보 확인' : 'Manage ingredients and reports'}</Link>
      <Link to="/products/new">{ko ? '상품 추가' : 'Add product'}</Link>
      <Link to="/shop-settings">{ko ? '배송·교환·반품 정책 설정' : 'Shop policies'}</Link>
    </div>
    <label className="admin-search">{ko ? '관리할 항목 검색' : 'Search items'}<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {loading && <p role="status">{ko ? '목록을 불러오는 중입니다…' : 'Loading…'}</p>}
    {error && <div role="alert">{ko ? '일부 목록을 불러오지 못했거나 로그아웃에 실패했습니다.' : 'Some lists or sign-out could not be completed.'}<Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{ko ? '다시 시도' : 'Retry'}</Button></div>}
    {!loading && <>
      <section><h2>{ko ? '레시피 수정 · 삭제' : 'Edit or delete recipes'}</h2><ul>{recipes.filter(recipe => matches(ko ? recipe.nameKo : recipe.name)).map(recipe => <li key={recipe.id}><Link to={`/recipe/${encodeURIComponent(recipe.id)}/edit`}>{ko ? recipe.nameKo : recipe.name}{recipe.hidden ? (ko ? ' · 비공개' : ' · Hidden') : ''}</Link></li>)}</ul></section>
      <section><h2>{ko ? '식재료 수정 · 삭제' : 'Edit or delete ingredients'}</h2><ul>{ingredients.filter(ingredient => matches(ko ? ingredient.nameKo ?? ingredient.name : ingredient.name)).map(ingredient => <li key={ingredient.id}><Link to={`/ingredient/${encodeURIComponent(ingredient.id)}/edit`}>{ko ? ingredient.nameKo ?? ingredient.name : ingredient.name}</Link></li>)}</ul></section>
      <section><h2>{ko ? '상품 수정 · 복제 · 삭제' : 'Manage products'}</h2><ul>{products.filter(product => matches(product.name)).map(product => <li key={product.id}><Link to={`/products/${encodeURIComponent(product.id)}/edit`}>{product.name}{product.draft ? (ko ? ' · 임시 저장' : ' · Draft') : ''}</Link></li>)}</ul></section>
    </>}
  </div>
}
