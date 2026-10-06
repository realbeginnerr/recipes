import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BackLink } from '../components/BackLink'
import { Button } from '../components/ui/button'
import { RecipeCard } from '../components/recipe/RecipeGrid'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { recipes as staticRecipes } from '../data/recipe'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import { loadRecipesFromFirestore, mergeStaticAndFirestoreRecipes } from '../services/recipeService'
import { chooseRecipe, RECENT_RECIPE_EXCLUSION_COUNT, ROULETTE_SPIN_DURATION_MS, ROULETTE_TRAVEL_CARDS, rouletteProgress } from '../utils/recipeRoulette'
import type { Recipe } from '../types'
import './RecipePage.css'
import './RecipeRoulettePage.css'
import '../components/RecipeTitle.css'

export function RecipeRoulettePage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const ko = language === 'ko'
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [strip, setStrip] = useState<Recipe[]>([])
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [spinVersion, setSpinVersion] = useState(0)
  const [sideCount, setSideCount] = useState(() => Math.ceil(window.innerWidth / (2 * 408)) + 1)
  const [centeredIndex, setCenteredIndex] = useState(sideCount)
  const reel = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  const mounted = useRef(false)
  const recent = useRef<string[]>([])
  const position = useRef(sideCount)
  const stride = useRef(0)
  const offset = useRef(0)
  const destination = useRef<Recipe | null>(null)
  const frame = useRef(0)

  async function fetchRecipes() {
    await loadIngredientsFromFirestore()
    return mergeStaticAndFirestoreRecipes(staticRecipes, await loadRecipesFromFirestore()).filter(recipe => isAdmin || !recipe.hidden)
  }
  function restingStrip(recipe: Recipe, pool: Recipe[]) {
    const index = pool.findIndex(item => item.id === recipe.id)
    return Array.from({ length: sideCount * 2 + 1 }, (_, slot) => pool[((index + slot - sideCount) % pool.length + pool.length) % pool.length])
  }
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; cancelAnimationFrame(frame.current) }
  }, [])
  useEffect(() => {
    const resize = () => setSideCount(Math.ceil(window.innerWidth / (2 * 408)) + 1)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    void fetchRecipes().then(pool => {
      if (cancelled) return
      setRecipes(pool)
      setSelected(null)
      position.current = sideCount
      setCenteredIndex(sideCount)
      setStrip(pool.length ? restingStrip(pool[0], pool) : [])
    }).catch(() => { if (!cancelled) setError(true) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt, isAdmin])

  useLayoutEffect(() => {
    if (!reel.current || !viewport.current || !strip.length) return
    const track = reel.current
    const view = viewport.current
    const cards = [...track.querySelectorAll<HTMLElement>('.recipe-card')]
    function measure() {
      const cardWidth = Math.min(384, Math.max(1, view.clientWidth - 80))
      view.style.setProperty('--roulette-card-width', `${cardWidth}px`)
      stride.current = cardWidth + 24
      offset.current = (view.clientWidth - stride.current) / 2
      const height = Math.ceil(Math.max(...cards.map(card => card.getBoundingClientRect().height)))
      view.style.height = `${height + 48}px`
      view.style.setProperty('--roulette-card-height', `${height}px`)
      track.style.setProperty('--roulette-stride', `${stride.current}px`)
      track.style.transform = `translateX(${offset.current - position.current * stride.current}px)`
    }
    measure()
    const observer = new ResizeObserver(measure)
    cards.forEach(card => observer.observe(card))
    observer.observe(view)
    return () => observer.disconnect()
  }, [strip, language])

  useEffect(() => {
    if (!spinVersion || !destination.current) return
    const result = destination.current
    const startIndex = position.current
    const targetIndex = strip.length - sideCount - 1
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let start: number | null = null
    function finish() {
      recent.current = [result.id, ...recent.current.filter(id => id !== result.id)].slice(0, RECENT_RECIPE_EXCLUSION_COUNT)
      destination.current = null
      setSelected(result)
      setCenteredIndex(targetIndex)
      setBusy(false)
      lock.current = false
    }
    function tick(time: number) {
      if (start === null) start = time
      const progress = reducedMotion.matches ? 1 : Math.min(1, (time - start) / ROULETTE_SPIN_DURATION_MS)
      position.current = startIndex + (targetIndex - startIndex) * rouletteProgress(progress)
      if (reel.current) reel.current.style.transform = `translateX(${offset.current - position.current * stride.current}px)`
      if (progress === 1) finish()
      else frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [spinVersion])

  async function spin() {
    if (lock.current || loading) return
    lock.current = true
    setBusy(true)
    setError(false)
    try {
      const pool = await fetchRecipes()
      if (!mounted.current) return
      setRecipes(pool)
      const result = chooseRecipe(pool, recent.current)
      if (!result) { setStrip([]); setSelected(null); setBusy(false); lock.current = false; return }
      const first = pool.find(recipe => recipe.id === selected?.id) ?? pool[0]
      const moving = Array.from({ length: ROULETTE_TRAVEL_CARDS }, () => pool[Math.floor(Math.random() * pool.length)])
      position.current = sideCount
      setCenteredIndex(sideCount)
      destination.current = result
      // Keep the visible neighbors at the start of the next spin, too.
      const fallback = restingStrip(first, pool)
      const leading = fallback.map((recipe, index) => strip[centeredIndex - sideCount + index] ?? recipe)
      const trailing = restingStrip(result, pool).slice(sideCount + 1)
      setStrip([...leading, ...moving, result, ...trailing])
      setSpinVersion(value => value + 1)
    } catch {
      if (!mounted.current) return
      setError(true)
      setBusy(false)
      lock.current = false
    }
  }

  return <section className="page recipe-catalog recipe-roulette" lang={language}>
    <BackLink />
    <h1 className="recipe-detail-title">{ko ? '레시피 랜덤 룰렛' : 'Random recipe roulette'}</h1>
    {loading ? <LoadingState label={ko ? '레시피 불러오는 중' : 'Loading recipes'} /> : <>
      {error && <ContentState error title={ko ? '레시피를 불러오지 못했습니다.' : 'Unable to load recipes.'}><Button onClick={() => setAttempt(value => value + 1)} disabled={busy}>{ko ? '다시 시도' : 'Retry'}</Button></ContentState>}
      {!error && !recipes.length && <ContentState title={ko ? '저장된 레시피가 없어요.' : 'No saved recipes yet.'} />}
      {!!strip.length && <div className="recipe-roulette__viewport" ref={viewport} aria-busy={busy} aria-label={ko ? '중앙 레시피 선택 영역' : 'Center recipe selection'}>
        <div className="recipe-roulette__reel" ref={reel}>
          {strip.map((recipe, index) => {
            const active = !busy && index === centeredIndex && selected?.id === recipe.id
            return <div className="recipe-roulette__cell" key={`${index}-${recipe.id}`} inert={!active} aria-hidden={!active}><RecipeCard recipe={recipe} openInNewTab /></div>
          })}
        </div>
        <div className="recipe-roulette__selection" aria-hidden="true" />
      </div>}
      <div className="recipe-roulette__actions"><Button type="button" disabled={busy || !recipes.length || error} onClick={spin}>{busy ? (ko ? '돌리는 중…' : 'Spinning…') : (ko ? '돌리기' : 'Spin')}</Button></div>
    </>}
    <p className="recipe-roulette__status" role="status" aria-live="polite" aria-atomic="true">{busy ? (ko ? '레시피를 고르고 있어요.' : 'Choosing a recipe.') : selected ? (ko ? `${selected.nameKo} 선택! 카드를 누르면 새 탭에서 열립니다.` : `${selected.name} selected! Open the card in a new tab.`) : ''}</p>
  </section>
}
