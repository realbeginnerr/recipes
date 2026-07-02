export type Ingredient = {
  id: string
  name: string
  nameKo?: string
  baseUnit: string
  baseAmount: number
  carbs: number
  protein: number
  fat: number
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
  memo?: string
  tasteRating?: number
  timeRating?: number
}

export type RecipeRowState = {
  ingredientId: string
  amount: number
  unit: string
}
