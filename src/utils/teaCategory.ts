import type { Recipe } from '../types'

export const teaCategories = ['전체', '홍차', '녹차', '과일차', '혼합차', '카페인', '무카페인', '에코백', '그릇', '수저', '매트', '기타'] as const
export type TeaCategory = typeof teaCategories[number]
export type TeaTag = Exclude<TeaCategory, '전체'>
export const teaCategoryEnglish: Record<TeaCategory, string> = {
  전체: 'All', 홍차: 'Black tea', 녹차: 'Green tea', 과일차: 'Fruit tea', 혼합차: 'Blended tea',
  카페인: 'Caffeinated', 무카페인: 'Caffeine-free',
  에코백: 'Tote bags', 그릇: 'Tableware', 수저: 'Cutlery', 매트: 'Placemats', 기타: 'Other',
}

// Legacy copied tea uses the general Shop category.
const knownTeaTags: Record<string, TeaTag[]> = {
  'tea-Tm2NJxtbz7kzRt2aJfxg': ['기타'],
}

export function getTeaTags(recipe: Pick<Recipe, 'id' | 'teaTags'>): TeaTag[] {
  if (Array.isArray(recipe.teaTags)) {
    return [...new Set(recipe.teaTags.filter(tag => teaCategories.some(category => category !== '전체' && category === tag)))]
  }
  return knownTeaTags[recipe.id] ?? []
}
