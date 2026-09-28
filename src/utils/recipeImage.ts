import type { Recipe } from '../types'

const base = import.meta.env.BASE_URL

const localImageMap: Record<string, string> = {
  '닭갈비': `${base}images/닭갈비.png`,
  '쫄면': `${base}images/쫄면.png`,
  '피자': `${base}images/홈메이드피자.jpg`,
  '멸치볶음': `${base}images/멸치볶음.jpeg`,
  '가지볶음': `${base}images/가지볶음.jpg`,
  '가지볶음, 멸치볶음': `${base}images/가지볶음.jpg`,
  '버섯 토스트': `${base}images/버섯 토스트.png`,
  '감자탕': `${base}images/감자탕.jpg`,
  '고추바사삭': `${base}images/고추바사삭.jpg`,
  '칠리콘카르네': `${base}images/칠리콘카르네.jpg`,
  '단팥빵': `${base}images/단팥빵.jpg`,
}

export function resolveRecipeImage(recipe: Recipe): string {
  if (recipe.imageUrl) return recipe.imageUrl
  return localImageMap[recipe.nameKo] ?? ''
}
