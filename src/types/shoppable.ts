export type RecipeImage = { id: string; url: string }
export type RecipeProductTag = { id: string; imageId: string; productId: string; positionX: number; positionY: number }
export type TaggedProduct = {
  id: string
  productName: string
  category?: '그릇' | '수저' | '매트' | '기타'
  brandName?: string
  thumbnailUrl: string
  productUrl: string
  price?: number
  deleted: boolean
  updatedAt: number
}
