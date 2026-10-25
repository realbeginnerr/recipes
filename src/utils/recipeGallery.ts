import type { RecipeImage, RecipeProductTag } from '../types/shoppable'
import { resolveRecipeImage } from './recipeImage'
import type { Recipe } from '../types'

type Gallery = Pick<Recipe, 'id' | 'nameKo' | 'imageUrl' | 'imageUrls' | 'images' | 'productTags'>

// Legacy URLs receive deterministic IDs until the recipe is next saved.
export function recipeGalleryImages(recipe: Gallery): RecipeImage[] {
  const urls = [...new Set([resolveRecipeImage(recipe as Recipe), ...(recipe.imageUrls ?? [])].map(url => url.trim()).filter(Boolean))].slice(0, 5)
  return urls.map(url => ({ id: recipe.images?.find(image => image.url === url)?.id || `legacy:${encodeURIComponent(url)}`, url }))
}

export function reconcileRecipeGallery(recipe: Gallery, previousImages: RecipeImage[] = recipe.images ?? []) {
  const images = recipeGalleryImages({ ...recipe, images: previousImages })
  const ids = new Set(images.map(image => image.id))
  const seen = new Set<string>()
  const productTags: RecipeProductTag[] = (recipe.productTags ?? []).filter(tag => {
    if (!tag.id || seen.has(tag.id) || !tag.productId || !ids.has(tag.imageId)) return false
    if (![tag.positionX, tag.positionY].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) return false
    seen.add(tag.id)
    return true
  })
  return { images, productTags }
}
