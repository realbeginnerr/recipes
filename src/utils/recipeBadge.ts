import { isRefinedCarb, isAddedSugarIngredient } from '../data/refinedCarbs'
import { ingredientById } from '../data/ingredients'
import { amountToGrams, calculateMacros } from './nutrition'
import type { Recipe } from '../types'

const MULTIGRAIN_ID = '__multigrain_rice__'
const ADDED_SUGAR_LIMIT_PER_MEAL = 8 // WHO: <25g/일 → ~8g/끼니
const REC = { carbs: 75, protein: 33, fat: 22 }

const FIBER_KEYWORDS = [
  '가지', '시금치', '브로콜리', '양파', '대파', '깻잎', '상추', '배추', '무',
  '당근', '고추', '파프리카', '버섯', '오이', '토마토', '호박', '아욱',
  '콩나물', '숙주', '고구마', '감자', '현미', '통밀', '잡곡', '귀리', '보리',
  '퀴노아', '깨', '들깨', '케일', '양배추', '청경채', '냉이', '미나리',
  '쑥갓', '열무', '부추', '취나물', '고사리', '도라지', '더덕',
  '두부', '콩', '렌틸', '팥', '병아리콩', '강낭콩',
]

const PROTEIN_FAT_KEYWORDS = [
  '닭', '돼지', '소고기', '쇠고기', '참치', '연어', '고등어', '멸치', '새우',
  '오징어', '조개', '바지락', '홍합', '가자미', '갈치', '꽁치', '대구',
  '계란', '달걀', '두부', '콩', '렌틸', '병아리콩',
  '견과', '호두', '아몬드', '땅콩', '캐슈', '피스타치오', '마카다미아',
  '치즈', '요거트', '단백질파우더',
]

function matchesKeywords(nameKo: string, keywords: string[]): boolean {
  return keywords.some((kw) => nameKo.includes(kw))
}

function sugarRatio(nameKo: string): number {
  if (nameKo.includes('맛술')) return 0.15
  if (nameKo.includes('물엿') || nameKo.includes('조청')) return 0.75
  if (nameKo.includes('시럽') || nameKo.includes('올리고당') || nameKo.includes('액상과당')) return 0.50
  return 0.85
}

export type WarningReason = 'refined_carb' | 'added_sugar'
export type HealthyReason = 'fiber' | 'protein_fat'

export interface TaggedIngredient {
  nameKo: string
  reason: WarningReason | HealthyReason
}

export type BadgeLevel = 'good' | 'moderate' | 'caution'

export interface MacroIssue {
  nutrient: 'carbs' | 'protein' | 'fat'
  direction: 'over' | 'under'
  value: number
  target: number
}

export interface RecipeBadgeResult {
  level: BadgeLevel
  addedSugarPerMeal: number
  addedSugarItems: TaggedIngredient[]
  refinedCarbItems: TaggedIngredient[]
  healthyItems: TaggedIngredient[]
  macrosPerMeal: { carbs: number; protein: number; fat: number }
  macroIssues: MacroIssue[]
}

export function getRecipeBadge(recipe: Recipe): RecipeBadgeResult {
  const division = recipe.divisionCount ?? 3
  const addedSugarItems: TaggedIngredient[] = []
  const refinedCarbItems: TaggedIngredient[] = []
  const healthyItems: TaggedIngredient[] = []
  let totalAddedSugarG = 0
  let totalCarbs = 0, totalProtein = 0, totalFat = 0

  const allItems = [...(recipe.items ?? []), ...(recipe.sideItems ?? [])]

  for (const item of allItems) {
    if (item.ingredientId === MULTIGRAIN_ID) {
      const g = item.defaultUnit === 'oz' ? item.defaultAmount * 28.3495 : item.defaultAmount
      totalCarbs += (g * 28.5) / 100
      totalProtein += (g * 3.1) / 100
      totalFat += (g * 0.8) / 100
      healthyItems.push({ nameKo: '잡곡밥', reason: 'fiber' })
      continue
    }
    const ing = ingredientById.get(item.ingredientId)
    if (!ing) continue
    const nameKo = ing.nameKo ?? ing.name
    const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ing.conversions)
    const m = calculateMacros(grams, ing)
    totalCarbs += m.carbs
    totalProtein += m.protein
    totalFat += m.fat

    if (isAddedSugarIngredient(nameKo)) {
      totalAddedSugarG += grams * sugarRatio(nameKo)
      addedSugarItems.push({ nameKo, reason: 'added_sugar' })
    } else if (isRefinedCarb(nameKo, ing.name, ing.isRefinedCarb)) {
      refinedCarbItems.push({ nameKo, reason: 'refined_carb' })
    } else if (matchesKeywords(nameKo, FIBER_KEYWORDS)) {
      healthyItems.push({ nameKo, reason: 'fiber' })
    } else if (matchesKeywords(nameKo, PROTEIN_FAT_KEYWORDS)) {
      healthyItems.push({ nameKo, reason: 'protein_fat' })
    }
  }

  const addedSugarPerMeal = totalAddedSugarG / division
  const macrosPerMeal = {
    carbs: totalCarbs / division,
    protein: totalProtein / division,
    fat: totalFat / division,
  }

  // 탄·단·지 이슈 (diff > 10g → significant)
  const macroIssues: MacroIssue[] = []
  const THRESHOLD = 10
  if (macrosPerMeal.carbs > REC.carbs + THRESHOLD) macroIssues.push({ nutrient: 'carbs', direction: 'over', value: macrosPerMeal.carbs, target: REC.carbs })
  else if (macrosPerMeal.carbs < REC.carbs - THRESHOLD) macroIssues.push({ nutrient: 'carbs', direction: 'under', value: macrosPerMeal.carbs, target: REC.carbs })
  if (macrosPerMeal.protein > REC.protein + THRESHOLD) macroIssues.push({ nutrient: 'protein', direction: 'over', value: macrosPerMeal.protein, target: REC.protein })
  else if (macrosPerMeal.protein < REC.protein - THRESHOLD) macroIssues.push({ nutrient: 'protein', direction: 'under', value: macrosPerMeal.protein, target: REC.protein })
  if (macrosPerMeal.fat > REC.fat + THRESHOLD) macroIssues.push({ nutrient: 'fat', direction: 'over', value: macrosPerMeal.fat, target: REC.fat })
  else if (macrosPerMeal.fat < REC.fat - THRESHOLD) macroIssues.push({ nutrient: 'fat', direction: 'under', value: macrosPerMeal.fat, target: REC.fat })

  // 뱃지 레벨
  const refinedCarbCount = refinedCarbItems.length
  let level: BadgeLevel
  if (addedSugarPerMeal >= ADDED_SUGAR_LIMIT_PER_MEAL || (refinedCarbCount >= 2 && addedSugarPerMeal >= ADDED_SUGAR_LIMIT_PER_MEAL / 2)) {
    level = 'caution'
  } else if (addedSugarPerMeal > 0 || refinedCarbCount >= 1) {
    level = 'moderate'
  } else {
    level = 'good'
  }

  return { level, addedSugarPerMeal, addedSugarItems, refinedCarbItems, healthyItems, macrosPerMeal, macroIssues }
}
