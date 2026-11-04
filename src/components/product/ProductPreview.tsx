import { useUiLanguage } from '../../context/LanguageContext'
import { translateContent } from '../../i18n/content'
import { useUiCopy } from '../../context/LanguageContext'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CatalogTags } from '../catalog/CatalogTags'
import { getTeaTags, teaCategoryEnglish } from '../../utils/teaCategory'
import type { Product, ShopSettings } from '../../types/product'
import { sanitizeProductHtml } from '../../utils/product'

export function ProductPreview({ product, mediaFooter }: { product: Product; settings: ShopSettings | null; mediaFooter?: ReactNode }) {
  const copy = useUiCopy()
  const language = useUiLanguage()
  const description = sanitizeProductHtml(translateContent(product.description, language))
  const body = new DOMParser().parseFromString(description, 'text/html')
  const inlineImages = new Set(Array.from(body.querySelectorAll('img'), image => image.getAttribute('src')))
  const photos = product.images.filter(image => !inlineImages.has(image.url))
  return <article className="shop-journal">
    <header className="shop-journal-header">
      <Link className="shop-journal-back" to="/blending-tea">← Shop</Link>
      <CatalogTags tags={getTeaTags(product).map(tag => ({ key: tag, label: language === 'ko' ? tag : teaCategoryEnglish[tag] }))} />
      <h1>{translateContent(product.name, language) || copy("제목 없는 글")}</h1>
      {product.summary && <p className="shop-journal-summary">{translateContent(product.summary, language)}</p>}
    </header>
    {photos[0] && <figure className="shop-journal-cover"><img src={photos[0].url} alt={translateContent(photos[0].alt || product.name, language)} /></figure>}
    {mediaFooter}
    {description && <div className="shop-journal-content" dangerouslySetInnerHTML={{ __html: description }} />}
    {photos.slice(1).map(image => <figure className="shop-journal-photo" key={image.id}><img src={image.url} alt={translateContent(image.alt || product.name, language)} loading="lazy" />{image.alt && <figcaption>{translateContent(image.alt, language)}</figcaption>}</figure>)}
    <footer className="shop-journal-footer"><Link to="/blending-tea">{copy("목록으로 돌아가기")}</Link></footer>
  </article>
}
