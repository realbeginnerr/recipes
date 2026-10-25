import { useEffect, useState } from 'react'
import { loadTaggedProduct } from '../../services/taggedProductService'
import type { RecipeProductTag, TaggedProduct } from '../../types/shoppable'
import { ProductPhoto, safeProductUrl } from './ShoppableImage'

export function RelatedImageProducts({ imageId, tags, ko }: { imageId: string; tags: RecipeProductTag[]; ko: boolean }) {
  const [products, setProducts] = useState<TaggedProduct[]>([])
  const ids = [...new Set(tags.filter(tag => tag.imageId === imageId && [tag.positionX, tag.positionY].every(value => Number.isFinite(value) && value >= 0 && value <= 100)).map(tag => tag.productId))].join('\n')
  useEffect(() => {
    let cancelled = false
    setProducts([])
    void Promise.all(ids ? ids.split('\n').map(async id => {
      try { return await loadTaggedProduct(id) } catch { return null }
    }) : []).then(result => { if (!cancelled) setProducts(result.filter((product): product is TaggedProduct => !!product && !product.deleted && safeProductUrl(product.productUrl))) })
    return () => { cancelled = true }
  }, [imageId, ids])
  if (!products.length) return null
  return <section className="related-image-products" aria-label={ko ? '사진 속 상품' : 'Products in this photo'}>
    <p className="related-image-products-title">{ko ? '사진 속 상품' : 'Products in this photo'}</p>
    <ul>{products.map(product => <li key={product.id}><a href={product.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${product.productName} (${ko ? '새 탭에서 구매 페이지 열기' : 'open purchase page in new tab'})`}><ProductPhoto product={product} /><span>{product.productName}</span></a></li>)}</ul>
  </section>
}
