import type { Recipe } from '../types'

export const recipeCategories = ['전체', '한식', '일식', '중식', '양식', '베이커리', '간식', '반찬', '음료', '기타'] as const
export type RecipeCategory = typeof recipeCategories[number]
export const categoryEnglish: Record<RecipeCategory, string> = {
  전체: 'All', 한식: 'Korean', 일식: 'Japanese', 중식: 'Chinese', 양식: 'Western', 베이커리: 'Bakery', 간식: 'Snacks', 반찬: 'Side dishes', 음료: 'Drinks', 기타: 'Other',
}
const knownCategories: Record<string, RecipeCategory[]> = {
  '닭갈비': ['한식'], '쫄면': ['한식'], '멸치볶음': ['한식', '반찬'], '가지볶음': ['한식', '반찬'],
  '가지볶음, 멸치볶음': ['한식'], '감자탕': ['한식'], '고추바사삭': ['한식'],
  '피자': ['양식'], '버섯 토스트': ['양식'], '칠리콘카르네': ['양식'],
  '단팥빵': ['베이커리', '간식'],
}
export function getRecipeCategories(recipe: Pick<Recipe, 'nameKo' | 'categories'>): RecipeCategory[] {
  if (Array.isArray(recipe.categories)) {
    const categories = [...new Set(recipe.categories.filter(category => category !== '전체' && recipeCategories.includes(category)))]
    if (categories.length) return categories
  }
  return knownCategories[recipe.nameKo.trim()] ?? ['기타']
}
