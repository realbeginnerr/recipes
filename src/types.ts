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
  id: string
  name: string
  nameKo: string
  imageUrl: string
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
