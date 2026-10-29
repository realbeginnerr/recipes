import { useEffect, useState } from 'react'
import { Plus, ExternalLink } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from '../ui/popover'
import { loadTaggedProduct } from '../../services/taggedProductService'
import type { RecipeImage, RecipeProductTag, TaggedProduct } from '../../types/shoppable'
import './ShoppableImage.css'
import { FoodImage } from '../FoodImage'

export function safeProductUrl(value: string) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}
export function ProductPhoto({ product }: { product: TaggedProduct }) {
  return <FoodImage className="shoppable-product-photo" src={safeProductUrl(product.thumbnailUrl) ? product.thumbnailUrl : undefined} alt="" />
}

export function squareTagPosition(x: number, y: number, ratio: number) {
  return { x: (x - 50) * Math.max(ratio, 1) + 50, y: (y - 50) * Math.max(1 / ratio, 1) + 50 }
}

export function ShoppableImage({ image, tags, alt, ko, onImageClick, square = false }: { image: RecipeImage; tags: RecipeProductTag[]; alt: string; ko: boolean; onImageClick?: () => void; square?: boolean }) {
  const [products, setProducts] = useState<Record<string, TaggedProduct>>({})
  const [active, setActive] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [ratio, setRatio] = useState(1)
  const ids = [...new Set(tags.filter(tag => tag.imageId === image.id).map(tag => tag.productId))].sort().join('\n')
  useEffect(() => {
    let cancelled = false
    setProducts({}); setActive(null)
    void Promise.all(ids ? ids.split('\n').map(async id => {
      try { return await loadTaggedProduct(id) } catch { return null }
    }) : []).then(results => { if (!cancelled) setProducts(Object.fromEntries(results.filter((product): product is TaggedProduct => !!product).map(product => [product.id, product]))) })
    return () => { cancelled = true }
  }, [image.id, ids])
  useEffect(() => { setFailed(false); setActive(null) }, [image.url])
  const visible = tags.filter(tag => tag.imageId === image.id && products[tag.productId] && safeProductUrl(products[tag.productId].productUrl) && [tag.positionX, tag.positionY].every(value => Number.isFinite(value) && value >= 0 && value <= 100))
  return <div className={`shoppable-image${square ? ' shoppable-image--square' : ''}`} onLoad={event => {
    const element = event.target
    if (element instanceof HTMLImageElement && element.getAttribute('src') === image.url && element.naturalWidth && element.naturalHeight) setRatio(element.naturalWidth / element.naturalHeight)
  }}>
    {onImageClick ? <button type="button" className="shoppable-image-open" onClick={onImageClick} aria-label={ko ? `${alt} 이미지 크게 보기` : `Enlarge ${alt} image`}><FoodImage src={image.url} alt={alt} onError={() => setFailed(true)} /></button> : <FoodImage src={image.url} alt={alt} onError={() => setFailed(true)} />}
    {failed && <span className="shoppable-image-error">{ko ? '이미지를 불러오지 못했어요.' : 'Image unavailable.'}</span>}
    {!failed && visible.map(tag => {
      const product = products[tag.productId]
      const position = square ? squareTagPosition(tag.positionX, tag.positionY, ratio) : { x: tag.positionX, y: tag.positionY }
      if (position.x < 0 || position.x > 100 || position.y < 0 || position.y > 100) return null
      return <Popover key={tag.id} open={active === tag.id} onOpenChange={open => setActive(current => open ? tag.id : current === tag.id ? null : current)}>
        <PopoverTrigger className="shoppable-tag" style={{ left: `${position.x}%`, top: `${position.y}%` }} openOnHover delay={100} closeDelay={250} aria-label={ko ? `${product.productName} 상품 정보` : `Product information: ${product.productName}`}><Plus size={18} aria-hidden="true" /></PopoverTrigger>
        <PopoverContent className="shoppable-popover" positionerClassName="shoppable-positioner" sideOffset={6} initialFocus={interaction => interaction === 'keyboard' ? true : false}>
          <a className="shoppable-product-link" href={product.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${product.productName} (${ko ? '새 탭에서 구매 페이지 열기' : 'open purchase page in new tab'})`}>
            <ProductPhoto key={product.thumbnailUrl} product={product} />
            <span className="shoppable-product-copy"><PopoverTitle>{product.productName}</PopoverTitle>{product.brandName && <span>{product.brandName}</span>}{typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 && <strong>{product.price.toLocaleString(ko ? 'ko-KR' : 'en-US')}원</strong>}</span>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </PopoverContent>
      </Popover>
    })}
  </div>
}
