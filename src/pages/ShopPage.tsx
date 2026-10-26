import { CatalogTags } from '../components/catalog/CatalogTags'
import { useEffect, useMemo, useState } from 'react'
import { PageIntro, CatalogToolbar, CategoryFilter, SearchField, SortSelect } from '../components/catalog/CatalogControls'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { Button } from '../components/ui/button'
import { ProductPhoto, safeProductUrl } from '../components/recipe/ShoppableImage'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { useAddPageAccess } from '../components/AddPageAccessProvider'
import { searchTaggedProducts } from '../services/taggedProductService'
import type { TaggedProduct } from '../types/shoppable'
import './RecipePage.css'
import './ShopPage.css'

const categories = ['전체', '그릇', '수저', '매트', '기타'] as const
export function ShopPage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const { requestAccess } = useAddPageAccess()
  const ko = language === 'ko'
  const [products, setProducts] = useState<TaggedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<typeof categories[number]>('전체')
  const [sort, setSort] = useState('date-desc')
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(false)
    void searchTaggedProducts().then(items => { if (!cancelled) setProducts(items.filter(item => !item.deleted && safeProductUrl(item.productUrl))) }).catch(() => { if (!cancelled) setError(true) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])
  const visible = useMemo(() => products.filter(product => category === '전체' || (product.category ?? '기타') === category)
    .filter(product => `${product.productName} ${product.brandName ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => sort.startsWith('alpha') ? a.productName.localeCompare(b.productName, language) * (sort === 'alpha-asc' ? 1 : -1) : (a.updatedAt - b.updatedAt) * (sort === 'date-asc' ? 1 : -1)), [products, category, search, sort, language])
  return <section className="recipe-catalog recipe-list-catalog" lang={language}>
    <PageIntro title="나중에 사려고 찜해둔 것들" description="" backgroundImage={`${import.meta.env.BASE_URL}images/service/tea-header.png`} />
    <CatalogToolbar>
      <CategoryFilter label={ko ? '상품 분류' : 'Product categories'} value={category} options={categories.map(value => ({ value, label: ko ? value : ({ 전체: 'All', 그릇: 'Tableware', 수저: 'Cutlery', 매트: 'Placemats', 기타: 'Other' })[value] }))} onValueChange={setCategory} />
      <SearchField label={ko ? '상품 검색' : 'Search products'} value={search} onValueChange={setSearch} />
      <SortSelect label={ko ? '상품 정렬' : 'Sort products'} value={sort} onValueChange={setSort} options={[{ value: 'date-desc', label: ko ? '최근 등록·수정순' : 'Recently updated' }, { value: 'date-asc', label: ko ? '오래된 등록·수정순' : 'Oldest updated' }, { value: 'alpha-asc', label: ko ? 'ㄱ→ㅎ' : 'A→Z' }, { value: 'alpha-desc', label: ko ? 'ㅎ→ㄱ' : 'Z→A' }]} />
    </CatalogToolbar>
    <div className="catalog-container catalog-results" aria-busy={loading}>
      {loading ? <LoadingState skeleton label={ko ? '상품을 불러오는 중' : 'Loading products'} /> : error ? <ContentState error title={ko ? '상품을 불러오지 못했어요.' : 'Unable to load products.'}><Button onClick={() => setAttempt(value => value + 1)}>{ko ? '다시 시도' : 'Retry'}</Button></ContentState> : <>
        <div className="catalog-count-row"><p className="catalog-count" role="status">{ko ? '상품' : 'Products'} <strong>{visible.length}{ko ? '개' : ''}</strong></p>{isAdmin && <Button onClick={() => requestAccess('/products/new')} variant="link" size="content" className="catalog-intro__subtle-action">{ko ? '상품 등록' : 'Add product'}</Button>}</div>
        {visible.length ? <div className="recipe-grid">{visible.map(product => <a key={product.id} className="recipe-card shop-tagged-card" href={product.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${product.productName} (${ko ? '새 탭에서 구매 페이지 열기' : 'open purchase page in new tab'})`}>
          <div className="recipe-card__image-wrap card-photo"><ProductPhoto product={product} /></div>
          <div className="recipe-card__footer"><h2 className="recipe-card__name">{product.productName}</h2><CatalogTags tags={[{ key: product.category ?? '기타', label: ko ? product.category ?? '기타' : ({ 그릇: 'Tableware', 수저: 'Cutlery', 매트: 'Placemats', 기타: 'Other' })[product.category ?? '기타'] }]} />{product.brandName && <p className="shop-tagged-brand">{product.brandName}</p>}{typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 && <p className="product-card-price"><strong>{product.price.toLocaleString(ko ? 'ko-KR' : 'en-US')}{ko ? '원' : ' KRW'}</strong></p>}</div>
        </a>)}</div> : <ContentState title={ko ? '조건에 맞는 상품이 없어요.' : 'No matching products.'}><Button onClick={() => { setCategory('전체'); setSearch('') }}>{ko ? '필터 초기화' : 'Reset filters'}</Button></ContentState>}
      </>}
    </div>
  </section>
}
