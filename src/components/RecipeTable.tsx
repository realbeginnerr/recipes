import { IngredientOrderControls, moveIngredient } from './IngredientOrderControls'
import { CookingStepsEditor } from './CookingSteps'
import { recipeCookingSteps } from '../utils/cookingSteps'
import { safeProductUrl } from './recipe/ShoppableImage'
import { shopFeatures } from '../constants/shopFeatures'
import { ProductTagEditor } from './recipe/ProductTagEditor'
import { reconcileRecipeGallery } from '../utils/recipeGallery'
import type { RecipeProductTag } from '../types/shoppable'
import { CookingGroupOrderEditor } from './CookingGroupOrderEditor'
import { cookingGroupOrder } from '../utils/recipeCookingGroups'
import { MEAL_TARGET as recommended, MEAL_TARGET_KCAL } from '../constants/nutrition'
import { RecipeImagesEditor, recipeImageDrafts, type ImageDraft } from './RecipeImagesEditor'
import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { useAddPageAccess } from './AddPageAccessProvider'
import { storage } from '../firebase'
import { ingredientById } from '../data/ingredientCache'
import { IngredientSearchModal } from './IngredientSearchModal'
import { Modal } from './Modal'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { Recipe, RecipeItem, RecipeRowState } from '../types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UnitSelect } from './UnitSelect'
import {
  amountToGrams,
  calculateMacros,
  formatAmount,
  formatMacro,
} from '../utils/nutrition'
import { isRefinedCarb, isAddedSugarIngredient } from '../data/refinedCarbs'
import { getIngredientDisplayName, getRecipeDisplayName } from '../utils/displayNames'
import { ingredientMatchesSearch } from '../utils/search'
import { getRecipeBadge } from '../utils/recipeBadge'
import { RecipeBadge, MacroBadge } from './recipe/RecipeBadge'
import { StarRating } from './recipe/StarRating'
import { formatTableNumber } from '../utils/numberFormatting'
import { Toast, useToast } from './feedback/Toast'
import { recipeCategories, categoryEnglish, getRecipeCategories, type RecipeCategory } from '../utils/recipeCategory'
import { recipes as staticRecipes } from '../data/recipe'
import { loadRecipesFromFirestore, mergeStaticAndFirestoreRecipes } from '../services/recipeService'

type RecipeTableProps = {
  defaultEditing?: boolean
  recipe: Recipe
  rows: RecipeRowState[]
  appliedSearch: string
  divisionCount: number
  onDivisionCountChange: (value: number) => void
  onAmountChange: (ingredientId: string, raw: string) => void
  onUnitChange: (ingredientId: string, newUnit: string) => void
  multigrainRiceAmount: number
  onMultigrainRiceAmountChange: (value: number) => void
  multigrainRiceUnit: string
  onMultigrainRiceUnitChange: (value: string) => void
  onSaveRecipe: (updated: Recipe) => void | Promise<void>
  onDeleteRecipe?: (id: string) => void
}


export function RecipeTable({
  defaultEditing = false,
  recipe,
  rows,
  appliedSearch,
  divisionCount,
  onDivisionCountChange,
  onAmountChange,
  onUnitChange,
  multigrainRiceAmount,
  onMultigrainRiceAmountChange,
  multigrainRiceUnit,
  onMultigrainRiceUnitChange,
  onSaveRecipe,
  onDeleteRecipe,
}: RecipeTableProps) {
  const MULTIGRAIN_ID = '__multigrain_rice__'

  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const { isAdmin } = useAdmin()
  const { approvedPath } = useAddPageAccess()
  const canSave = isAdmin || approvedPath === `/recipe/${recipe.id}/edit`
  const [isSaving, setIsSaving] = useState(false)
  const { toast, showToast, closeToast } = useToast()
  const [localRecipe, setLocalRecipe] = useState(recipe)
  const activeRecipe = localRecipe
  const [isEditing, setIsEditing] = useState(defaultEditing)
  const [editImages, setEditImages] = useState<ImageDraft[]>(() => recipeImageDrafts(activeRecipe))
  const [editProductTags, setEditProductTags] = useState<RecipeProductTag[]>(activeRecipe.productTags ?? [])
  const [editPhotoProductDescription, setEditPhotoProductDescription] = useState(activeRecipe.photoProductDescription ?? '')
  const [editPhotoProductUrl, setEditPhotoProductUrl] = useState(activeRecipe.photoProductUrl ?? '')
  const [tagBusy, setTagBusy] = useState(false)
  const imageFile = editImages.some(image => image.file)
  const [editLink, setEditLink] = useState(activeRecipe.link ?? '')
  const [editItems, setEditItems] = useState<RecipeItem[]>(() => activeRecipe.items.map(item => {
    const row = defaultEditing ? rows.find(value => value.ingredientId === item.ingredientId) : undefined
    return row ? { ...item, defaultAmount: row.amount, defaultUnit: row.unit } : item
  }))
  const [editSideItems, setEditSideItems] = useState<RecipeItem[]>(activeRecipe.sideItems ?? [])
  const [editTab, setEditTab] = useState<'storage' | 'cooking' | 'meal'>('storage')
  const [editGroupOrder, setEditGroupOrder] = useState(activeRecipe.cookingGroupOrder ?? [])
  const [editCookingSteps, setEditCookingSteps] = useState(() => recipeCookingSteps(activeRecipe))
  const initialPlatingBlocks = () => activeRecipe.platingBlocks ?? [
    ...(activeRecipe.mealImages?.length ? activeRecipe.mealImages : ['']).map((value, index) => ({ id: "legacy-image-" + index, type: 'image' as const, value })),
    { id: 'legacy-text', type: 'text' as const, value: activeRecipe.mealContent ?? '' },
  ]
  const [editPlatingBlocks, setEditPlatingBlocks] = useState(initialPlatingBlocks)
  const [editMemo, setEditMemo] = useState(activeRecipe.memo ?? '')
  const [editCookingTime, setEditCookingTime] = useState(activeRecipe.cookingTimeMinutes === undefined ? '' : String(activeRecipe.cookingTimeMinutes))
  const [editLastCookedAt, setEditLastCookedAt] = useState(activeRecipe.lastCookedAt ?? '')
  const [editTasteRating, setEditTasteRating] = useState(activeRecipe.tasteRating ?? 4)
  const [editName, setEditName] = useState(activeRecipe.name)
  const [editNameKo, setEditNameKo] = useState(activeRecipe.nameKo)
  const [editCategories, setEditCategories] = useState<RecipeCategory[]>(() => getRecipeCategories(activeRecipe))
  const [isCollapsed, setIsCollapsed] = useState(defaultEditing ? false : recipe.hidden ?? false)
  const [divisionInput, setDivisionInput] = useState(String(activeRecipe.divisionCount ?? divisionCount))
  const parsedDivisionInput = Number.parseInt(divisionInput, 10)
  const effectiveDivision = !Number.isNaN(parsedDivisionInput) && parsedDivisionInput > 0 ? parsedDivisionInput : divisionCount
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddSideModalOpen, setIsAddSideModalOpen] = useState(false)
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null)
  const [replaceSide, setReplaceSide] = useState(false)
  const dragItemIndex = useRef<number | null>(null)
  const dragSideItemIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragOverSideIndex, setDragOverSideIndex] = useState<number | null>(null)
  const [isGuestSaveModalOpen, setIsGuestSaveModalOpen] = useState(false)
  const [isRecommendedInfoOpen, setIsRecommendedInfoOpen] = useState(false)
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set())
  const [unitErrorIds, setUnitErrorIds] = useState<Set<string>>(new Set())
  const [showRecipePicker, setShowRecipePicker] = useState(false)
  const [loadingRecipeList, setLoadingRecipeList] = useState(false)
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const [recipeSearch, setRecipeSearch] = useState('')
  function ingredientNameForId(ingredientId: string): string {
    const ingredient = ingredientById.get(ingredientId)
    if (ingredient) return getIngredientDisplayName(ingredient, language)
    const originalIndex = activeRecipe.items.findIndex(item => item.ingredientId === ingredientId)
    if (originalIndex >= 0) {
      const current = editItems[originalIndex]
      const currentIngredient = current ? ingredientById.get(current.ingredientId) : undefined
      if (currentIngredient) return getIngredientDisplayName(currentIngredient, language)
      const originalRow = rows[originalIndex]
      const originalIngredient = originalRow ? ingredientById.get(originalRow.ingredientId) : undefined
      if (originalIngredient) return getIngredientDisplayName(originalIngredient, language)
    }
    return language === 'ko' ? '알 수 없는 식재료' : 'Unknown ingredient'
  }
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({})
  function startEditing() {
    if (isEditing) return
    setEditImages(recipeImageDrafts(activeRecipe))
    setEditProductTags(activeRecipe.productTags ?? [])
    setEditPhotoProductDescription(activeRecipe.photoProductDescription ?? '')
    setEditPhotoProductUrl(activeRecipe.photoProductUrl ?? '')
    setEditLink(activeRecipe.link ?? '')
    setEditCategories(getRecipeCategories(activeRecipe))
    const regularItems = activeRecipe.items.map((item) => {
      const row = rows?.find((r) => r.ingredientId === item.ingredientId)
      return row ? { ...item, defaultAmount: row.amount, defaultUnit: row.unit } : item
    })
    setEditItems(regularItems)
    setEditSideItems(activeRecipe.sideItems ?? [])
    setEditGroupOrder(activeRecipe.cookingGroupOrder ?? [])
    setEditCookingSteps(recipeCookingSteps(activeRecipe))
    setEditPlatingBlocks(initialPlatingBlocks())
    setEditMemo(activeRecipe.memo ?? '')
    setEditCookingTime(activeRecipe.cookingTimeMinutes === undefined ? '' : String(activeRecipe.cookingTimeMinutes))
    setEditLastCookedAt(activeRecipe.lastCookedAt ?? '')
    setEditTasteRating(activeRecipe.tasteRating ?? 4)
    setDivisionInput(String(activeRecipe.divisionCount ?? divisionCount))
    setNewlyAddedIds(new Set())
    setIsEditing(true)
  }

  function handleCancel() {
    setDivisionInput(String(activeRecipe.divisionCount ?? divisionCount))
    setEditImages(recipeImageDrafts(activeRecipe))
    setEditProductTags(activeRecipe.productTags ?? [])
    setEditPhotoProductDescription(activeRecipe.photoProductDescription ?? '')
    setEditPhotoProductUrl(activeRecipe.photoProductUrl ?? '')
    setNewlyAddedIds(new Set())
    setIsEditing(false)
  }

  async function handleSave() {
    if (isSaving || tagBusy) return
    if (!shopFeatures.enabled && editPhotoProductUrl.trim() && !safeProductUrl(editPhotoProductUrl.trim())) {
      showToast(language === 'ko' ? '상품 구매 링크는 http 또는 https 주소로 입력해 주세요.' : 'Enter an http or https product purchase URL.', 'error')
      document.getElementById(`photo-product-url-${recipe.id}`)?.focus()
      return
    }
    const invalidItems = [...editItems, ...editSideItems].filter(item => !Number.isFinite(item.defaultAmount) || item.defaultAmount < 0)
    if (invalidItems.length) {
      const names = invalidItems.map(item => {
        const ingredient = ingredientById.get(item.ingredientId)
        return ingredient ? getIngredientDisplayName(ingredient, language) : item.ingredientId
      }).join(', ')
      showToast(language === 'ko'
        ? `${names}: 저장된 수량이 올바르지 않습니다. 해당 재료의 수량을 다시 입력해 주세요.`
        : `${names}: Invalid quantity. Please enter the quantity again.`, 'error')
      return
    }
    if (!Number.isSafeInteger(Number(divisionInput)) || Number(divisionInput) < 1) {
      showToast(language === 'ko' ? '기본 등분 수는 1 이상의 정수로 입력해주세요.' : 'Default portions must be a positive integer.', 'error')
      return
    }
    const riceItem = editSideItems.find((i) => i.ingredientId === MULTIGRAIN_ID)
    if (riceItem) {
      onMultigrainRiceAmountChange(riceItem.defaultAmount)
      onMultigrainRiceUnitChange(riceItem.defaultUnit)
    }
    const parsedDivision = Number.parseInt(divisionInput, 10)
    const validDivision = !Number.isNaN(parsedDivision) && parsedDivision > 0 ? parsedDivision : divisionCount
    onDivisionCountChange(validDivision)
    const updated = { ...activeRecipe, name: editName.trim() || activeRecipe.name, nameKo: editNameKo.trim() || activeRecipe.nameKo, categories: editCategories, imageUrl: editImages.map(image => image.url.trim()).filter(Boolean)[0] ?? '', imageUrls: editImages.map(image => image.url.trim()).filter(Boolean).slice(1), images: activeRecipe.images ?? [], productTags: editProductTags, photoProductDescription: editPhotoProductDescription, photoProductUrl: editPhotoProductUrl.trim(), link: editLink, items: editItems, sideItems: editSideItems, memo: editMemo, cookingGroupOrder: cookingGroupOrder(editItems, editGroupOrder), cookingContent: editCookingSteps.map(step => step.text).join('\n'), cookingSteps: editCookingSteps.filter(step => step.text.trim()), platingBlocks: editPlatingBlocks, tasteRating: editTasteRating, divisionCount: validDivision, cookingTimeMinutes: editCookingTime === '' ? undefined : Math.max(0, Number(editCookingTime)), lastCookedAt: editLastCookedAt || undefined }
    if (canSave) {
      setIsSaving(true)
      showToast(
        imageFile
          ? (language === 'ko' ? '사진을 업로드하고 저장하는 중입니다...' : 'Uploading and saving the photo...')
          : (language === 'ko' ? '레시피를 저장하는 중입니다...' : 'Saving the recipe...'),
        'info',
      )
      try {
        const savedImages: string[] = []
        const savedImageRecords: { id: string; url: string }[] = []
        for (const [index, image] of editImages.entries()) {
          if (!image.file) {
            if (image.url.trim()) { savedImages.push(image.url.trim()); savedImageRecords.push({ id: image.id ?? crypto.randomUUID(), url: image.url.trim() }) }
            continue
          }
  const imageFile = image.file
          const safeFileName = imageFile.name.replace(/[^\w.-]/g, '_')
          const imageRef = ref(storage, `recipes/${activeRecipe.id}/${Date.now()}-${index}-${safeFileName}`)
          // A missing bucket can fail browser preflight and leave the SDK retrying.
          // Check that endpoint before starting an upload; this writes no data.
          try {
            const response = await fetch(
              `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(imageRef.bucket)}/o`,
              { method: 'OPTIONS', signal: AbortSignal.timeout(15_000) },
            )
            if (response.status === 404) {
              throw Object.assign(new Error(`Storage bucket unavailable: ${imageRef.bucket}`), { code: 'storage/bucket-not-found' })
            }
          } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'storage/bucket-not-found') throw error
            throw Object.assign(new Error('Storage endpoint could not be reached', { cause: error }), { code: 'storage/network-unavailable' })
          }
          const uploadedImage = await uploadBytes(imageRef, imageFile, { contentType: imageFile.type })
          const uploadedUrl = await getDownloadURL(uploadedImage.ref)
          savedImages.push(uploadedUrl)
          savedImageRecords.push({ id: image.id ?? crypto.randomUUID(), url: uploadedUrl })
        }
        updated.imageUrl = savedImages[0] ?? ''
        updated.imageUrls = savedImages.slice(1)
        Object.assign(updated, reconcileRecipeGallery({ ...updated, images: savedImageRecords }))
        showToast(language === 'ko' ? '레시피를 데이터베이스에 저장하는 중입니다...' : 'Saving the recipe to the database...', 'info')
        await onSaveRecipe(updated)
        showToast(imageFile
          ? (language === 'ko' ? '사진이 교체되고 레시피가 저장되었습니다.' : 'Photo replaced and recipe saved.')
          : (language === 'ko' ? '레시피가 저장되었습니다.' : 'Recipe saved.'), 'success', {
            label: language === 'ko' ? '레시피 보러가기' : 'View recipe',
            onClick: () => navigate(`/recipe/${updated.id}`),
          })
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'
        console.error('Recipe save failed', error)
        if (code === 'recipe/missing-conversion') {
          const detail = error instanceof Error ? error.message : ''
          const ids = [...detail.matchAll(/([A-Za-z0-9_-]{12,})\s*\(([^)]+)\)/g)].map(match => match[1])
          const invalidIds = ids.length ? ids : [...editItems, ...editSideItems].map(item => item.ingredientId)
          setUnitErrorIds(new Set(invalidIds))
        }
        const detail = code === 'recipe/missing-conversion' && error instanceof Error
          ? ` ${error.message}`
          : code === 'recipe/invalid-amount'
          ? language === 'ko' ? ' 재료 또는 주식의 수량에 계산할 수 없는 값이 있습니다. 수량을 다시 입력해 주세요.' : ' An ingredient or side has an invalid quantity. Please enter its quantity again.'
          : code === 'unknown' && error instanceof Error
            ? ` ${error.message}`
          : code === 'storage/bucket-not-found'
          ? language === 'ko' ? ' 사진 저장소를 찾을 수 없습니다. Firebase Console의 Storage에서 저장소 생성 여부와 설정된 버킷 주소를 확인해 주세요.' : ' Photo storage was not found. Check the bucket setup and address in Firebase Console.'
          : code === 'storage/network-unavailable' || code === 'storage/retry-limit-exceeded'
            ? language === 'ko' ? ' 사진 저장소에 연결하지 못했거나 업로드 제한 시간을 초과했습니다.' : ' Photo storage could not be reached or the upload timed out.'
          : code === 'storage/unauthorized'
          ? language === 'ko' ? ' 사진 업로드 권한이 없습니다.' : ' Firebase Storage denied the image upload.'
          : code === 'permission-denied'
            ? language === 'ko' ? ' 데이터베이스 저장 권한이 거부되었습니다.' : ' Database permission was denied.'
            : code === 'unavailable'
              ? language === 'ko' ? ' 서버에 연결할 수 없습니다.' : ' The server is unavailable.'
              : ''
        const message = language === 'ko'
          ? `레시피 저장에 실패했습니다.${detail} 다시 시도해 주세요. (오류 코드: ${code})`
          : `Unable to save the recipe.${detail} Please try again. (Error code: ${code})`
        showToast(message, 'error')
        return
      } finally {
        setIsSaving(false)
      }
    } else {
      setIsGuestSaveModalOpen(true)
    }
    setLocalRecipe(updated)
    setEditImages(recipeImageDrafts(updated))
    setNewlyAddedIds(new Set())
    setIsEditing(false)
  }

  function handleEditAmountChange(index: number, value: string) {
    setAmountDrafts((prev) => ({ ...prev, [`main-${index}`]: value }))
    if (value === '') return
    const parsed = Number.parseFloat(value)
    if (Number.isNaN(parsed) || parsed < 0) return
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, defaultAmount: parsed } : item)),
    )
  }

  function handleEditUnitChange(index: number, unit: string) {
    setUnitErrorIds((prev) => { const next = new Set(prev); next.delete(editItems[index]?.ingredientId ?? ''); return next })
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, defaultUnit: unit } : item)),
    )
  }

  function handleDeleteItem(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index))
  }


  function handleAddIngredient(ingredientId: string) {
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    setEditItems((prev) => [
      ...prev,
      { ingredientId, defaultAmount: 100, defaultUnit: ing.allowedUnits[0] },
    ])
    setNewlyAddedIds((prev) => new Set([...prev, ingredientId]))
  }

  function handleReplaceIngredient(ingredientId: string) {
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    if (replaceSide) {
      setEditSideItems((prev) => prev.map((item, i) => {
        if (i !== replaceTargetIndex) return item
        const unit = ing.allowedUnits.includes(item.defaultUnit) ? item.defaultUnit : ing.allowedUnits[0]
        return { ...item, ingredientId, defaultUnit: unit }
      }))
    } else {
      setEditItems((prev) => prev.map((item, i) => {
        if (i !== replaceTargetIndex) return item
        const unit = ing.allowedUnits.includes(item.defaultUnit) ? item.defaultUnit : ing.allowedUnits[0]
        return { ...item, ingredientId, defaultUnit: unit }
      }))
    }
    setUnitErrorIds((prev) => { const next = new Set(prev); for (const item of [...editItems, ...editSideItems]) next.delete(item.ingredientId); return next })
    setReplaceTargetIndex(null)
  }

  function handleAddSideIngredient(ingredientId: string) {
    const ing = ingredientById.get(ingredientId)
    if (!ing) return
    setEditSideItems((prev) => [...prev, { ingredientId, defaultAmount: 100, defaultUnit: ing.allowedUnits[0] }])
  }

  function handleSideAmountChange(index: number, value: string) {
    setAmountDrafts((prev) => ({ ...prev, [`side-${index}`]: value }))
    if (value === '') return
    const parsed = Number.parseFloat(value)
    if (Number.isNaN(parsed) || parsed < 0) return
    setEditSideItems((prev) => prev.map((item, i) => i === index ? { ...item, defaultAmount: parsed } : item))
  }

  function handleSideUnitChange(index: number, unit: string) {
    setEditSideItems((prev) => prev.map((item, i) => i === index ? { ...item, defaultUnit: unit } : item))
  }

  function handleDeleteSideItem(index: number) {
    setEditSideItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleOpenRecipePicker() {
    setLoadingRecipeList(true)
    try {
      const docs = await loadRecipesFromFirestore()
      const list = mergeStaticAndFirestoreRecipes(staticRecipes, docs).filter(item => item.id !== activeRecipe.id && !item.hidden)
      setAvailableRecipes(list)
      setSelectedRecipeIds(new Set())
      setRecipeSearch('')
      setShowRecipePicker(true)
    } catch (error) {
      console.error('Unable to load recipes', error)
      showToast(language === 'ko' ? '레시피 목록을 불러오지 못했습니다.' : 'Could not load the recipe list.', 'error')
    } finally {
      setLoadingRecipeList(false)
    }
  }

  function handleImportSelectedRecipes() {
    const selected = availableRecipes.filter(item => selectedRecipeIds.has(item.id))
    setEditItems(current => {
      const next = [...current]
      for (const imported of selected) {
        for (const item of imported.items) {
          const existing = next.find(entry => entry.ingredientId === item.ingredientId && entry.defaultUnit === item.defaultUnit && (entry.cookingGroup ?? '') === (item.cookingGroup ?? ''))
          if (existing) existing.defaultAmount += item.defaultAmount
          else next.push({ ...item })
        }
      }
      return next
    })
    setShowRecipePicker(false)
    setSelectedRecipeIds(new Set())
  }




  function macroColor(value: number, target: number): string {
    const diff = Math.abs(value - target)
    if (diff >= 10) return 'var(--destructive)'
    if (diff >= 5) return 'var(--warning)'
    return 'var(--success)'
  }

  const totals = (isEditing ? editItems : rows).reduce(
    (acc, item) => {
      const ingredient = ingredientById.get(item.ingredientId)
      if (!ingredient) return acc
      const amount = isEditing ? (item as typeof editItems[0]).defaultAmount : (item as typeof rows[0]).amount
      const unit = isEditing ? (item as typeof editItems[0]).defaultUnit : (item as typeof rows[0]).unit
      const grams = amountToGrams(amount, unit, ingredient.conversions)
      const macros = calculateMacros(grams, ingredient)
      return {
        carbs: acc.carbs + macros.carbs,
        protein: acc.protein + macros.protein,
        fat: acc.fat + macros.fat,
      }
    },
    { carbs: 0, protein: 0, fat: 0 },
  )

  function computeSideMacros(item: RecipeItem): { carbs: number; protein: number; fat: number } {
    if (item.ingredientId === MULTIGRAIN_ID) {
      const g = item.defaultUnit === 'oz' ? item.defaultAmount * 28.3495 : item.defaultAmount
      return { carbs: (g * 28.5) / 100, protein: (g * 3.1) / 100, fat: (g * 0.8) / 100 }
    }
    const ing = ingredientById.get(item.ingredientId)
    if (!ing) return { carbs: 0, protein: 0, fat: 0 }
    const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ing.conversions)
    return calculateMacros(grams, ing)
  }

  const activeSideItems = isEditing
    ? editSideItems
    : (activeRecipe.sideItems ?? [])
  const sideTotals = activeSideItems.reduce(
    (acc, item) => {
      const m = computeSideMacros(item)
      return { carbs: acc.carbs + m.carbs, protein: acc.protein + m.protein, fat: acc.fat + m.fat }
    },
    { carbs: 0, protein: 0, fat: 0 },
  )



  return (
    <section className="recipe-block" id={recipe.id}>
      <div className="recipe-edit-topbar">
        {defaultEditing && <Button type="button" variant="ghost" size="sm" onClick={() => window.history.back()}>{language === 'ko' ? '← 뒤로' : '← Back'}</Button>}
        <div className="recipe-block__edit-actions">
          {isEditing && (
            <>
              {isAdmin && onDeleteRecipe && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const msg = language === 'ko'
                      ? `'${getRecipeDisplayName(activeRecipe, language)}' 레시피를 삭제하시겠습니까?\n삭제된 레시피는 복구할 수 없습니다.`
                      : `Delete '${getRecipeDisplayName(activeRecipe, language)}'?\nThis action cannot be undone.`
                    if (window.confirm(msg)) void onDeleteRecipe(activeRecipe.id)
                  }}
                >
                  {language === 'ko' ? '삭제' : 'Delete'}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isSaving || tagBusy}>
                {language === 'ko' ? '취소' : 'Cancel'}
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || tagBusy}>
                {isSaving ? (language === 'ko' ? '저장 중...' : 'Saving...') : (language === 'ko' ? '저장' : 'Save')}
              </Button>
            </>
          )}
          {!isEditing && (
            <Button type="button" variant="ghost" size="icon-sm" className="recipe-block__edit-btn--corner" onClick={startEditing}>
              ✏️
            </Button>
          )}
        </div>
      </div>
      <div className={`recipe-block__heading-row${isEditing ? ' recipe-block__heading-row--editing' : ''}`}>
        <div className="recipe-block__title-group">
          {isAdmin && <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`recipe-block__collapse-btn${isCollapsed ? ' recipe-block__collapse-btn--hidden' : ''}`}
            onClick={() => {
              const next = !isCollapsed
              setIsCollapsed(next)
              onSaveRecipe({ ...localRecipe, hidden: next })
            }}
            aria-label={isCollapsed ? (language === 'ko' ? '펼치기' : 'Expand') : (language === 'ko' ? '접기' : 'Collapse')}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </Button>}
          {isEditing ? (
            <div className="recipe-block__title-edit">
              <div className="recipe-block__title-edit-field">
                <label htmlFor={`recipe-name-ko-${recipe.id}`}>{language === 'ko' ? '한글 이름' : 'Korean name'}</label>
                <Input
                  id={`recipe-name-ko-${recipe.id}`}
                  value={editNameKo}
                  onChange={(e) => setEditNameKo(e.target.value)}
                />
              </div>
              <div className="recipe-block__title-edit-field">
                <label htmlFor={`recipe-name-en-${recipe.id}`}>{language === 'ko' ? '영문 이름' : 'English name'}</label>
                <Input
                  id={`recipe-name-en-${recipe.id}`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <h2 className="recipe-block__heading">
              {getRecipeDisplayName(activeRecipe, language)}
            </h2>
          )}
          {!isEditing && (
            <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <RecipeBadge result={getRecipeBadge(activeRecipe)} language={language} />
              <MacroBadge result={getRecipeBadge(activeRecipe)} language={language} />
            </div>
          )}
          <div className="recipe-block__ratings">
            <StarRating
              label={language === 'ko' ? '맛' : 'Taste'}
              value={isEditing ? editTasteRating : (activeRecipe.tasteRating ?? 4)}
              onChange={isEditing ? setEditTasteRating : undefined}
            />
            {activeRecipe.link && (
              <a className="recipe-block__link-icon" href={activeRecipe.link} target="_blank" rel="noopener noreferrer" aria-label="Recipe link">
                🔗
              </a>
            )}
            {isAdmin && onDeleteRecipe && !isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="recipe-block__delete-btn"
                onClick={() => {
                  const msg = language === 'ko'
                    ? `'${getRecipeDisplayName(activeRecipe, language)}' 레시피를 삭제하시겠습니까?\n삭제된 레시피는 복구할 수 없습니다.`
                    : `Delete '${getRecipeDisplayName(activeRecipe, language)}'?\nThis action cannot be undone.`
                  if (window.confirm(msg)) onDeleteRecipe(activeRecipe.id)
                }}
              >
                {language === 'ko' ? '삭제' : 'Delete'}
              </Button>
            )}
            {!isEditing && (
              <Button type="button" variant="ghost" size="icon-sm" className="recipe-block__edit-btn--inline" onClick={startEditing}>
                ✏️
              </Button>
            )}
          </div>
        </div>

      </div>

      {!isCollapsed && isEditing && (
        <div className="edit-inline__link-field">
          <label className="edit-inline__link-label">
            {language === 'ko' ? '링크' : 'Link'}
          </label>
          <Input
            type="url"
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      {!isCollapsed && isEditing && (
        <fieldset className="edit-inline__link-field" disabled={isSaving || tagBusy}>
          <legend className="edit-inline__link-label">{language === 'ko' ? '레시피 태그' : 'Recipe tags'}</legend>
          <div className="flex flex-wrap gap-2">
            {recipeCategories.filter(category => category !== '전체').map(category => (
              <Button key={category} type="button" variant="filter" size="compact"
                aria-pressed={editCategories.includes(category)}
                onClick={() => setEditCategories(current => current.includes(category) ? current.filter(value => value !== category) : [...current, category])}>
                {language === 'ko' ? category : categoryEnglish[category]}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      {!isCollapsed && isEditing && (
        <div className="edit-inline__link-field">
          <label className="edit-inline__link-label" htmlFor={`cooking-time-${recipe.id}`}>{language === 'ko' ? '조리시간 (분)' : 'Cooking time (minutes)'}</label>
          <Input id={`cooking-time-${recipe.id}`} style={{ maxWidth: 200 }} type="number" min="0" step="1" value={editCookingTime} onChange={event => setEditCookingTime(event.target.value)} placeholder={language === 'ko' ? '확인필요' : 'To be confirmed'} />
        </div>
      )}

      {!isCollapsed && isEditing && (
        <div className="edit-inline__link-field">
          <label className="edit-inline__link-label" htmlFor={`last-cooked-${recipe.id}`}>{language === 'ko' ? '요리한 날짜' : 'Date I cooked this recipe'}</label>
          <Input id={`last-cooked-${recipe.id}`} style={{ maxWidth: 200 }} type="date" value={editLastCookedAt} onChange={event => setEditLastCookedAt(event.target.value)} />
        </div>
      )}

      {!isCollapsed && isEditing && (
        <RecipeImagesEditor images={editImages} onChange={images => {
          setEditImages(images)
          const ids = new Set(images.map(image => image.id))
          setEditProductTags(tags => tags.filter(tag => ids.has(tag.imageId)))
        }} disabled={isSaving || tagBusy} />
      )}

      {!isCollapsed && isEditing && isAdmin && !shopFeatures.enabled && <fieldset className="product-tag-editor" disabled={isSaving || tagBusy}>
        <legend>{language === 'ko' ? '사진 속 상품' : 'Products in this photo'}</legend>
        <label htmlFor={`photo-product-description-${recipe.id}`}>{language === 'ko' ? '상품 설명' : 'Product information'}</label>
        <Textarea id={`photo-product-description-${recipe.id}`} value={editPhotoProductDescription} onChange={event => setEditPhotoProductDescription(event.target.value)} rows={5} aria-describedby={`photo-product-description-hint-${recipe.id}`} />
        <p id={`photo-product-description-hint-${recipe.id}`}>{language === 'ko' ? '제품명과 설명을 자유롭게 적어주세요. 레시피를 저장하면 상세 페이지에 표시됩니다.' : 'Enter product names and details. Save the recipe to display this information on the detail page.'}</p>
        <label htmlFor={`photo-product-url-${recipe.id}`}>{language === 'ko' ? '상품 구매 링크' : 'Product purchase URL'}</label>
        <Input id={`photo-product-url-${recipe.id}`} type="url" value={editPhotoProductUrl} onChange={event => setEditPhotoProductUrl(event.target.value)} placeholder="https://..." aria-invalid={!!editPhotoProductUrl.trim() && !safeProductUrl(editPhotoProductUrl.trim())} />
      </fieldset>}
      {!isCollapsed && isEditing && isAdmin && shopFeatures.enabled && <ProductTagEditor images={editImages} tags={editProductTags} onChange={setEditProductTags} disabled={isSaving} onBusyChange={setTagBusy} />}
      {!isCollapsed && isEditing && <section className="recipe-edit-tabs">
        <div className="detail-table-tabs recipe-edit-tablist" role="tablist" aria-label={language === 'ko' ? '탭별 내용 수정' : 'Edit tab content'}>
          {(['storage', 'cooking', 'meal'] as const).map((tab, index) => <button key={tab} type="button" role="tab" id={`edit-tab-${recipe.id}-${tab}`} aria-selected={editTab === tab} tabIndex={editTab === tab ? 0 : -1} aria-controls={`edit-tab-panel-${recipe.id}`} onClick={() => setEditTab(tab)} disabled={isSaving || tagBusy} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const tabs = ['storage', 'cooking', 'meal'] as const
            const next = event.key === 'Home' ? 'storage' : event.key === 'End' ? 'meal' : tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
            setEditTab(next)
            document.getElementById(`edit-tab-${recipe.id}-${next}`)?.focus()
          }}>{(language === 'ko' ? ['재료 꺼낼 때', '요리할 때', '플레이팅'] : ['Gather ingredients', 'Cook', 'Plating'])[index]}</button>)}
        </div>
        <div role="tabpanel" id={`edit-tab-panel-${recipe.id}`} aria-labelledby={`edit-tab-${recipe.id}-${editTab}`}>
          {editTab === 'meal' && <div className="plating-block-editor">
            {editPlatingBlocks.map((block, index) => <div key={block.id} className="recipe-tab-text-field">
              <div className="flex items-center justify-between gap-2">
                <label className="edit-inline__link-label" htmlFor={`plating-${recipe.id}-${block.id}`}>{block.type === 'text' ? (language === 'ko' ? '글' : 'Text') : (language === 'ko' ? '이미지 URL' : 'Image URL')}</label>
                <div className="flex gap-2">
                  {([-1, 1] as const).map(direction => <Button key={direction} type="button" variant="outline" size="sm" disabled={isSaving || index + direction < 0 || index + direction >= editPlatingBlocks.length} aria-label={direction === -1 ? '위로 이동' : '아래로 이동'} onClick={() => setEditPlatingBlocks(current => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next })}>{direction === -1 ? '↑' : '↓'}</Button>)}
                  <Button type="button" variant="ghost" size="sm" disabled={isSaving || tagBusy} onClick={() => setEditPlatingBlocks(current => current.filter(item => item.id !== block.id))}>{language === 'ko' ? '삭제' : 'Delete'}</Button>
                </div>
              </div>
              {block.type === 'text' ? <Textarea id={`plating-${recipe.id}-${block.id}`} value={block.value} rows={7} disabled={isSaving || tagBusy} onChange={event => setEditPlatingBlocks(current => current.map(item => item.id === block.id ? { ...item, value: event.target.value } : item))} /> : <Input id={`plating-${recipe.id}-${block.id}`} type="url" placeholder="https://..." value={block.value} disabled={isSaving || tagBusy} onChange={event => setEditPlatingBlocks(current => current.map(item => item.id === block.id ? { ...item, value: event.target.value } : item))} />}
            </div>)}
            <div className="flex gap-2">
              {(['text', 'image'] as const).map(type => <Button key={type} type="button" variant="outline" disabled={isSaving || tagBusy} onClick={() => setEditPlatingBlocks(current => [...current, { id: crypto.randomUUID(), type, value: '' }])}>{type === 'text' ? (language === 'ko' ? '+ 글 추가' : '+ Add text') : (language === 'ko' ? '+ 이미지 추가' : '+ Add image')}</Button>)}
            </div>
          </div>}
        </div>
      </section>}
      {!isCollapsed && isEditing && editTab === 'cooking' && <CookingGroupOrderEditor items={editItems} order={editGroupOrder} onChange={setEditGroupOrder} ko={language === 'ko'} disabled={isSaving || tagBusy} />}
      {!isCollapsed && (!isEditing || editTab !== 'meal') && <Table className="data-table recipe-table">
        <TableHeader>
          <TableRow>
            {isEditing && <TableHead className="edit-inline__order-cell" aria-label={language === 'ko' ? '순서 변경' : 'Reorder'} />}
            <TableHead>{t.colIngredient}</TableHead>
            {isEditing && <TableHead>{language === 'ko' ? '요리 그룹' : 'Cooking group'}</TableHead>}
            <TableHead>{t.colAmount}</TableHead>
            <TableHead>{t.colUnit}</TableHead>
            <TableHead>{t.colCarbs}</TableHead>
            <TableHead>{t.colProtein}</TableHead>
            <TableHead>{t.colFat}</TableHead>
            {isEditing && (
              <TableHead className="edit-inline__delete-cell">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={language === 'ko' ? '전체 삭제' : 'Delete all'}
                  onClick={() => { setEditItems([]); setEditSideItems([]) }}
                  className="text-muted-foreground  "
                >✕</Button>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
            {isEditing ? (
              editItems.map((item, index) => {
              const ingredient = ingredientById.get(item.ingredientId)
              if (!ingredient) return (
                <TableRow key={item.ingredientId} className="edit-row--new"><TableCell className="edit-inline__order-cell"><IngredientOrderControls index={index} count={editItems.length} name={ingredientNameForId(item.ingredientId)} ko={language === 'ko'} disabled={isSaving || tagBusy} onMove={direction => { setEditItems(current => moveIngredient(current, index, direction)); setAmountDrafts({}) }} /></TableCell>
                  <TableCell className="edit-inline__replace-cell">
                    <span>{ingredientNameForId(item.ingredientId)}</span>
                    {unitErrorIds.has(item.ingredientId) && ingredientNameForId(item.ingredientId) !== '알 수 없는 식재료' && <p role="alert" className="add-recipe__field-error">{language === 'ko' ? `${ingredientNameForId(item.ingredientId)} (${item.defaultUnit}): 단위 환산 정보가 없습니다. 식재료 환산 정보를 등록하거나 다른 단위를 선택해 주세요.` : `${ingredientNameForId(item.ingredientId)} (${item.defaultUnit}): No conversion is available. Register a conversion or choose another unit.`}</p>}
                  </TableCell>
<TableCell><Input aria-label="요리 그룹" value={item.cookingGroup ?? ''} disabled={isSaving || tagBusy} onChange={event => setEditItems(current => current.map((entry, i) => i === index ? { ...entry, cookingGroup: event.target.value } : entry))} /></TableCell>

                  <TableCell><Input type="number" className="h-7 w-20 text-sm" value={item.defaultAmount} readOnly /></TableCell>
                  <TableCell><UnitSelect ingredientId={item.ingredientId} value={item.defaultUnit} onValueChange={(v) => handleEditUnitChange(index, v)} language={language} /></TableCell>
                  <TableCell colSpan={3} />
                  <TableCell><Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDeleteItem(index)}>×</Button></TableCell>
                </TableRow>
              )
                const isNew = newlyAddedIds.has(item.ingredientId)
                const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ingredient.conversions)
                const macros = calculateMacros(grams, ingredient)
                return (
                  <TableRow key={item.ingredientId} className={isNew ? 'edit-row--new' : ''}>
                    <TableCell className="edit-inline__order-cell"><div className="ingredient-order-layout"><span className={`edit-inline__drag-handle${dragOverIndex === index ? ' edit-inline__drag-over' : ''}`}
                      draggable
                      onDragStart={() => { dragItemIndex.current = index }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => {
                        if (dragItemIndex.current === null || dragItemIndex.current === index) { setDragOverIndex(null); return }
                        setEditItems((prev) => {
                          const next = [...prev]
                          const [moved] = next.splice(dragItemIndex.current!, 1)
                          next.splice(index, 0, moved)
                          return next
                        })
                        dragItemIndex.current = null
                        setDragOverIndex(null)
                      }}
                      onDragEnd={() => { dragItemIndex.current = null; setDragOverIndex(null) }}
                      aria-label="Drag to reorder"
                    >⠿</span><IngredientOrderControls index={index} count={editItems.length} name={ingredientNameForId(item.ingredientId)} ko={language === 'ko'} disabled={isSaving || tagBusy} onMove={direction => { setEditItems(current => moveIngredient(current, index, direction)); setAmountDrafts({}) }} /></div></TableCell>
                    <TableCell
                      className="edit-inline__replace-cell"
                      style={{ fontWeight: isNew ? 700 : undefined, color: isAddedSugarIngredient(ingredient.nameKo) ? 'var(--destructive)' : isRefinedCarb(ingredient.nameKo, ingredient.name, ingredient.isRefinedCarb) ? 'var(--warning)' : undefined }}
                    >
                      <div className="ingredient-name-actions"><Link to={`/ingredient/${encodeURIComponent(ingredient.id)}/edit`} target="_blank" rel="noopener noreferrer" title={language === 'ko' ? '식재료 수정 (새 탭)' : 'Edit ingredient (new tab)'}>
                        {getIngredientDisplayName(ingredient, language)}
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="content"
                        className="edit-inline__replace-trigger"
                        aria-label={language === 'ko' ? `${getIngredientDisplayName(ingredient, language)} 식재료 교체` : `Replace ${getIngredientDisplayName(ingredient, language)}`}
                        title={language === 'ko' ? '클릭하여 식재료 교체' : 'Click to replace ingredient'}
                        onClick={() => { setReplaceSide(false); setReplaceTargetIndex(index) }}
                      >
                        <ArrowLeftRight size={14} aria-hidden="true" />
                      </Button></div>
                      {unitErrorIds.has(item.ingredientId) && <p role="alert" className="add-recipe__field-error">{language === 'ko' ? `${getIngredientDisplayName(ingredient, language)} (${item.defaultUnit}): 단위 환산 정보가 없습니다. 식재료 환산 정보를 등록하거나 다른 단위를 선택해 주세요.` : `${getIngredientDisplayName(ingredient, language)} (${item.defaultUnit}): No unit conversion is available. Register a conversion or choose another unit.`}</p>}
                    </TableCell>
<TableCell><Input className="cooking-group-input" aria-label="요리 그룹" placeholder="예: 양념장·반죽" value={item.cookingGroup ?? ''} disabled={isSaving || tagBusy} onChange={event => setEditItems(current => current.map((entry, i) => i === index ? { ...entry, cookingGroup: event.target.value } : entry))} /></TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={amountDrafts[`main-${index}`] ?? (Number.isFinite(item.defaultAmount) ? item.defaultAmount : '')}
                        aria-invalid={!Number.isFinite(item.defaultAmount) || item.defaultAmount < 0}
                        onChange={(e) => handleEditAmountChange(index, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value === '') handleEditAmountChange(index, '0')
                          setAmountDrafts((prev) => { const next = { ...prev }; delete next[`main-${index}`]; return next })
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <UnitSelect ingredientId={item.ingredientId}
                        value={item.defaultUnit}
                        onValueChange={(v) => handleEditUnitChange(index, v)}
                        language={language}
                      />
                    </TableCell>
                    <TableCell>{formatMacro(macros.carbs)}</TableCell>
                    <TableCell>{formatMacro(macros.protein)}</TableCell>
                    <TableCell>{formatMacro(macros.fat)}</TableCell>
                    <TableCell className="edit-inline__delete-cell">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteItem(index)}
                        className="text-muted-foreground  "
                      >
                        ✕
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              rows.map((row, index) => {
                const ingredient = ingredientById.get(row.ingredientId)
                if (!ingredient) return null

                const grams = amountToGrams(row.amount, row.unit, ingredient.conversions)
                const macros = calculateMacros(grams, ingredient)
                const isMatch =
                  appliedSearch !== '' &&
                  ingredientMatchesSearch(ingredient, appliedSearch)

                return (
                  <TableRow
                    key={row.ingredientId}
                    className={isMatch ? 'recipe-table__row--match' : undefined}
                  >
                    <TableCell style={{ color: isAddedSugarIngredient(ingredient.nameKo) ? 'var(--destructive)' : isRefinedCarb(ingredient.nameKo, ingredient.name, ingredient.isRefinedCarb) ? 'var(--warning)' : undefined }}>{getIngredientDisplayName(ingredient, language)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={amountDrafts[`main-${index}`] ?? formatAmount(row.amount)}
                        onFocus={startEditing}
                        onChange={(event) => {
                          setAmountDrafts((prev) => ({ ...prev, [`main-${index}`]: event.target.value }))
                          if (event.target.value !== '') onAmountChange(row.ingredientId, event.target.value)
                        }}
                        onBlur={(event) => {
                          if (event.target.value === '') onAmountChange(row.ingredientId, '0')
                          setAmountDrafts((prev) => { const next = { ...prev }; delete next[`main-${index}`]; return next })
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <UnitSelect ingredientId={row.ingredientId}
                        value={row.unit}
                        onValueChange={(v) => { startEditing(); onUnitChange(row.ingredientId, v) }}
                        language={language}
                      />
                    </TableCell>
                    <TableCell>{formatMacro(macros.carbs)}</TableCell>
                    <TableCell>{formatMacro(macros.protein)}</TableCell>
                    <TableCell>{formatMacro(macros.fat)}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="recipe-table__total recipe-table__muted">
              <TableCell colSpan={isEditing ? 5 : 3}>
                {t.total}
              </TableCell>
              <TableCell className="macro">{formatMacro(totals.carbs)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.protein)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.fat)}</TableCell>
              {isEditing && <TableCell className="edit-inline__order-cell edit-inline__delete-cell"></TableCell>}
            </TableRow>
            <TableRow className="recipe-table__division-row">
              <TableCell colSpan={isEditing ? 5 : 3}>
                {language === 'en' ? (
                  <>
                    {t.divideByMeals}{' '}
                    <Input
                      type="number"
                      className="h-7 w-16 text-sm inline-block"
                      min={1}
                      step="1"
                      value={divisionInput}
                      onFocus={startEditing}
                      onChange={(event) => {
                        setDivisionInput(event.target.value)
                        if (!isEditing) {
                          const value = Number.parseInt(event.target.value, 10)
                          if (!Number.isNaN(value) && value > 0) {
                            onDivisionCountChange(value)
                          }
                        }
                      }}
                      onBlur={() => {
                        const value = Number.parseInt(divisionInput, 10)
                        if (Number.isNaN(value) || value <= 0) {
                          setDivisionInput(String(divisionCount))
                        }
                      }}
                    />{' '}
                    {t.meals}
                  </>
                ) : (
                  <>
                    <Input
                      type="number"
                      className="h-7 w-16 text-sm inline-block"
                      min={1}
                      step="1"
                      value={divisionInput}
                      onFocus={startEditing}
                      onChange={(event) => {
                        setDivisionInput(event.target.value)
                        if (!isEditing) {
                          const value = Number.parseInt(event.target.value, 10)
                          if (!Number.isNaN(value) && value > 0) {
                            onDivisionCountChange(value)
                          }
                        }
                      }}
                      onBlur={() => {
                        const value = Number.parseInt(divisionInput, 10)
                        if (Number.isNaN(value) || value <= 0) {
                          setDivisionInput(String(divisionCount))
                        }
                      }}
                    />{' '}
                    {t.divideByMeals}
                  </>
                )}
              </TableCell>
              <TableCell className="macro">{formatMacro(totals.carbs / effectiveDivision)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.protein / effectiveDivision)}</TableCell>
              <TableCell className="macro">{formatMacro(totals.fat / effectiveDivision)}</TableCell>
              {isEditing && <TableCell className="edit-inline__order-cell edit-inline__delete-cell"></TableCell>}
            </TableRow>
            {activeSideItems.map((item, index) => {
              const isRice = item.ingredientId === MULTIGRAIN_ID
              const ing = isRice ? null : ingredientById.get(item.ingredientId)
              if (!isRice && !ing) return (
                <TableRow key={item.ingredientId} className="recipe-table__multigrain-row">{isEditing && <TableCell className="edit-inline__order-cell"><IngredientOrderControls index={index} count={editSideItems.length} name={ingredientNameForId(item.ingredientId)} ko={language === 'ko'} disabled={isSaving || tagBusy} onMove={direction => { setEditSideItems(current => moveIngredient(current, index, direction)); setAmountDrafts({}) }} /></TableCell>}
                  <TableCell>{ingredientNameForId(item.ingredientId)}{unitErrorIds.has(item.ingredientId) && ingredientNameForId(item.ingredientId) !== '알 수 없는 식재료' && <p role="alert" className="add-recipe__field-error">{language === 'ko' ? `${ingredientNameForId(item.ingredientId)} (${item.defaultUnit}): 단위 환산 정보가 없습니다. 식재료 환산 정보를 등록하거나 다른 단위를 선택해 주세요.` : `${ingredientNameForId(item.ingredientId)} (${item.defaultUnit}): No conversion is available. Register a conversion or choose another unit.`}</p>}</TableCell>
{isEditing && <TableCell><Input aria-label="요리 그룹" value={item.cookingGroup ?? ''} disabled={isSaving || tagBusy} onChange={event => setEditSideItems(current => current.map((entry, i) => i === index ? { ...entry, cookingGroup: event.target.value } : entry))} /></TableCell>}

                  <TableCell>{item.defaultAmount}</TableCell>
                  <TableCell>{item.defaultUnit}</TableCell><TableCell colSpan={3} />
                  {isEditing && <TableCell><Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDeleteSideItem(index)}>×</Button></TableCell>}
                </TableRow>
              )
              const macros = computeSideMacros(item)
              return (
                <TableRow key={item.ingredientId} className="recipe-table__multigrain-row">{isEditing && (
                    <TableCell className="edit-inline__order-cell"><div className="ingredient-order-layout"><span className={`edit-inline__drag-handle${dragOverSideIndex === index ? ' edit-inline__drag-over' : ''}`}
                      draggable
                      onDragStart={() => { dragSideItemIndex.current = index }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSideIndex(index) }}
                      onDragLeave={() => setDragOverSideIndex(null)}
                      onDrop={() => {
                        if (dragSideItemIndex.current === null || dragSideItemIndex.current === index) { setDragOverSideIndex(null); return }
                        setEditSideItems((prev) => {
                          const next = [...prev]
                          const [moved] = next.splice(dragSideItemIndex.current!, 1)
                          next.splice(index, 0, moved)
                          return next
                        })
                        dragSideItemIndex.current = null
                        setDragOverSideIndex(null)
                      }}
                      onDragEnd={() => { dragSideItemIndex.current = null; setDragOverSideIndex(null) }}
                      aria-label="Drag to reorder"
                    >⠿</span><IngredientOrderControls index={index} count={editSideItems.length} name={ingredientNameForId(item.ingredientId)} ko={language === 'ko'} disabled={isSaving || tagBusy} onMove={direction => { setEditSideItems(current => moveIngredient(current, index, direction)); setAmountDrafts({}) }} /></div></TableCell>)}
                  <TableCell
                    className={!isRice && isEditing ? 'edit-inline__replace-cell' : undefined}
                    style={{ color: !isRice && ing ? (isAddedSugarIngredient(ing.nameKo) ? 'var(--destructive)' : isRefinedCarb(ing.nameKo, ing.name, ing.isRefinedCarb) ? 'var(--warning)' : undefined) : undefined }}
                  >
                    {isRice
                      ? (language === 'ko' ? '잡곡밥 (쌀:잡곡=2:1)' : 'Multigrain rice (rice:grains=2:1)')
                      : isEditing ? <><div className="ingredient-name-actions"><Link to={`/ingredient/${encodeURIComponent(ing!.id)}/edit`} target="_blank" rel="noopener noreferrer" title={language === 'ko' ? '식재료 수정 (새 탭)' : 'Edit ingredient (new tab)'}>
                        {getIngredientDisplayName(ing!, language)}
                      </Link><Button
                        type="button"
                        variant="ghost"
                        size="content"
                        className="edit-inline__replace-trigger"
                        aria-label={language === 'ko' ? `${getIngredientDisplayName(ing!, language)} 식재료 교체` : `Replace ${getIngredientDisplayName(ing!, language)}`}
                        title={language === 'ko' ? '클릭하여 식재료 교체' : 'Click to replace ingredient'}
                        onClick={() => { setReplaceSide(true); setReplaceTargetIndex(index) }}
                      >
                        <ArrowLeftRight size={14} aria-hidden="true" />
                      </Button></div>{unitErrorIds.has(item.ingredientId) && <p role="alert" className="add-recipe__field-error">{language === 'ko' ? `${getIngredientDisplayName(ing!, language)} (${item.defaultUnit}): 단위 환산 정보가 없습니다. 식재료 환산 정보를 등록하거나 다른 단위를 선택해 주세요.` : `${getIngredientDisplayName(ing!, language)} (${item.defaultUnit}): No unit conversion is available. Register a conversion or choose another unit.`}</p>}</> : getIngredientDisplayName(ing!, language)}
                  </TableCell>
{isEditing && <TableCell><Input aria-label="요리 그룹" value={item.cookingGroup ?? ''} disabled={isSaving || tagBusy} onChange={event => setEditSideItems(current => current.map((entry, i) => i === index ? { ...entry, cookingGroup: event.target.value } : entry))} /></TableCell>}
                  

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={amountDrafts[`side-${index}`] ?? (Number.isFinite(item.defaultAmount) ? item.defaultAmount : '')}
                        aria-invalid={!Number.isFinite(item.defaultAmount) || item.defaultAmount < 0}
                        onChange={(e) => handleSideAmountChange(index, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value === '') handleSideAmountChange(index, '0')
                          setAmountDrafts((prev) => { const next = { ...prev }; delete next[`side-${index}`]; return next })
                        }}
                      />
                    ) : (
                      <Input
                        type="number"
                        className="h-7 w-20 text-sm"
                        min={0}
                        step="0.1"
                        value={amountDrafts[`rice-${index}`] ?? formatAmount(item.defaultAmount)}
                        onFocus={startEditing}
                        onChange={(e) => {
                          setAmountDrafts((prev) => ({ ...prev, [`rice-${index}`]: e.target.value }))
                          if (e.target.value === '') return
                          const parsed = Number.parseFloat(e.target.value)
                          if (!Number.isNaN(parsed) && parsed >= 0 && isRice) onMultigrainRiceAmountChange(parsed)
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') onMultigrainRiceAmountChange(0)
                          setAmountDrafts((prev) => { const next = { ...prev }; delete next[`rice-${index}`]; return next })
                        }}
                        readOnly={!isRice}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <UnitSelect ingredientId={item.ingredientId}
                        value={item.defaultUnit}
                        onValueChange={(v) => handleSideUnitChange(index, v)}
                        language={language}
                        riceOnly={isRice}
                      />
                    ) : (
                      <UnitSelect ingredientId={item.ingredientId}
                        value={item.defaultUnit}
                        onValueChange={(v) => { startEditing(); if (isRice) onMultigrainRiceUnitChange(v) }}
                        language={language}
                        riceOnly={isRice}
                      />
                    )}
                  </TableCell>
                  <TableCell className="macro">{formatMacro(macros.carbs)}</TableCell>
                  <TableCell className="macro">{formatMacro(macros.protein)}</TableCell>
                  <TableCell className="macro">{formatMacro(macros.fat)}</TableCell>
                  {isEditing && (
                    <TableCell className="edit-inline__delete-cell">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteSideItem(index)}
                        className="text-muted-foreground  "
                      >✕</Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
            {isEditing && !editSideItems.some((i) => i.ingredientId === MULTIGRAIN_ID) && (
              <TableRow className="recipe-table__multigrain-row">
                <TableCell colSpan={9}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground text-sm"
                    onClick={() => setEditSideItems((prev) => [...prev, { ingredientId: MULTIGRAIN_ID, defaultAmount: multigrainRiceAmount, defaultUnit: multigrainRiceUnit }])}
                  >
                    + {language === 'ko' ? '잡곡밥 추가' : 'Add multigrain rice'}
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {(() => {
              const carbs = totals.carbs / effectiveDivision + sideTotals.carbs
              const protein = totals.protein / effectiveDivision + sideTotals.protein
              const fat = totals.fat / effectiveDivision + sideTotals.fat
              const kcal = formatTableNumber(Math.round(carbs * 4 + protein * 4 + fat * 9), 0, 0)
              const dc = recommended.carbs - carbs
              const dp = recommended.protein - protein
              const df = recommended.fat - fat
              const fmt = (d: number) => {
                const grams = formatTableNumber(Math.round(Math.abs(d)), 0, 0)
                return language === 'ko'
                  ? `(${grams}g ${d > 0 ? '부족' : '초과'})`
                  : `(${grams}g ${d > 0 ? 'below target' : 'above target'})`
              }
              const show = (d: number) => Math.abs(d) > 3
              const renderCell = (value: number, target: number, delta: number) => {
                const color = macroColor(value, target)
                return (
                  <TableCell className="macro">
                    <strong style={{ color }}>{formatMacro(value)}</strong>
                    {show(delta) && <div style={{ color, fontSize: '14px', lineHeight: 1.1 }}>{fmt(delta)}</div>}
                  </TableCell>
                )
              }
              return (
                <TableRow className="recipe-table__total">
                  <TableCell colSpan={isEditing ? 5 : 3}>
                    <strong>{t.combinedTotal} <span className="recipe-table__kcal">(kcal: {kcal})</span></strong>
                  </TableCell>
                  {renderCell(carbs, recommended.carbs, dc)}
                  {renderCell(protein, recommended.protein, dp)}
                  {renderCell(fat, recommended.fat, df)}
                  {isEditing && <TableCell></TableCell>}
                </TableRow>
              )
            })()}
            <TableRow className="recipe-table__recommended">
              <TableCell colSpan={isEditing ? 5 : 3}>
                <strong>
                  {t.recommendedPerMeal}{' '}
                  <span className="recipe-table__kcal">(kcal: {formatTableNumber(MEAL_TARGET_KCAL, 0, 0)})</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="recipe-table__info-btn"
                    onClick={(e) => { e.stopPropagation(); setIsRecommendedInfoOpen(true) }}
                    aria-label={language === 'ko' ? '기준 정보' : 'Reference info'}
                  >ⓘ</Button>
                </strong>
              </TableCell>
              <TableCell className="macro"><strong>{formatMacro(recommended.carbs)}</strong></TableCell>
              <TableCell className="macro"><strong>{formatMacro(recommended.protein)}</strong></TableCell>
              <TableCell className="macro"><strong>{formatMacro(recommended.fat)}</strong></TableCell>
              {isEditing && <TableCell></TableCell>}
            </TableRow>
          </TableFooter>
        </Table>}
      {!isCollapsed && isEditing && editTab === 'cooking' && <div className="recipe-tab-text-field recipe-tab-text-field--below-table">
        <CookingStepsEditor steps={editCookingSteps} onChange={setEditCookingSteps} disabled={isSaving || tagBusy} ko={language === 'ko'} />
      </div>}

      <IngredientSearchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onIngredientSelect={(ingredient) => handleAddIngredient(ingredient.id)}
        multiSelect
        countSelection
      />
      <IngredientSearchModal
        isOpen={isAddSideModalOpen}
        onClose={() => setIsAddSideModalOpen(false)}
        onIngredientSelect={(ingredient) => handleAddSideIngredient(ingredient.id)}
      />
      <IngredientSearchModal
        isOpen={replaceTargetIndex !== null}
        onClose={() => setReplaceTargetIndex(null)}
        onIngredientSelect={(ingredient) => handleReplaceIngredient(ingredient.id)}
        title={language === 'ko' ? '식재료 교체하기' : 'Replace Ingredient'}
        existingIngredientIds={new Set(
          (replaceSide ? editSideItems : editItems)
            .filter((_, i) => i !== replaceTargetIndex)
            .map((i) => i.ingredientId)
        )}
      />

      <Modal
        isOpen={showRecipePicker}
        onClose={() => { setShowRecipePicker(false); setRecipeSearch('') }}
        title={language === 'ko' ? '다른 레시피 불러오기' : 'Load another recipe'}
        actions={[
          { label: language === 'ko' ? '취소' : 'Cancel', variant: 'ghost', onClick: () => { setShowRecipePicker(false); setRecipeSearch('') } },
          { label: language === 'ko' ? `선택한 ${selectedRecipeIds.size}개 레시피의 재료 추가` : `Add ingredients from ${selectedRecipeIds.size} selected`, onClick: handleImportSelectedRecipes, disabled: selectedRecipeIds.size === 0 },
        ]}
      >
        <Input
          type="search"
          value={recipeSearch}
          onChange={event => setRecipeSearch(event.target.value)}
          placeholder={language === 'ko' ? '레시피 이름 검색' : 'Search recipes'}
          aria-label={language === 'ko' ? '레시피 이름 검색' : 'Search recipes'}
        />
        <ul className="add-recipe__recipe-list" style={{ maxHeight: '320px', overflowY: 'auto', margin: '0.5rem 0' }}>
          {availableRecipes.filter(item => `${item.nameKo} ${item.name}`.toLocaleLowerCase().includes(recipeSearch.trim().toLocaleLowerCase())).map(item => (
            <li key={item.id}>
              <label className="add-recipe__recipe-list-item">
                <input type="checkbox" checked={selectedRecipeIds.has(item.id)} onChange={() => setSelectedRecipeIds(current => {
                  const next = new Set(current)
                  if (next.has(item.id)) next.delete(item.id)
                  else next.add(item.id)
                  return next
                })} />
                {getRecipeDisplayName(item, language)}
              </label>
            </li>
          ))}
          {availableRecipes.filter(item => `${item.nameKo} ${item.name}`.toLocaleLowerCase().includes(recipeSearch.trim().toLocaleLowerCase())).length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">{language === 'ko' ? '검색 결과가 없습니다.' : 'No recipes found.'}</li>
          )}
        </ul>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} action={toast.action} onClose={closeToast} duration={toast.type === 'info' ? 0 : toast.action ? 8000 : 5000} />}
      <Modal
        isOpen={isGuestSaveModalOpen}
        onClose={() => setIsGuestSaveModalOpen(false)}
        message={language === 'ko'
          ? '로그인하지 않은 상태에서는 변경 사항이 저장되지 않습니다. 새로고침하면 원래대로 돌아갑니다.'
          : 'Changes are not saved unless you are logged in. Refreshing the page will revert them.'}
        actions={[{ label: language === 'ko' ? '확인' : 'OK', onClick: () => setIsGuestSaveModalOpen(false) }]}
      />

      <Modal
        isOpen={isRecommendedInfoOpen}
        onClose={() => setIsRecommendedInfoOpen(false)}
        message={language === 'ko' ? '30~40대 한국인 여성 기준입니다.' : 'Based on Korean women in their 30s–40s.'}
        actions={[{ label: language === 'ko' ? '닫기' : 'Close', onClick: () => setIsRecommendedInfoOpen(false) }]}
      />

      {!isCollapsed && isEditing && editTab === 'storage' && (
        <div className="recipe-ingredient-actions" role="group" aria-label={language === 'ko' ? '식재료 추가 및 불러오기' : 'Add and import ingredients'}>
<div className="edit-bottom-bar__left">
            <Button type="button" variant="outline" size="sm" onClick={handleOpenRecipePicker} disabled={loadingRecipeList || isSaving}>
              {loadingRecipeList ? (language === 'ko' ? '불러오는 중…' : 'Loading…') : (language === 'ko' ? '다른 레시피 불러오기' : 'Load another recipe')}
            </Button>
          </div>
          <div className="edit-bottom-bar__add">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddSideModalOpen(true)}>
              + {language === 'ko' ? '부재료 추가' : 'Add side ingredient'}
            </Button>
            <Button type="button" size="sm" onClick={() => setIsAddModalOpen(true)}>
              + {language === 'ko' ? '주재료 추가' : 'Add main ingredient'}
            </Button>
          </div>
          
        </div>
      )}

      {!isCollapsed && (!isEditing || editTab === 'storage') && (isEditing || activeRecipe.memo) && (
        <div className={isEditing ? 'recipe-tab-text-field recipe-tab-text-field--below-table' : 'recipe-memo'}>
          {isEditing ? (
            <>
            <label className="edit-inline__link-label" htmlFor={`recipe-memo-${recipe.id}`}>{language === 'ko' ? '메모' : 'Notes'}</label>
            <Textarea
              id={`recipe-memo-${recipe.id}`}
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
              placeholder="메모를 입력하세요..."
              rows={7}
              disabled={isSaving || tagBusy}
            />
            </>
          ) : (
            <p className="recipe-memo__text">{activeRecipe.memo}</p>
          )}
        </div>
      )}

      {!isCollapsed && isEditing && (
        <div className="edit-bottom-bar">

          <div className="edit-bottom-bar__actions">
            {isAdmin && onDeleteRecipe && <Button type="button" variant="destructive" size="sm" disabled={isSaving || tagBusy} onClick={() => {
              const message = language === 'ko'
                ? `'${getRecipeDisplayName(activeRecipe, language)}' 레시피를 삭제하시겠습니까?\n삭제된 레시피는 복구할 수 없습니다.`
                : `Delete '${getRecipeDisplayName(activeRecipe, language)}'?\nThis action cannot be undone.`
              if (window.confirm(message)) void onDeleteRecipe(activeRecipe.id)
            }}>{language === 'ko' ? '삭제' : 'Delete'}</Button>}
            <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isSaving || tagBusy}>
              {language === 'ko' ? '취소' : 'Cancel'}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || tagBusy}>
              {isSaving ? (language === 'ko' ? '저장 중...' : 'Saving...') : (language === 'ko' ? '저장' : 'Save')}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
