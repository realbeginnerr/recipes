import type { Recipe } from '../types'

const base = import.meta.env.BASE_URL

// These recipe cards intentionally use the empty-image placeholder.
const placeholderRecipes = new Set([
  '푸팟퐁 커리', '얼그레이 스콘', '고추장 오이 무침', '단호박 스프',
  '오이 들깨 무침', '두부 꽈리고추 볶음', '과일 찹쌀떡', '깻잎전 덮밥',
  '밤식빵', '탕수육', '맥앤치즈', '무전', '단팥빵', '닭갈비', '쫄면',
  '피자', '멸치볶음', '가지볶음', '버섯 토스트', '감자탕',
].map(name => name.replace(/\s+/g, '')))

const localImageMap: Record<string, string> = {
  '버섯 토스트': `${base}images/버섯 토스트.png`,
  '고추바사삭': `${base}images/ingredients/고추바사삭.jpg`,
  '칠리콘카르네': `${base}images/ingredients/칠리콘카르네.jpg`,
}

export function resolveRecipeImage(recipe: Recipe): string {
  if (!recipe.productId && placeholderRecipes.has(recipe.nameKo.replace(/\s+/g, ''))) return ''
  if (recipe.imageUrl) return recipe.imageUrl
  if (recipe.imageUrls !== undefined) return recipe.imageUrls.find(url => url.trim()) ?? ''
  return localImageMap[recipe.nameKo] ?? ''
}
