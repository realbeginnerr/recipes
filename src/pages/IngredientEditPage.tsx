import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { FoodImage } from '../components/FoodImage'
import { LoadingState } from '../components/feedback/ContentState'
import { UnitSelect } from '../components/UnitSelect'
import { useLanguage } from '../context/LanguageContext'
import { ingredientPresentation } from '../data/ingredientPresentation'
import { recipes as staticRecipes } from '../data/recipe'
import {
  deleteIngredientFromFirestore,
  getIngredientById,
  loadIngredientsFromFirestore,
  updateIngredientInFirestore,
  type FirestoreIngredient,
} from '../services/ingredientService'
import { convertToRecipe, loadRecipesFromFirestore } from '../services/recipeService'

type IngredientDraft = Omit<FirestoreIngredient, 'id'>
type NumericField = 'baseAmount' | 'carbs' | 'protein' | 'fat'
type ConversionField = 'gramsPerTbsp' | 'gramsPerTsp' | 'gramsPerCup' | 'gramsPerEach' | 'gramsPerCan' | 'gramsPerPack'

const UNIT_OPTIONS = ['g', 'ml', 'oz', 'lbs', 'T', 't', '컵', '개', '캔', '팩', '꼬집']
const CONVERSION_FIELDS: { key: ConversionField; labelKo: string; labelEn: string }[] = [
  { key: 'gramsPerTbsp', labelKo: 'T', labelEn: 'tbsp' },
  { key: 'gramsPerTsp', labelKo: 't', labelEn: 'tsp' },
  { key: 'gramsPerCup', labelKo: '컵', labelEn: 'cup' },
  { key: 'gramsPerEach', labelKo: '개', labelEn: 'each' },
  { key: 'gramsPerCan', labelKo: '캔', labelEn: 'can' },
  { key: 'gramsPerPack', labelKo: '팩', labelEn: 'pack' },
]

function initialDraft(ingredient: FirestoreIngredient): IngredientDraft {
  return {
    name: ingredient.name,
    nameKo: ingredient.nameKo,
    baseAmount: ingredient.baseAmount,
    baseUnit: ingredient.baseUnit,
    carbs: ingredient.carbs,
    protein: ingredient.protein,
    fat: ingredient.fat,
    ...(ingredient.addedSugar !== undefined ? { addedSugar: ingredient.addedSugar } : {}),
    ...(ingredient.isRefinedCarb !== undefined ? { isRefinedCarb: ingredient.isRefinedCarb } : {}),
    ...(ingredient.imageUrl !== undefined ? { imageUrl: ingredient.imageUrl } : {}),
    ...(ingredient.legacyIds !== undefined ? { legacyIds: ingredient.legacyIds } : {}),
    ...(ingredient.retired !== undefined ? { retired: ingredient.retired } : {}),
    ...(ingredient.category !== undefined ? { category: ingredient.category } : {}),
    ...(ingredient.createdAt !== undefined ? { createdAt: ingredient.createdAt } : {}),
    ...(ingredient.gramsPerTbsp !== undefined ? { gramsPerTbsp: ingredient.gramsPerTbsp } : {}),
    ...(ingredient.gramsPerTsp !== undefined ? { gramsPerTsp: ingredient.gramsPerTsp } : {}),
    ...(ingredient.gramsPerCup !== undefined ? { gramsPerCup: ingredient.gramsPerCup } : {}),
    ...(ingredient.gramsPerEach !== undefined ? { gramsPerEach: ingredient.gramsPerEach } : {}),
    ...(ingredient.gramsPerCan !== undefined ? { gramsPerCan: ingredient.gramsPerCan } : {}),
    ...(ingredient.gramsPerPack !== undefined ? { gramsPerPack: ingredient.gramsPerPack } : {}),
  }
}

export function IngredientEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isKo = language === 'ko'
  const [draft, setDraft] = useState<IngredientDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conversionGrams, setConversionGrams] = useState('100')
  const [conversionAmounts, setConversionAmounts] = useState<Partial<Record<ConversionField, string>>>({})

  useEffect(() => {
    let cancelled = false
    loadIngredientsFromFirestore()
      .then(() => {
        const ingredient = id ? getIngredientById(id) : undefined
        if (!cancelled && ingredient) {
          setDraft(initialDraft(ingredient))
          const grams = ingredient.conversionGrams ?? (ingredient.baseUnit === 'g' ? ingredient.baseAmount : 100)
          setConversionGrams(String(grams))
          setConversionAmounts(Object.fromEntries(CONVERSION_FIELDS.map(({ key }) => [key,
            ingredient[key] && ingredient[key] > 0 ? String(Number((grams / ingredient[key]!).toPrecision(12))) : '',
          ])))
        }
        if (!cancelled && !ingredient) setError(isKo ? '식재료를 찾을 수 없습니다.' : 'Ingredient not found.')
      })
      .catch(() => {
        if (!cancelled) setError(isKo ? '식재료 정보를 불러오지 못했습니다.' : 'Unable to load ingredient data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, isKo])

  function updateText(field: 'name' | 'nameKo' | 'imageUrl', value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current)
  }

  function updateNumber(field: NumericField, value: string) {
    const amount = value === '' ? 0 : Number(value)
    setDraft((current) => current ? { ...current, [field]: Number.isFinite(amount) ? amount : 0 } : current)
  }

  function updateConversion(field: ConversionField, value: string) {
    setConversionAmounts(current => ({ ...current, [field]: value }))
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || !draft || saving) return
    if (!draft.name.trim() || !draft.nameKo.trim()) {
      setError(isKo ? '한글 이름과 영문 이름을 입력해주세요.' : 'Enter both Korean and English names.')
      return
    }
    if (draft.baseAmount <= 0 || [draft.carbs, draft.protein, draft.fat].some((value) => !Number.isFinite(value) || value < 0)) {
      setError(isKo ? '기준량은 0보다 커야 하고 탄단지는 0 이상이어야 합니다.' : 'Base amount must be above zero and macros cannot be negative.')
      return
    }
    if (draft.imageUrl?.trim()) {
      try {
        new URL(draft.imageUrl.trim(), window.location.origin)
      } catch {
        setError(isKo ? '올바른 사진 URL을 입력해주세요.' : 'Enter a valid image URL.')
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const grams = Number(conversionGrams)
      if (!Number.isFinite(grams) || grams <= 0 || Object.values(conversionAmounts).some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0))) {
        setError(isKo ? '단위 환산 값은 0보다 커야 합니다.' : 'Conversion values must be above zero.')
        return
      }
      const conversions = Object.fromEntries(CONVERSION_FIELDS.map(({ key }) => [key,
        conversionAmounts[key] ? grams / Number(conversionAmounts[key]) : undefined,
      ]))
      await updateIngredientInFirestore(id, {
        ...draft,
        ...conversions,
        conversionGrams: grams,
        name: draft.name.trim(),
        nameKo: draft.nameKo.trim(),
        ...(draft.imageUrl !== undefined ? { imageUrl: draft.imageUrl.trim() } : {}),
      })
      navigate('/ingredients', { replace: true })
    } catch (saveError) {
      const code = typeof saveError === 'object' && saveError !== null && 'code' in saveError
        ? String(saveError.code)
        : ''
      setError(code === 'permission-denied'
        ? (isKo ? '저장 권한이 없습니다. 관리자 로그인과 Firestore 규칙을 확인해주세요.' : 'Write permission denied. Check admin sign-in and Firestore rules.')
        : (isKo ? `저장하지 못했습니다${code ? ` (${code})` : ''}. 다시 시도해주세요.` : `Unable to save${code ? ` (${code})` : ''}. Please try again.`))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !draft || saving) return
    setSaving(true)
    setError('')
    try {
      const firestoreRecipes = await loadRecipesFromFirestore()
      const usedRecipes = [...staticRecipes, ...firestoreRecipes.map(convertToRecipe)]
        .filter((recipe) => recipe.items.some((item) => item.ingredientId === id) || (recipe.sideItems ?? []).some((item) => item.ingredientId === id))
      const uniqueRecipes = [...new Map(usedRecipes.map((recipe) => [recipe.id, recipe])).values()]
      const usage = uniqueRecipes.length
        ? `\n\n${isKo ? '사용 중인 레시피' : 'Recipes using this ingredient'}: ${uniqueRecipes.map((recipe) => isKo ? recipe.nameKo || recipe.name : recipe.name).join(', ')}\n${isKo ? '삭제하면 이 레시피의 영양 계산에서 재료가 빠집니다.' : 'Deleting it removes this ingredient from those nutrition calculations.'}`
        : ''
      const confirmed = window.confirm(`${isKo ? `'${draft.nameKo}' 식재료를 삭제할까요?` : `Delete '${draft.name}'?`}${usage}\n\n${isKo ? '이 작업은 되돌릴 수 없습니다.' : 'This action cannot be undone.'}`)
      if (!confirmed) return
      await deleteIngredientFromFirestore(id)
      navigate('/ingredients', { replace: true })
    } catch (deleteError) {
      const code = typeof deleteError === 'object' && deleteError !== null && 'code' in deleteError
        ? String(deleteError.code)
        : ''
      setError(code === 'permission-denied'
        ? (isKo ? '삭제 권한이 없습니다. 관리자 로그인과 Firestore 규칙을 확인해주세요.' : 'Delete permission denied. Check admin sign-in and Firestore rules.')
        : (isKo ? `삭제하지 못했습니다${code ? ` (${code})` : ''}. 다시 시도해주세요.` : `Unable to delete${code ? ` (${code})` : ''}. Please try again.`))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label={isKo ? '식재료 불러오는 중...' : 'Loading ingredient...'} />
  if (!draft) return <section className="page"><p role="alert">{error || (isKo ? '식재료를 찾을 수 없습니다.' : 'Ingredient not found.')}</p><Button type="button" variant="outline" onClick={() => navigate('/ingredients')}>{isKo ? '식재료 목록으로' : 'Back to ingredients'}</Button></section>

  const reference = ingredientPresentation[draft.nameKo] ?? Object.entries(ingredientPresentation).find(([key]) => draft.nameKo.includes(key))?.[1]
  const previewImage = draft.imageUrl === undefined ? reference?.image : draft.imageUrl || undefined

  return <section className="page" style={{ maxWidth: 760, margin: '0 auto', paddingBottom: 64 }}>
    <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/ingredients')}>← {isKo ? '식재료 목록' : 'Ingredients'}</Button>
    <h1 className="page__heading" style={{ marginTop: 20 }}>{isKo ? '식재료 수정' : 'Edit ingredient'}</h1>
    <form className="flex flex-col gap-6" onSubmit={handleSave}>
      <div className="flex flex-col gap-2">
        <label htmlFor="ingredient-name-ko" className="text-sm font-medium">{isKo ? '한글 이름' : 'Korean name'}</label>
        <Input id="ingredient-name-ko" value={draft.nameKo} onChange={(event) => updateText('nameKo', event.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="ingredient-name-en" className="text-sm font-medium">{isKo ? '영문 이름' : 'English name'}</label>
        <Input id="ingredient-name-en" value={draft.name} onChange={(event) => updateText('name', event.target.value)} required />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="ingredient-base-amount" className="text-sm font-medium">{isKo ? '기준량' : 'Base amount'}</label>
          <Input id="ingredient-base-amount" type="number" min="0.01" step="any" value={draft.baseAmount} onChange={(event) => updateNumber('baseAmount', event.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ingredient-base-unit" className="text-sm font-medium">{isKo ? '기준 단위' : 'Base unit'}</label>
          <UnitSelect value={draft.baseUnit} onValueChange={(value) => setDraft((current) => current ? { ...current, baseUnit: value } : current)} language={language} options={UNIT_OPTIONS} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">{isKo ? `탄단지 (기준 ${draft.baseAmount}${draft.baseUnit})` : `Macros (per ${draft.baseAmount} ${draft.baseUnit})`}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {([
            ['carbs', isKo ? '탄수화물 (g)' : 'Carbs (g)'],
            ['protein', isKo ? '단백질 (g)' : 'Protein (g)'],
            ['fat', isKo ? '지방 (g)' : 'Fat (g)'],
          ] as const).map(([field, label]) => <div key={field} className="flex flex-col gap-2">
            <label htmlFor={`ingredient-${field}`} className="text-sm font-medium">{label}</label>
            <Input id={`ingredient-${field}`} type="number" min="0" step="any" value={draft[field]} onChange={(event) => updateNumber(field, event.target.value)} />
          </div>)}
        </div>
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="text-sm font-semibold">{isKo ? '단위 환산 (선택)' : 'Unit conversions (optional)'}</legend>
        <div className="ingredient-conversion-table min-w-0 border">
          <Table className="min-w-[700px] table-fixed" aria-label={isKo ? '단위 환산 (선택)' : 'Unit conversions (optional)'}>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead scope="col"><label htmlFor="ingredient-conversion-grams">g</label></TableHead>
                {CONVERSION_FIELDS.map(({ key, labelKo, labelEn }) => <TableHead key={key} scope="col">
                  <label htmlFor={`ingredient-${key}`}>{isKo ? labelKo : labelEn}</label>
                </TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><Input id="ingredient-conversion-grams" type="number" min="0" step="any" required value={conversionGrams} onChange={event => setConversionGrams(event.target.value)} /></TableCell>
                {CONVERSION_FIELDS.map(({ key }) => <TableCell key={key}>
                  <Input id={`ingredient-${key}`} type="number" min="0" step="any" value={conversionAmounts[key] ?? ''} onChange={(event) => updateConversion(key, event.target.value)} />
                </TableCell>)}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground">{isKo ? '각 열은 같은 양입니다. 예: g = 100, 컵 = 1이면 1컵은 100g입니다.' : 'Each column represents the same amount. For example, g = 100 and cup = 1 means 1 cup weighs 100g.'}</p>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">{isKo ? '식재료 사진' : 'Ingredient photo'}</legend>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="ingredient-image-url" className="text-sm font-medium">{isKo ? '사진 URL' : 'Photo URL'}</label>
            <Input id="ingredient-image-url" type="url" value={draft.imageUrl ?? ''} onChange={(event) => updateText('imageUrl', event.target.value)} placeholder="https://..." />
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => updateText('imageUrl', '')} disabled={!draft.imageUrl && !reference?.image}>
              {isKo ? '사진 삭제' : 'Remove photo'}
            </Button>
          </div>
          <div className="aspect-4/3 overflow-hidden rounded-md border bg-muted">
            <FoodImage src={previewImage} alt={draft.nameKo || draft.name} className="h-full w-full object-cover" />
          </div>
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>{isKo ? '식재료 삭제' : 'Delete ingredient'}</Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/ingredients')} disabled={saving}>{isKo ? '취소' : 'Cancel'}</Button>
          <Button type="submit" disabled={saving}>{saving ? (isKo ? '저장 중...' : 'Saving...') : (isKo ? '저장' : 'Save')}</Button>
        </div>
      </div>
    </form>
  </section>
}
