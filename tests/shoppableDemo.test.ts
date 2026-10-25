import { describe, expect, it } from 'vitest'
import { demoRecipe, demoProducts } from '../src/dev/shoppableDemo'
import { recipeGalleryImages } from '../src/utils/recipeGallery'
describe('isolated shoppable demo fixture', () => {
  it('covers per-image markers, untagged photo, image edges and shared products', () => {
    const photos = recipeGalleryImages(demoRecipe)
    expect(photos).toHaveLength(3)
    expect(photos.map(image => demoRecipe.productTags!.filter(tag => tag.imageId === image.id).length)).toEqual([3, 1, 0])
    expect(demoRecipe.productTags!.some(tag => tag.positionX === 1)).toBe(true)
    expect(demoRecipe.productTags!.some(tag => tag.positionX === 99)).toBe(true)
    for (const tag of demoRecipe.productTags!) expect(demoProducts[tag.productId].productUrl.startsWith('https://example.com/')).toBe(true)
  })
})
