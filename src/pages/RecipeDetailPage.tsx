import { RelatedImageProducts } from '../components/recipe/RelatedImageProducts'
import { ShoppableImage } from '../components/recipe/ShoppableImage'
import { recipeGalleryImages } from '../utils/recipeGallery'
import { NutritionTable, MacroCells } from '../components/NutritionTable'
import { NutritionSummary } from '../components/NutritionSummary'
import { StarRating } from '../components/recipe/StarRating'
import { QuantityUnitCells } from '../components/QuantityUnitCells'
import { FoodImage } from '../components/FoodImage'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { Dialog as ImageDialog } from '@base-ui/react/dialog'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../components/BackLink'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { ingredientById } from '../data/ingredientCache'
import { recipes as staticRecipes } from '../data/recipe'
import { getIngredientById, loadIngredientsFromFirestore } from '../services/ingredientService'
import { loadRecipesFromFirestore, mergeStaticAndFirestoreRecipes } from '../services/recipeService'
import { amountToGrams, calculateMacros, convertUnit } from '../utils/nutrition'
import { categoryEnglish, getRecipeCategories } from '../utils/recipeCategory'
import type { Ingredient, Recipe, RecipeRowState } from '../types'
import '../components/catalog/CatalogControls.css'
import './RecipeDetailPage.css'
import { recipeCookingGroups } from '../utils/recipeCookingGroups'
import '../components/RecipeTitle.css'

type Macros = { carbs: number; protein: number; fat: number }
const zero = (): Macros => ({ carbs: 0, protein: 0, fat: 0 })
function ingredientFor(id: string) { return ingredientById.get(id === '__multigrain_rice__' ? 'multigrain-rice' : id) }
function macrosFor(row: RecipeRowState): Macros {
  const ingredient = ingredientFor(row.ingredientId)
  return ingredient ? calculateMacros(amountToGrams(row.amount, row.unit, ingredient.conversions), ingredient) : zero()
}
function sum(rows: Macros[]) { return rows.reduce((total, row) => ({ carbs: total.carbs + row.carbs, protein: total.protein + row.protein, fat: total.fat + row.fat }), zero()) }
function initialRows(recipe: Recipe) { return recipe.items.map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: item.defaultUnit })) }
function amount(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0 }

function TableNutritionSummary({ total, showRatio = false }: { total: Macros; showRatio?: boolean }) {
  return <div className="detail-nutrition-summary">
    <NutritionSummary {...total} showRatio={showRatio} />
  </div>
}

function RecipeImageGallery({ recipe, name, ko }: { recipe: Recipe; name: string; ko: boolean }) {
  const galleryImages = recipeGalleryImages(recipe)
  const images = galleryImages.map(image => image.url)
  const [selected, setSelected] = useState(0)
  const [open, setOpen] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const closeOnDesktop = () => { if (!query.matches) setOpen(false) }
    query.addEventListener('change', closeOnDesktop)
    return () => query.removeEventListener('change', closeOnDesktop)
  }, [])
  const activeIndex = selected < images.length ? selected : 0
  const active = images[activeIndex]
  const step = (direction: number) => setSelected(Math.max(0, Math.min(images.length - 1, activeIndex + direction)))
  const navigation = (location: string) => images.length > 1 && <div className="recipe-photo-navigation" role="group" aria-label={ko ? `${location} 사진 전환` : `${location} photo navigation`}>
    <Button type="button" variant="ghost" size="icon" disabled={activeIndex === 0} aria-label={ko ? '이전 사진' : 'Previous photo'} onClick={() => step(-1)}><ChevronLeft aria-hidden="true" /></Button>
    <span aria-live="polite" aria-atomic="true">{activeIndex + 1} / {images.length}</span>
    <Button type="button" variant="ghost" size="icon" disabled={activeIndex === images.length - 1} aria-label={ko ? '다음 사진' : 'Next photo'} onClick={() => step(1)}><ChevronRight aria-hidden="true" /></Button>
  </div>
  return <div className="detail-gallery" onTouchStart={event => {
    swiped.current = false
    if ((event.target as HTMLElement).closest('.shoppable-tag, .shoppable-popover, .related-image-products, .recipe-photo-navigation')) { touchStart.current = null; return }
    touchStart.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null
  }} onTouchCancel={() => { touchStart.current = null }} onTouchEnd={event => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || !event.changedTouches[0]) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; step(dx < 0 ? 1 : -1) }
  }} onClickCapture={event => { if (swiped.current) { swiped.current = false; event.preventDefault(); event.stopPropagation() } }}>
    <div className="detail-image-frame detail-gallery-desktop">{galleryImages[activeIndex] ? <ShoppableImage key={galleryImages[activeIndex].id} image={galleryImages[activeIndex]} tags={recipe.productTags ?? []} alt={name} ko={ko} square /> : <FoodImage src={active} alt={name} className="detail-image" />}</div>
    <ImageDialog.Root open={open} onOpenChange={setOpen}>
      <div className="detail-image-frame detail-gallery-mobile">{galleryImages[activeIndex] ? <ShoppableImage key={galleryImages[activeIndex].id} image={galleryImages[activeIndex]} tags={recipe.productTags ?? []} alt={name} ko={ko} square onImageClick={() => setOpen(true)} /> : <FoodImage src={active} alt={name} className="detail-image" />}</div>
      <ImageDialog.Portal>
        <ImageDialog.Backdrop className="detail-lightbox-backdrop" />
        <ImageDialog.Popup className="detail-lightbox" onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1) }
        }}>
          <div className="detail-lightbox-topbar"><ImageDialog.Title className="detail-lightbox-title">{name}</ImageDialog.Title><ImageDialog.Close className="detail-lightbox-close" aria-label={ko ? '이미지 닫기' : 'Close image'}><X size={24} aria-hidden="true" /></ImageDialog.Close></div>
          <ImageDialog.Description className="sr-only">{ko ? '이미지를 좌우로 밀거나 사진 전환 버튼을 눌러 다른 이미지를 볼 수 있습니다.' : 'Swipe left or right, or use the photo navigation buttons to view another image.'}</ImageDialog.Description>
          <div className="detail-lightbox-image">{galleryImages[activeIndex] && <ShoppableImage key={galleryImages[activeIndex].id} image={galleryImages[activeIndex]} tags={recipe.productTags ?? []} alt={name} ko={ko} />}</div>
          <div className="detail-lightbox-footer">{navigation(ko ? '확대' : 'Enlarged')}</div>
        </ImageDialog.Popup>
      </ImageDialog.Portal>
    </ImageDialog.Root>
    {navigation(ko ? '메인' : 'Main')}
    {galleryImages[activeIndex] && <RelatedImageProducts key={galleryImages[activeIndex].id} imageId={galleryImages[activeIndex].id} tags={recipe.productTags ?? []} ko={ko} description={recipe.photoProductDescription} purchaseUrl={recipe.photoProductUrl} />}
  </div>
}

function RecipeNutrition({ recipe }: { recipe: Recipe }) {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()
  const ko = language === 'ko'
  const name = ko ? recipe.nameKo : recipe.name
  const [rows, setRows] = useState<RecipeRowState[]>(() => initialRows(recipe))
  const [tableMode, setTableMode] = useState<'storage' | 'cooking' | 'meal'>('storage')
  const [divisions, setDivisions] = useState(Math.max(1, recipe.divisionCount ?? 4))
  const [divisionsInput, setDivisionsInput] = useState(() => String(divisions))
  const [sides, setSides] = useState<RecipeRowState[]>(() => (recipe.sideItems ?? []).map(item => ({ ingredientId: item.ingredientId, amount: item.defaultAmount, unit: item.defaultUnit })))
  const [memo] = useState(() => { try { return localStorage.getItem(`recipe-note:${recipe.id}`) ?? recipe.memo ?? '' } catch { return recipe.memo ?? '' } })
  const macros = rows.map(macrosFor)
  const storageGroups = (['냉장실', '냉동실', '실온보관', ''] as const).map(location => ({
    location,
    entries: rows.map((row, index) => ({ row, index })).filter(({ row }) => {
      const stored = getIngredientById(row.ingredientId)?.storageLocation
      const assigned = stored && ['냉장실', '냉동실', '실온보관'].includes(stored) ? stored : ''
      return assigned === location
    }),
  })).filter(group => group.entries.length > 0)
  const storageLabels = { 냉장실: 'Fridge', 냉동실: 'Freezer', 실온보관: 'Room temperature', '': 'Unspecified' }
  const storageIcons = { 냉장실: '🗄️', 냉동실: '❄️', 실온보관: '🧂', '': '❓' }
  const tableGroups = tableMode === 'storage'
    ? storageGroups.map(({ location, entries }) => ({ key: location, title: ko ? location || '미지정' : storageLabels[location], icon: storageIcons[location], entries }))
    : recipeCookingGroups(rows, recipe.items, recipe.cookingGroupOrder).map(({ name, entries }) => ({ key: name, title: name || (ko ? '기본 재료' : 'Basic ingredients'), icon: '', entries }))
  const platingBlocks = (recipe.platingBlocks ?? [
    ...(recipe.mealImages ?? []).map((value, index) => ({ id: 'legacy-image-' + index, type: 'image' as const, value })),
    { id: 'legacy-text', type: 'text' as const, value: recipe.mealContent ?? '' },
  ]).filter(block => block.value.trim())
  const total = sum(macros)
  const portion = { carbs: total.carbs / divisions, protein: total.protein / divisions, fat: total.fat / divisions }
  const meal = sum([portion, ...sides.map(macrosFor)])
  const label = (ingredient: Ingredient | undefined, fallback: string) => ingredient ? (ko ? ingredient.nameKo ?? ingredient.name : ingredient.name) : fallback
  function ingredientNameCell(row: RecipeRowState) {
    const ingredient = ingredientFor(row.ingredientId)
    const displayName = label(ingredient, row.ingredientId)
    return isAdmin && ingredient
      ? <a className="detail-ingredient-edit-link" href={`${import.meta.env.BASE_URL}ingredient/${ingredient.id}/edit`} target="_blank" rel="noopener noreferrer">{displayName}</a>
      : displayName
  }
  function updateRow(index: number, field: 'amount' | 'unit', value: string, side = false) {
    const update = side ? setSides : setRows
    update(current => current.map((row, i) => {
      if (i !== index) return row
      if (field === 'amount') return { ...row, amount: amount(value) }
      const ingredient = ingredientFor(row.ingredientId)
      const converted = ingredient ? convertUnit(row.amount, row.unit, value, ingredient.conversions) : row.amount
      return { ...row, unit: value, amount: Number.isFinite(converted) ? Math.round(converted * 10000) / 10000 : row.amount }
    }))
  }
  function quantityCells(row: RecipeRowState, index: number, side = false) {
    const ingredient = ingredientFor(row.ingredientId)
    return <QuantityUnitCells ingredientId={row.ingredientId} amount={row.amount} unit={row.unit} units={ingredient?.allowedUnits ?? []} label={label(ingredient, row.ingredientId)} amountLabel={side ? (ko ? '주식 양' : 'Staple amount') : undefined} onAmountChange={value => updateRow(index, 'amount', value, side)} onUnitChange={value => updateRow(index, 'unit', value, side)} />
  }

  return <article className="nutrition-detail reference-container recipe-body-container" lang={language}>
    <div className="detail-layout">
      <header className="detail-heading">
        <RecipeImageGallery recipe={recipe} name={name} ko={ko} />
        {isAdmin && <Button type="button" variant="ghost" size="content" className="catalog-intro__subtle-action detail-edit-button" onClick={() => navigate(`/recipe/${recipe.id}/edit`)}>{ko ? '수정' : 'Edit'}</Button>}
      </header>
      <div className="detail-tables">
      <div className="detail-title-tags">
        <div className="detail-title-tags-row">
        <h1 className="recipe-detail-title">{name}</h1>
        {recipe.link?.trim() && <a className="detail-source" href={recipe.link} target="_blank" rel="noopener noreferrer" aria-label={ko ? '원본 레시피 보기' : 'View original recipe'} title={ko ? '원본 레시피 보기' : 'View original recipe'}>
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false">
            <path d="M0 0h1024v1024H0z" fill="none" />
            <path fill="currentColor" d="M574 665.4a8.03 8.03 0 0 0-11.3 0L446.5 781.6c-53.8 53.8-144.6 59.5-204 0c-59.5-59.5-53.8-150.2 0-204l116.2-116.2c3.1-3.1 3.1-8.2 0-11.3l-39.8-39.8a8.03 8.03 0 0 0-11.3 0L191.4 526.5c-84.6 84.6-84.6 221.5 0 306s221.5 84.6 306 0l116.2-116.2c3.1-3.1 3.1-8.2 0-11.3zm258.6-474c-84.6-84.6-221.5-84.6-306 0L410.3 307.6a8.03 8.03 0 0 0 0 11.3l39.7 39.7c3.1 3.1 8.2 3.1 11.3 0l116.2-116.2c53.8-53.8 144.6-59.5 204 0c59.5 59.5 53.8 150.2 0 204L665.3 562.6a8.03 8.03 0 0 0 0 11.3l39.8 39.8c3.1 3.1 8.2 3.1 11.3 0l116.2-116.2c84.5-84.6 84.5-221.5 0-306.1M610.1 372.3a8.03 8.03 0 0 0-11.3 0L372.3 598.7a8.03 8.03 0 0 0 0 11.3l39.6 39.6c3.1 3.1 8.2 3.1 11.3 0l226.4-226.4c3.1-3.1 3.1-8.2 0-11.3z" />
          </svg>
        </a>}
        <div className="catalog-card-categories detail-image-tags" role="group" aria-label={ko ? '레시피 분류' : 'Recipe categories'}>
          {getRecipeCategories(recipe).map(category => <span key={category} className="catalog-category">{ko ? category : categoryEnglish[category]}</span>)}
        </div>
        </div>
        <StarRating label={ko ? '맛' : 'Taste'} value={recipe.tasteRating ?? 4} showLabel={false} />
      </div>
      <section className="detail-section" aria-labelledby="whole-recipe-title"><h2 id="whole-recipe-title" className="sr-only">{ko ? '전체 재료' : 'All ingredients'}</h2>
      <div className="detail-table-tabs" role="tablist" aria-label={ko ? '재료 보기 모드' : 'Ingredient view mode'}>
        {(['storage', 'cooking', 'meal'] as const).map((mode, index) => <button key={mode} type="button" role="tab" id={`ingredient-tab-${mode}`} aria-controls="ingredient-mode-panel" aria-selected={tableMode === mode} tabIndex={tableMode === mode ? 0 : -1} onClick={() => setTableMode(mode)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const modes = ['storage', 'cooking', 'meal'] as const
          const next = event.key === 'Home' ? 'storage' : event.key === 'End' ? 'meal' : modes[(index + (event.key === 'ArrowRight' ? 1 : modes.length - 1)) % modes.length]
          setTableMode(next)
          document.getElementById(`ingredient-tab-${next}`)?.focus()
        }}>{mode === 'storage' ? (ko ? '재료 꺼낼 때' : 'Gather ingredients') : mode === 'cooking' ? (ko ? '요리할 때' : 'Cook') : (ko ? '플레이팅' : 'Plating')}</button>)}
      </div>
      <div role="tabpanel" id="ingredient-mode-panel" aria-labelledby={`ingredient-tab-${tableMode}`}>
      {tableMode === 'meal' ? (
        <article className="meal-blog" aria-label={ko ? '플레이팅' : 'Plating'}>
          {platingBlocks.length ? <div className="plating-block-content">{platingBlocks.map((block, index) => block.type === 'text'
            ? <div key={block.id} className="meal-blog__prose"><p>{block.value}</p></div>
            : <div key={block.id} className="meal-blog__images"><figure><img src={block.value} alt={ko ? `플레이팅 사진 ${index + 1}` : `Plating photo ${index + 1}`} loading="lazy" /></figure></div>)}</div>
            : <p className="meal-blog__empty">{ko ? '작성한 내용 없음' : 'No content yet'}</p>}
        </article>
      ) : <NutritionTable total={total} labelledBy="whole-recipe-title">{tableGroups.flatMap(({ key, title, icon, entries }) => [
        <tr key={`${tableMode}-${key}`} className="detail-storage-group"><th colSpan={6}>{icon && <span className="detail-storage-icon" aria-hidden="true">{icon}</span>}{title}</th></tr>,
        ...entries.map(({ row, index }, groupIndex) => <tr key={`${row.ingredientId}-${index}`} className={groupIndex % 2 === 0 ? 'table-row--white' : 'table-row--alternate'}><td>{ingredientNameCell(row)}</td>{quantityCells(row, index)}<MacroCells values={macros[index]} /></tr>),
      ])}</NutritionTable>}
      </div>
      {(tableMode === 'storage' || tableMode === 'cooking') && <TableNutritionSummary total={total} />}
      </section>
      {(tableMode === 'storage' || tableMode === 'cooking') && <section className="detail-section" aria-labelledby="meal-title">
      <div className="detail-section-heading">
        <h2 id="meal-title"><label htmlFor="meal-divisions">{ko ? '몇 등분할까요?' : 'How many portions?'}</label></h2>
        <div className="detail-divisions"><Input density="quantity" id="meal-divisions" type="number" min="1" step="1" value={divisionsInput} onChange={event => {
          const value = event.target.value
          setDivisionsInput(value)
          const parsed = Number(value)
          if (Number.isFinite(parsed) && parsed >= 1) setDivisions(Math.floor(parsed))
        }} onBlur={() => setDivisionsInput(String(divisions))} /><span>{ko ? '등분' : 'portions'}</span></div>
      </div>
      <NutritionTable total={meal} labelledBy="meal-title">
        <tr><td>{ko ? '전체 재료 합계' : 'All ingredients total'}</td><td className="numeric">1/{divisions}</td><td className="muted">{ko ? '분량' : 'batch'}</td><MacroCells values={portion} /></tr>
        {sides.map((row, index) => {
          return <tr key={index}><td>{ingredientNameCell(row)}</td>{quantityCells(row, index, true)}<MacroCells values={macrosFor(row)} /></tr>
        })}
      </NutritionTable>
      <TableNutritionSummary total={meal} showRatio />
      {tableMode === 'cooking' && recipe.cookingContent?.trim() && <section className="detail-notes"><h2>{ko ? '메모' : 'Notes'}</h2><div className="meal-blog__prose"><p>{recipe.cookingContent}</p></div></section>}
      {tableMode === 'storage' && memo.trim() && <section className="detail-notes"><h2>{ko ? '메모' : 'Notes'}</h2><p>{memo}</p></section>}
      </section>}
      </div>
    </div>
  </article>
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const [recipes, setRecipes] = useState<Recipe[]>(staticRecipes)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(false)
    async function load() {
      try {
        if (import.meta.env.DEV && id === '__shoppable-demo__') {
          const { demoRecipe } = await import('../dev/shoppableDemo')
          if (!cancelled) setRecipes([demoRecipe])
          return
        }
        await loadIngredientsFromFirestore()
        const docs = await loadRecipesFromFirestore()
        if (!cancelled) setRecipes(mergeStaticAndFirestoreRecipes(staticRecipes, docs))
      } catch { if (!cancelled) setError(true) }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [attempt, id])
  const recipe = recipes.find(value => value.id === id && (isAdmin || !value.hidden))
  if (loading) return <LoadingState label={language === 'ko' ? '불러오는 중...' : 'Loading...'} />
  if (!recipe) return <ContentState variant="detail" error={error} title={language === 'ko' ? (error ? '레시피를 불러오지 못했습니다.' : '레시피를 찾을 수 없습니다.') : 'Recipe unavailable.'}>{error && <Button variant="ghost" size="content" onClick={() => setAttempt(value => value + 1)}>{language === 'ko' ? '다시 시도' : 'Retry'}</Button>}<BackLink /></ContentState>
  return <RecipeNutrition key={recipe.id} recipe={recipe} />
}
