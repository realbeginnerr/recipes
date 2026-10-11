import type { RecipeCategory } from './utils/recipeCategory'
import type { TeaTag } from './utils/teaCategory'
import type { Product } from './types/product'

export type Ingredient = {
  id: string
  name: string
  nameKo?: string
  baseUnit: string
  baseAmount: number
  carbs: number
  protein: number
  fat: number
  addedSugar?: number
  isRefinedCarb?: boolean
  conversions: Record<string, number>
  allowedUnits: string[]
}

export type RecipeItem = {
  ingredientId: string
  defaultAmount: number
  defaultUnit: string
}

export type Recipe = {
  catalog?: 'tea'
  productId?: string
  productDescription?: string
  productPricing?: Product['pricing']
  catalogOrder?: number
  sourceRecipeId?: string
  teaTags?: TeaTag[]
  categories?: RecipeCategory[]
  id: string
  name: string
  nameKo: string
  imageUrl: string
  imageUrls?: string[]
  items: RecipeItem[]
  sideItems?: RecipeItem[]
  memo?: string
  tasteRating?: number
  timeRating?: number
  divisionCount?: number
  createdAt?: number
  link?: string
  hidden?: boolean
}

export type RecipeRowState = {
  ingredientId: string
  amount: number
  unit: string
}
