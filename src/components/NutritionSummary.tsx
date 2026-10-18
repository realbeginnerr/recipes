import { formatTableNumber } from '../utils/numberFormatting'
import { useLanguage } from '../context/LanguageContext'
import { macroRatio } from '../utils/recipeNutrition'
import './NutritionSummary.css'

export function NutritionSummary({ carbs, protein, fat, perMeal = false, showRatio = true }: { carbs: number; protein: number; fat: number; perMeal?: boolean; showRatio?: boolean }) {
  const { language } = useLanguage()
  return <div className="catalog-card-summary">
    <span>{perMeal && (language === 'ko' ? '한 끼 ' : 'Per meal ')}<strong>{formatTableNumber(carbs * 4 + protein * 4 + fat * 9)} kcal</strong></span>
    {showRatio && <><span className="nutrition-summary-dot" aria-hidden="true" />
    <span>{language === 'ko' ? '탄단지 ' : 'C:P:F '}<strong>{macroRatio(carbs, protein, fat)}</strong></span></>}
  </div>
}
