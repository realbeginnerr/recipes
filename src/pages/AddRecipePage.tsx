import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RecipeTable } from '../components/RecipeTable'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { Button } from '../components/ui/button'
import { useLanguage } from '../context/LanguageContext'
import { loadIngredientsFromFirestore } from '../services/ingredientService'
import { saveRecipeToFirestore } from '../services/recipeService'
import { trackAddRecipeCompleted } from '../utils/analytics'
import type { Recipe } from '../types'
import './RecipeDetailPage.css'

export function AddRecipePage() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [recipe] = useState<Recipe>(() => ({
    id: crypto.randomUUID(), name: '', nameKo: '', imageUrl: '', imageUrls: [],
    items: [], sideItems: [], memo: '', divisionCount: 4,
    categories: searchParams.get('category') === 'blending-tea' ? ['차'] : [],
  }))
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [divisionCount, setDivisionCount] = useState(4)
  const [riceAmount, setRiceAmount] = useState(130)
  const [riceUnit, setRiceUnit] = useState('g')
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    loadIngredientsFromFirestore()
      .catch(() => { if (!cancelled) setFailed(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])

  async function save(updated: Recipe) {
    const { id: _id, createdAt: _createdAt, items, sideItems, ...fields } = updated
    const toStoredItem = (item: Recipe['items'][number]) => ({
      ingredientId: item.ingredientId, amount: item.defaultAmount, unit: item.defaultUnit,
      ...(item.cookingGroup?.trim() ? { cookingGroup: item.cookingGroup.trim() } : {}),
    })
    const id = await saveRecipeToFirestore({
      ...fields, memo: updated.memo ?? '', tasteRating: updated.tasteRating ?? 4,
      items: items.map(toStoredItem), sideItems: (sideItems ?? []).map(toStoredItem),
    })
    trackAddRecipeCompleted('manual', updated.nameKo)
    navigate(`/recipe/${encodeURIComponent(id)}`, { replace: true })
  }

  return <section className="page recipe-body-container" lang={language}>
    {loading ? <LoadingState label={language === 'ko' ? '식재료 불러오는 중...' : 'Loading ingredients...'} />
      : failed ? <ContentState error title={language === 'ko' ? '식재료를 불러오지 못했습니다.' : 'Could not load ingredients.'}>
        <Button onClick={() => setAttempt(n => n + 1)}>{language === 'ko' ? '다시 시도' : 'Try again'}</Button>
      </ContentState>
      : <RecipeTable defaultEditing creating recipe={recipe} rows={[]} appliedSearch=""
        divisionCount={divisionCount} onDivisionCountChange={setDivisionCount}
        onAmountChange={() => {}} onUnitChange={() => {}}
        multigrainRiceAmount={riceAmount} onMultigrainRiceAmountChange={setRiceAmount}
        multigrainRiceUnit={riceUnit} onMultigrainRiceUnitChange={setRiceUnit}
        onSaveRecipe={save} />}
  </section>
}
