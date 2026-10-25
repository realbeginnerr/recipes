import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CatalogTags } from '../catalog/CatalogTags'
import { getTeaTags } from '../../utils/teaCategory'
import type { Product, ShopSettings } from '../../types/product'
import { sanitizeProductHtml } from '../../utils/product'

export function ProductPreview({ product, mediaFooter }: { product: Product; settings: ShopSettings | null; mediaFooter?: ReactNode }) {
  const description = sanitizeProductHtml(product.description)
  const body = new DOMParser().parseFromString(description, 'text/html')
  const inlineImages = new Set(Array.from(body.querySelectorAll('img'), image => image.getAttribute('src')))
  const photos = product.images.filter(image => !inlineImages.has(image.url))
  return <article className="shop-journal">
    <header className="shop-journal-header">
      <Link className="shop-journal-back" to="/blending-tea">← Shop</Link>
      <CatalogTags tags={getTeaTags(product).map(tag => ({ key: tag, label: tag }))} />
      <h1>{product.name || '제목 없는 글'}</h1>
      {product.summary && <p className="shop-journal-summary">{product.summary}</p>}
    </header>
    {photos[0] && <figure className="shop-journal-cover"><img src={photos[0].url} alt={photos[0].alt || product.name} /></figure>}
    {mediaFooter}
    {description && <div className="shop-journal-content" dangerouslySetInnerHTML={{ __html: description }} />}
    {photos.slice(1).map(image => <figure className="shop-journal-photo" key={image.id}><img src={image.url} alt={image.alt || product.name} loading="lazy" />{image.alt && <figcaption>{image.alt}</figcaption>}</figure>)}
    <footer className="shop-journal-footer"><Link to="/blending-tea">목록으로 돌아가기</Link></footer>
  </article>
}