import type { ReactNode } from 'react'
import { CatalogTags } from '../catalog/CatalogTags'
import { getTeaTags } from '../../utils/teaCategory'
import { FulfillmentPolicyPreview } from './FulfillmentPolicyPreview'
import { isExternalProduct, isGroupBuyProduct } from '../../utils/product'
import { GROUP_PURCHASE_URL } from '../../constants/shop'
import { ProductPurchaseLink } from './ProductPurchaseLink'
import { Link } from 'react-router-dom'
import type { Product, ShopSettings } from '../../types/product'
import { discountedPrice, sanitizeProductHtml } from '../../utils/product'
import { effectivePolicies } from '../../utils/shopPolicy'
import { PolicyPreview } from './PolicyPreview'

export function ProductPreview({ product, settings, mediaFooter }: { product: Product; settings: ShopSettings | null; mediaFooter?: ReactNode }) {
  const isBlend = product.compositionType === 'blend' || product.teaTags.includes('혼합차')
  const price = discountedPrice(product)
  const purchaseUrl = product.purchaseUrl?.trim() ?? ''
  const components = product.blend?.components ?? []
  const waterMl = product.blend?.waterMl ?? 250
  const totalGrams = components.reduce((sum, item) => sum + (item.grams ?? 0), 0)
  return <div className="product-customer-preview">
    <section className="product-customer-overview" aria-label="상품 구매 정보">
    <div className="product-customer-media">{product.images[0] && <img src={product.images[0].url} alt={product.images[0].alt || product.name} />}{product.images.length > 1 && <div className="product-preview-gallery">{product.images.slice(1).map(image => <img key={image.id} src={image.url} alt={image.alt || product.name} />)}</div>}{mediaFooter}</div><div className="product-customer-body"><div className="product-customer-heading"><div><div className="product-title-tags"><h1>{product.name || '상품명'}</h1><CatalogTags tags={getTeaTags(product).map(tag => ({ key: tag, label: tag }))} /></div>{product.summary && <p>{product.summary}</p>}{isBlend && <p>전체 원재료 구매 비용</p>}<p className="product-customer-price">{price === null ? '가격 미정' : `${price.toLocaleString('en-US', { maximumFractionDigits: 1 })}원`}</p>{product.pricing.discount !== null && product.pricing.regular !== null && price !== product.pricing.regular && <del>{product.pricing.regular.toLocaleString('en-US', { maximumFractionDigits: 1 })}원</del>}{(isBlend || product.saleStatus !== 'active') && <p>{product.saleStatus === 'active' ? '공동구매 모집 중' : product.saleStatus === 'sold-out' ? '품절' : '판매 중지'}</p>}<ProductPurchaseLink disabled={price === null} href={isBlend ? GROUP_PURCHASE_URL : purchaseUrl} label={isBlend ? '공동 구매' : '구매하기'} />{product.optionsEnabled && <p>옵션: {product.options.map(option => `${option.name} (${option.values.join(', ')})`).join(' · ')}</p>}</div></div>

    </div></section>
    <section className="product-customer-information" aria-label="기본 정보">
    {product.compositionType === 'blend' && <section><h2>이 차의 구성</h2><p>{waterMl === 250 ? '아래 찻잎 양은 한 잔(물 250ml) 기준으로 작성했습니다.' : `한 잔의 물 양은 250ml입니다. 아래 찻잎 양은 등록된 물 ${waterMl.toLocaleString('en-US', { maximumFractionDigits: 1 })}ml 기준입니다.`}</p><p>총 배합량 {totalGrams.toLocaleString('en-US', { maximumFractionDigits: 1 })}g · 물 {product.blend?.waterMl?.toLocaleString('en-US', { maximumFractionDigits: 1 }) ?? '—'}ml</p><div className="product-blend-list">{components.map(item => <div key={item.productId} className="product-blend-row"><div className="product-blend-photo card-photo">{item.imageUrl && <img src={item.imageUrl} alt={item.name || ''} />}</div><div>{item.slug && !item.unavailable ? <Link to={`/product/${encodeURIComponent(item.slug)}`}>{item.name}</Link> : <span>{item.name || '구성 차'}</span>}<p>{item.grams === null || item.grams === undefined ? '—' : item.grams.toLocaleString('en-US', { maximumFractionDigits: 1 })}g · {totalGrams > 0 ? ((item.grams ?? 0) / totalGrams * 100).toFixed(1) : '0.0'}%</p>{item.unavailable && <p>현재 구성 상품을 확인할 수 없어요.</p>}</div></div>)}</div></section>}
    <section className="product-description"><h2>상품 상세 설명</h2>{product.description && <div dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(product.description) }} />}<h3>차 우리는 방법</h3><ul><li>물을 먼저 데운 뒤 재료를 넣고 불을 끈 상태에서 우려내면 됩니다.</li><li>재료를 넣고 계속 끓이는 것이 아닙니다.</li></ul></section>
    <section><h2>기본 정보</h2><dl className="product-disclosure">{[
      ['브랜드', product.brand], ['제조사', product.manufacturer], ['제조국', product.disclosure.country], ['식품 유형', product.disclosure.foodType], ['제조일자', product.disclosure.manufactureDate], ['소비기한', product.disclosure.expiryDate], ['원재료·성분', product.disclosure.material], ['내용량', product.disclosure.capacity], ['구성품', product.disclosure.contents], ['사용·보관 방법', product.disclosure.storage], ['주의사항', product.disclosure.precautions], ['알레르기', product.disclosure.allergens], ['영양정보', product.disclosure.nutrition], ['수입업체', product.disclosure.importer], ['GMO 표시', product.disclosure.gmo], ['인증·허가', product.disclosure.certification], ['고객 문의', product.disclosure.support], ['기타 고시', product.disclosure.additional],
    ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    </section>
    <section className="product-customer-policies" aria-label="배송 및 교환 안내">
    {isExternalProduct(product) || isGroupBuyProduct(product) ? <FulfillmentPolicyPreview product={product} /> : <PolicyPreview policies={effectivePolicies(product, settings)} />}
    </section>
  </div>
}
