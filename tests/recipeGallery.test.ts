import { describe, expect, it } from 'vitest'
import { recipeGalleryImages, reconcileRecipeGallery } from '../src/utils/recipeGallery'

const base = { id: 'recipe', nameKo: 'test', imageUrl: 'https://example.com/a.jpg', imageUrls: ['https://example.com/b.jpg'] }
describe('recipe gallery identity and tag references', () => {
  it('gives legacy photos stable IDs without changing old fields', () => {
    expect(recipeGalleryImages(base)).toEqual(recipeGalleryImages({ ...base }))
    expect(recipeGalleryImages(base)).toHaveLength(2)
  })
  it('preserves identity and tags when the cover order changes', () => {
    const images = [{ id: 'a', url: base.imageUrl }, { id: 'b', url: base.imageUrls[0] }]
    const tag = { id: 'tag', imageId: 'a', productId: 'shared-product', positionX: 25, positionY: 75 }
    const result = reconcileRecipeGallery({ ...base, imageUrl: images[1].url, imageUrls: [images[0].url], images, productTags: [tag] })
    expect(result.images.map(image => image.id)).toEqual(['b', 'a'])
    expect(result.productTags).toEqual([tag])
  })
  it('removes tags when their photo is replaced or deleted', () => {
    const images = [{ id: 'a', url: base.imageUrl }]
    const tag = { id: 'tag', imageId: 'a', productId: 'shared-product', positionX: 0, positionY: 100 }
    expect(reconcileRecipeGallery({ ...base, imageUrl: 'https://example.com/new.jpg', images, productTags: [tag] }).productTags).toEqual([])
    expect(reconcileRecipeGallery({ ...base, imageUrl: '', imageUrls: [], images, productTags: [tag] }).productTags).toEqual([])
  })
  it('retains shared product references and rejects invalid coordinates', () => {
    const images = [{ id: 'a', url: base.imageUrl }]
    const tag = { id: 'tag', imageId: 'a', productId: 'shared-product', positionX: 0, positionY: 100 }
    expect(reconcileRecipeGallery({ ...base, images, productTags: [tag, { ...tag, id: 'bad', positionX: 101 }] }).productTags).toEqual([tag])
  })
})
