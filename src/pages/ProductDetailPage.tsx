import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAdmin } from '../context/AdminContext'
import { useAddPageAccess } from '../components/AddPageAccessProvider'
import { loadProduct, loadPublicShopSettings } from '../services/productService'
import type { Product, ShopSettings } from '../types/product'
import { ProductPreview } from '../components/product/ProductPreview'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { Button } from '../components/ui/button'
import './ProductAdmin.css'

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const { isAdmin, authReady } = useAdmin()
  const { requestAccess } = useAddPageAccess()
  const [product, setProduct] = useState<Product | null>(null)
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!product) return
    const previousTitle = document.title
    document.title = `${product.seo.title || product.name} · 차한잔`
    const existing = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const meta = existing ?? document.createElement('meta')
    const previousDescription = existing?.content ?? ''
    meta.name = 'description'; meta.content = product.seo.description || product.summary
    if (!existing) document.head.append(meta)
    return () => { document.title = previousTitle; if (existing) meta.content = previousDescription; else meta.remove() }
  }, [product])
  useEffect(() => {
    if (!authReady) return
    let cancelled = false
    setLoading(true); setError(false)
    void (async () => {
      try {
        let id = slug
        const mapping = await getDoc(doc(db, 'productSlugs', encodeURIComponent(slug.toUpperCase()))).catch(() => null)
        if (mapping?.exists()) id = mapping.data().productId
        const result = await loadProduct(id, isAdmin)
        const common = await loadPublicShopSettings()
        if (cancelled) return
        const next = result?.product ?? null
        const now = Date.now()
        const visible = next && !next.draft && next.visibility !== 'private' && next.publicAfter <= now && next.publicUntil >= now
        setProduct(isAdmin || visible ? next : null); setSettings(common)
      } catch { if (!cancelled) setError(true) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [slug, isAdmin, authReady, attempt])
  if (loading) return <LoadingState label="상품을 불러오고 있어요." />
  if (!product) return <ContentState error={error} title={error ? '상품을 불러오지 못했어요.' : '현재 공개된 상품을 찾을 수 없어요.'}>{error && <Button onClick={() => setAttempt(value => value + 1)}>다시 시도</Button>}<Link to="/blending-tea">차한잔으로 돌아가기</Link></ContentState>
  return <div className="product-admin product-detail-page">{isAdmin && (product.draft || product.visibility !== 'public') && <div className="product-notice">관리자 미리보기 · {product.draft ? '임시 저장' : product.visibility === 'scheduled' ? '예약 공개' : '비공개'}</div>}<ProductPreview product={product} settings={settings} mediaFooter={isAdmin && <Button variant="link" className="product-detail-edit" onClick={() => requestAccess(`/products/${product.id}/edit`)}>상품 수정</Button>} /></div>
}
