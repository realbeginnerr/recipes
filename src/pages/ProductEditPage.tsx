import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { auth } from '../firebase'
import type { Product, ProductAdminData, ShopSettings } from '../types/product'
import type { ShopPolicies } from '../types/shopPolicy'
import { emptyProduct, generatedSku, generateVariants, priceSummary, productSlug, validateProduct, resolveBlend, isExternalProduct, isGroupBuyProduct, groupBuyPolicies } from '../utils/product'
import { effectivePolicies, validatePolicies } from '../utils/shopPolicy'
import { deleteProduct, loadProduct, loadProducts, loadShopSettings, newProductId, ProductSaveError, saveProduct } from '../services/productService'
import { getTeaTags, teaCategories, type TeaTag } from '../utils/teaCategory'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { Toast, useToast } from '../components/feedback/Toast'
import { FormSection, TextField, NumberField, SelectField, CheckField } from '../components/product/ProductFields'
import { ProductRichText } from '../components/product/ProductRichText'
import { ProductBlendFields } from '../components/product/ProductBlendFields'
import { ProductImages } from '../components/product/ProductImages'
import { ShippingPolicyFields, ExchangePolicyFields, RefundPolicyFields, ReturnAddressFields } from '../components/product/PolicyFields'
import { PolicyPreview } from '../components/product/PolicyPreview'
import { FulfillmentPolicyPreview } from '../components/product/FulfillmentPolicyPreview'
import { ProductPreview } from '../components/product/ProductPreview'
import { useUnsavedProduct } from '../hooks/useUnsavedProduct'
import './ProductAdmin.css'

const sectionLinks = [['blend', '차 구성'], ['basic', '기본 정보'], ['media', '이미지'], ['pricing', '가격'], ['options', '옵션'], ['inventory', '재고'], ['shipping', '배송'], ['exchange', '교환'], ['refund', '반품·환불'], ['disclosure', '상품 고시'], ['seo', 'SEO'], ['visibility', '판매·노출']]
const splitTags = (value: string) => [...new Set(value.split(',').map(tag => tag.trim()).filter(Boolean))]
export function ProductEditPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const copyId = searchParams.get('copy')
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product>(() => ({ ...emptyProduct(), id: id ?? newProductId() }))
  const [privateData, setPrivateData] = useState<ProductAdminData>({ cost: null })
  const [blendCatalog, setBlendCatalog] = useState<Product[]>([])
  const [blendError, setBlendError] = useState(false)
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [settingsError, setSettingsError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [baseline, setBaseline] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [policyPreview, setPolicyPreview] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [restored, setRestored] = useState(false)
  const [olderDraft, setOlderDraft] = useState<{ product: Product; privateData: ProductAdminData } | null>(null)
  const { toast, showToast, closeToast } = useToast()
  const current = useRef({ product, privateData })
  const leaving = useRef(false)
  current.current = { product, privateData }
  const storageKey = `tea-product-draft:${auth.currentUser?.uid ?? 'admin'}:${id ?? (copyId ? `copy-${copyId}` : 'new')}`
  const dirty = !!baseline && JSON.stringify({ product, privateData }) !== baseline
  const persist = useCallback(() => { if (!leaving.current) { try { sessionStorage.setItem(storageKey, JSON.stringify(current.current)) } catch { /* Server drafts remain available when browser storage is unavailable. */ } } }, [storageKey])
  useUnsavedProduct(dirty, persist, () => !leaving.current)
  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(persist, 750)
    return () => window.clearTimeout(timer)
  }, [dirty, product, privateData, persist])
  useEffect(() => {
    let cancelled = false
    setLoading(true); setLoadError(''); setSettingsError(false)
    void (async () => {
      try {
        let next = { ...emptyProduct(), id: id ?? newProductId() }
        let adminData: ProductAdminData = { cost: null }
        if (id || copyId) {
          const result = await loadProduct(id ?? copyId!, true)
          if (!result) throw new Error('상품을 찾을 수 없어요.')
          next = result.product; adminData = result.privateData
          if (copyId && !id) {
            next = { ...next, id: newProductId(), name: `${next.name} (복사)`, sku: generatedSku(), version: 0, createdAt: 0, updatedAt: 0, visibility: 'private', draft: true, seo: { ...next.seo, title: '', slug: '' }, variants: next.variants.map((variant, index) => ({ ...variant, id: crypto.randomUUID(), sku: `COPY-${crypto.randomUUID().slice(0, 8)}-${index + 1}` })) }
          }
        }
        const catalog = await loadProducts(true).catch(() => { if (!cancelled) setBlendError(true); return [] as Product[] })
        if (!cancelled) setBlendCatalog(catalog)
        const common = await loadShopSettings().catch(() => { if (!cancelled) setSettingsError(true); return null })
        if (!cancelled) {
          setSettings(common)
          if (!id && common) next = { ...next, policies: structuredClone(common.policies), policyVersion: common.version }
          const serverBaseline = JSON.stringify({ product: next, privateData: adminData })
          const local = sessionStorage.getItem(storageKey)
          if (local) {
            try {
              const saved = JSON.parse(local) as { product: Product; privateData: ProductAdminData }
              if (saved.product?.id && saved.product.version === next.version) { next = saved.product; adminData = saved.privateData; setRestored(true) }
              else { setRestored(true); setOlderDraft(saved) }
            } catch { sessionStorage.removeItem(storageKey) }
          }
          setProduct(resolveBlend({ ...next, compositionType: next.compositionType ?? 'single', teaTags: getTeaTags(next) }, catalog)); setPrivateData(adminData); setBaseline(serverBaseline)
        }
      } catch (cause) { if (!cancelled) setLoadError(cause instanceof Error ? cause.message : '상품을 불러오지 못했어요.') }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [id, copyId, attempt, storageKey])
  function update<K extends keyof Product>(key: K, value: Product[K]) { setProduct(currentProduct => ({ ...currentProduct, [key]: value })) }
  function updateGroup<K extends 'pricing' | 'inventory' | 'shipping' | 'disclosure' | 'seo'>(group: K, values: Partial<Product[K]>) { setProduct(currentProduct => ({ ...currentProduct, [group]: { ...currentProduct[group], ...values } })) }
  const descriptionText = (new DOMParser().parseFromString(product.description, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
  const policies = effectivePolicies(product, settings)
  function updatePolicy<K extends keyof ShopPolicies>(key: K, value: ShopPolicies[K]) { update('policies', { ...product.policies, [key]: value }) }
  function selectPolicy(key: 'shipping' | 'exchange' | 'refund', mode: 'common' | 'individual') {
    setProduct(currentProduct => ({ ...currentProduct, policySelection: { ...currentProduct.policySelection, [key]: mode }, policies: { ...currentProduct.policies, [key]: structuredClone(policies[key]), ...(key === 'refund' ? { address: structuredClone(policies.address) } : {}) } }))
  }
  function focusErrors() {
    requestAnimationFrame(() => {
      for (const detail of document.querySelectorAll<HTMLDetailsElement>('.product-admin details')) if (detail.querySelector('[aria-invalid="true"], .product-error')) detail.open = true
      const first = document.querySelector<HTMLElement>('.product-admin [aria-invalid="true"]')
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' }); first?.focus()
    })
  }
  async function save(draft: boolean) {
    const shipping = policies.shipping
    const next: Product = { ...resolveBlend(product, blendCatalog), draft, policies: structuredClone(policies), policyVersion: settings?.version ?? product.policyVersion, seo: { title: product.seo.title || product.name, description: product.seo.description || descriptionText, slug: product.seo.slug || productSlug(product.name) || product.id }, shipping: { ...product.shipping, type: shipping.type, carrier: shipping.carrier, feeType: shipping.feeType, fee: shipping.fee, freeThreshold: shipping.freeThreshold, extraFee: shipping.remoteFee, leadDays: shipping.leadDays, bundle: shipping.bundle } }
    if (isGroupBuyProduct(next)) { next.policies = groupBuyPolicies(next); next.policySelection = { shipping: 'individual', exchange: 'individual', refund: 'individual' } }
    const specialFulfillment = isExternalProduct(next) || isGroupBuyProduct(next)
    const validation = validateProduct(next, privateData.cost, draft)
    const publicProduct = !draft && product.visibility !== 'private'
    if (publicProduct && product.compositionType === 'blend' && product.blend?.components.some(item => { const source = blendCatalog.find(candidate => candidate.id === item.productId); return !source || source.draft || source.visibility === 'private' || source.publicAfter > Date.now() || source.publicUntil < Date.now() })) validation.blend = '공개할 혼합차의 구성은 현재 공개된 단일차로 선택해 주세요.'
    // Shipping policies, rather than duplicated logistics inputs, validate fees.
    delete validation['shipping.fee']; delete validation['shipping.freeThreshold']
    Object.assign(validation, Object.fromEntries(Object.entries(validatePolicies(next.policies, publicProduct && !specialFulfillment)).map(([key, value]) => [`policy.${key}`, value])))
    if (publicProduct && !specialFulfillment && !settings && Object.values(product.policySelection).includes('common')) validation.policies = '공통 정책을 먼저 설정하거나 각 정책을 개별 정책으로 지정해 주세요.'
    if (Object.keys(validation).length) { setErrors(validation); showToast('입력 내용을 확인해 주세요. 오류가 있는 항목에 안내를 표시했어요.', 'error'); focusErrors(); return }
    if (uploading) { showToast('이미지 업로드가 끝난 뒤 저장해 주세요.', 'info'); return }
    if (!navigator.onLine) { persist(); showToast('인터넷 연결이 끊겼어요. 입력 내용을 보관했으니 연결 후 다시 저장해 주세요.', 'error'); return }
    setBusy(true); setErrors({})
    try {
      const saved = await saveProduct(next, privateData, product.version)
      setProduct(saved); setBaseline(JSON.stringify({ product: saved, privateData })); sessionStorage.removeItem(storageKey)
      showToast(draft ? '임시 저장했어요. 상품은 고객에게 공개되지 않아요.' : '상품을 저장했어요.', 'success')
      if (!id && draft) { leaving.current = true; navigate(`/products/${saved.id}/edit`, { replace: true }) }
      else if (!draft) { leaving.current = true; navigate('/blending-tea') }
    } catch (cause) {
      persist()
      if (cause instanceof ProductSaveError) {
        setErrors(cause.reason === 'duplicate-sku' ? { sku: cause.message } : cause.reason === 'duplicate-slug' ? { 'seo.slug': cause.message } : { conflict: cause.message }); focusErrors()
      }
      showToast(cause instanceof ProductSaveError ? cause.message : '저장하지 못했어요. 입력 내용은 유지돼요. 연결과 권한을 확인하고 다시 시도해 주세요.', 'error')
    } finally { setBusy(false) }
  }
  function cancel() { if (!dirty || window.confirm('저장하지 않은 변경 사항을 보관하고 상품 목록으로 이동할까요?')) { if (dirty) persist(); leaving.current = true; navigate('/blending-tea') } }
  async function remove() {
    setBusy(true)
    try { await deleteProduct(product); leaving.current = true; sessionStorage.removeItem(storageKey); navigate('/blending-tea') }
    catch (cause) { showToast(cause instanceof Error ? cause.message : '삭제하지 못했어요. 다시 시도해 주세요.', 'error') }
    finally { setBusy(false); setDeleteOpen(false) }
  }
  if (loading) return <LoadingState label="상품 등록 화면을 준비하고 있어요." />
  if (loadError) return <ContentState error title={loadError}><Button onClick={() => setAttempt(value => value + 1)}>다시 시도</Button></ContentState>
  const financial = priceSummary(product, privateData.cost)
  const policyErrors = Object.fromEntries(Object.entries(errors).filter(([key]) => key.startsWith('policy.')).map(([key, value]) => [key.slice(7), value]))
  const policyChoice = (key: 'shipping' | 'exchange' | 'refund') => <div className="product-full"><SelectField label="정책 적용 방식" value={product.policySelection[key]} options={[{ value: 'common', label: '공통 정책 사용' }, { value: 'individual', label: '개별 정책 사용' }]} onChange={value => selectPolicy(key, value)} />{product.policySelection[key] === 'common' && <div className="product-common-policy"><p>{settings ? `공통 정책 v${settings.version} · ${new Date(settings.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}` : '아직 공통 정책이 설정되지 않았어요.'}</p><Link to="/shop-settings">공통 정책 설정</Link></div>}</div>
  return <div className="product-admin">
    <header className="product-admin-heading"><div><Link to="/blending-tea">← Shop</Link><p className="product-eyebrow">Shop · 상품 관리</p><h1>{id ? '상품 수정' : copyId ? '상품 복제' : '상품 추가'}</h1><p>기본 정보와 사진, 가격을 먼저 입력하고 필요한 설정을 펼쳐보세요.</p></div><Link className="product-settings-link" to="/shop-settings">배송·교환·반품 공통 정책</Link></header>
    {(restored || settingsError || errors.policies || errors.conflict) && <div className="product-notice" role="status">
      {restored && <p>{olderDraft ? '서버에 더 최신 상품이 있어요. 현재 화면은 최신 저장본이며, 이전 입력은 별도로 보관했어요.' : '이 브라우저에 보관된 입력 내용을 복구했어요.'}</p>}
      {olderDraft && <Button variant="outline" onClick={() => { if (window.confirm('이전 입력으로 현재 폼을 채울까요? 서버에는 아직 저장하지 않으며, 저장 시 최신 상품을 변경하게 돼요.')) { setProduct({ ...olderDraft.product, version: product.version, updatedAt: product.updatedAt }); setPrivateData(olderDraft.privateData); setOlderDraft(null) } }}>보관된 이전 입력 가져오기</Button>}
      {settingsError && <p>공통 정책을 불러오지 못했어요. 개별 정책으로 입력하거나 연결을 확인한 뒤 다시 불러와 주세요.</p>}
      {(errors.policies || errors.conflict) && <p className="product-error">{errors.policies || errors.conflict}</p>}
      <Button variant="outline" onClick={() => { if (!dirty || window.confirm('현재 입력을 별도로 보관하고 서버의 최신 정보로 다시 불러올까요?')) { const savedInput = current.current; setOlderDraft(savedInput); sessionStorage.removeItem(storageKey); setRestored(true); setAttempt(value => value + 1) } }}>다시 불러오기</Button>
    </div>}
    <div className="product-editor-layout"><nav className="product-section-nav" aria-label="상품 입력 섹션">{sectionLinks.filter(([key]) => !(isExternalProduct(product) || isGroupBuyProduct(product)) || !['exchange', 'refund'].includes(key)).map(([key, label]) => <a key={key} href={`#${key}`} onClick={() => { const section = document.getElementById(key); if (section instanceof HTMLDetailsElement) section.open = true }}>{label}</a>)}</nav>
    <form className="product-editor-form" noValidate onSubmit={event => { event.preventDefault(); void save(false) }}>
      <FormSection id="blend" title="차 구성"><ProductBlendFields product={product} catalog={blendCatalog} error={errors.blend} participantsError={errors['groupBuy.participants']} loadError={blendError} onChange={next => setProduct(resolveBlend(next, blendCatalog))} /></FormSection>
      <FormSection id="basic" title="기본 정보" description="상품명은 필수예요. SKU는 자동 생성되며 직접 바꿀 수 있어요.">
        <TextField label="상품명" required value={product.name} onChange={value => update('name', value)} error={errors.name} />
        <div><TextField label="상품 코드 (SKU)" value={product.sku} onChange={value => update('sku', value)} error={errors.sku} /><Button type="button" variant="link" onClick={() => update('sku', generatedSku())}>SKU 자동 생성</Button></div>
        {product.categories.map((value, index) => <TextField key={index} label={['대분류', '중분류', '소분류'][index]} value={value} onChange={next => { const categories: Product['categories'] = [...product.categories]; categories[index] = next; for (let i = index + 1; i < 3; i++) categories[i] = ''; update('categories', categories) }} hint={settings?.categoryPaths.length ? [...new Set(settings.categoryPaths.filter(path => index === 0 || path.slice(0, index).every((part, i) => part === product.categories[i])).map(path => path[index]))].join(' · ') : '카테고리 체계가 미정이면 비워둘 수 있어요.'} />)}
        <TextField label="브랜드" value={product.brand} onChange={value => update('brand', value)} />
        <TextField label="제조사" value={product.manufacturer} onChange={value => update('manufacturer', value)} />
        <div className="product-full"><h3>차 종류·카페인 태그</h3><div className="product-tag-choices">{teaCategories.filter((value): value is TeaTag => value !== '전체').map(value => <Button type="button" key={value} variant="filter" size="compact" aria-pressed={product.teaTags.includes(value)} onClick={() => { const caffeine = ['카페인', '무카페인']; const nextTags = product.teaTags.includes(value) ? product.teaTags.filter(tag => tag !== value) : [...product.teaTags.filter(tag => !caffeine.includes(value) || !caffeine.includes(tag)), value]; setProduct(resolveBlend({ ...product, teaTags: nextTags, compositionType: value === '혼합차' ? (nextTags.includes('혼합차') ? 'blend' : 'single') : product.compositionType }, blendCatalog)) }}>{value}</Button>)}</div>{errors.teaTags && <p className="product-error">{errors.teaTags}</p>}</div>
        <div className="product-full"><TextField label="구매 링크" type="url" value={product.purchaseUrl ?? ''} onChange={value => update('purchaseUrl', value)} error={errors.purchaseUrl} hint="고객이 주문·결제할 외부 판매 페이지의 http 또는 https 주소를 입력해 주세요." /></div>
        <div className="product-full"><h3>상품 상세 설명</h3><ProductRichText value={product.description} onChange={value => update('description', value)} /></div>
      </FormSection>
      <FormSection id="media" title="상품 이미지·미디어" description="대표 이미지는 필수예요. 드래그 또는 이동 버튼으로 이미지 순서를 바꿀 수 있어요.">
        <ProductImages productId={product.id} images={product.images} onChange={value => update('images', value)} onBusyChange={setUploading} error={errors.images} />
      </FormSection>
      <FormSection id="pricing" title="가격 정보">
        <NumberField label="정상 판매가" disabled={product.compositionType === 'blend'} required value={product.pricing.regular} onChange={value => updateGroup('pricing', { regular: value })} unit="원" error={errors['pricing.regular']} />
        <NumberField label="할인 판매가" disabled={product.compositionType === 'blend'} value={product.pricing.discount} onChange={value => updateGroup('pricing', { discount: value })} unit="원" error={errors['pricing.discount']} />
        <NumberField label="매입 원가 (관리자 전용)" value={privateData.cost} onChange={cost => setPrivateData({ cost })} unit="원" error={errors.cost} />
        <SelectField label="과세 여부" value={product.pricing.tax} options={[{ value: 'taxable', label: '과세' }, { value: 'exempt', label: '면세' }]} onChange={value => updateGroup('pricing', { tax: value })} />
        <TextField label="할인 시작일" type="datetime-local" value={product.pricing.discountStart} onChange={value => updateGroup('pricing', { discountStart: value })} error={errors['pricing.discountStart']} />
        <TextField label="할인 종료일" type="datetime-local" value={product.pricing.discountEnd} onChange={value => updateGroup('pricing', { discountEnd: value })} error={errors['pricing.discountEnd']} />
        <div className="product-calculations product-full" aria-live="polite"><span>할인율 <strong>{financial.discountRate === null ? '—' : `${financial.discountRate.toFixed(1)}%`}</strong></span><span>예상 마진 <strong>{financial.margin === null ? '—' : `${financial.margin.toLocaleString('en-US')}원`}</strong></span><span>마진율 <strong>{financial.marginRate === null ? '—' : `${financial.marginRate.toFixed(1)}%`}</strong></span></div>
      </FormSection>
      <FormSection id="options" title="상품 옵션" collapsible description="용량·구성 등 여러 옵션을 조합할 수 있어요. 단일 상품은 옵션을 끈 상태로 등록하세요.">
        <CheckField label="옵션 사용" value={product.optionsEnabled} onChange={value => update('optionsEnabled', value)} />
        {product.optionsEnabled && <div className="product-full">
          {product.options.map((option, index) => <div className="product-option-row" key={option.id}><TextField label={`옵션명 ${index + 1}`} value={option.name} onChange={name => update('options', product.options.map(item => item.id === option.id ? { ...item, name } : item))} /><TextField label="옵션값" value={option.values.join(', ')} onChange={value => update('options', product.options.map(item => item.id === option.id ? { ...item, values: value.split(',').map(part => part.trimStart()) } : item))} hint="쉼표로 구분. 예: 20g, 50g" /><Button type="button" variant="destructive" onClick={() => { update('options', product.options.filter(item => item.id !== option.id)); update('variants', []) }}>옵션 삭제</Button></div>)}
          <div className="product-inline-actions"><Button type="button" variant="outline" disabled={product.options.length >= 4} onClick={() => update('options', [...product.options, { id: crypto.randomUUID(), name: '', values: [] }])}>옵션 추가</Button><Button type="button" onClick={() => { try { const options = product.options.map(option => ({ ...option, values: splitTags(option.values.join(',')) })); update('options', options); update('variants', generateVariants(options, product.variants, product.sku)) } catch (cause) { showToast(cause instanceof Error ? cause.message : '옵션 조합을 만들 수 없어요.', 'error') } }}>옵션 조합 생성</Button><span>{product.variants.length}개 조합 · 최대 200개</span></div>
          {errors.options && <p className="product-error">{errors.options}</p>}
          <div className="product-variant-table" role="region" aria-label="옵션 조합" tabIndex={0}><table><thead><tr><th>조합</th><th>SKU</th><th>금액 방식·금액</th><th>재고</th><th>판매 상태</th><th>이미지</th></tr></thead><tbody>{product.variants.map((variant, index) => {
            const change = (values: Partial<typeof variant>) => update('variants', product.variants.map(item => item.id === variant.id ? { ...item, ...values } : item))
            return <tr key={variant.id}><td>{variant.values.join(' / ')}</td><td><TextField label={`${variant.values.join('/')} SKU`} value={variant.sku} onChange={sku => change({ sku })} error={errors[`variants.${index}.sku`]} /></td><td><SelectField label="금액 방식" value={variant.priceMode} options={[{ value: 'additional', label: '추가 금액' }, { value: 'individual', label: '개별 판매가' }]} onChange={priceMode => change({ priceMode })} /><NumberField label="옵션 금액" value={variant.price} onChange={price => change({ price: price ?? 0 })} unit="원" error={errors[`variants.${index}.price`]} /></td><td><NumberField label="옵션 재고" value={variant.stock} onChange={stock => change({ stock: stock ?? 0 })} unit="개" error={errors[`variants.${index}.stock`]} /></td><td><SelectField label="옵션 판매 상태" value={variant.status} options={[{ value: 'active', label: '판매 가능' }, { value: 'paused', label: '판매 중지' }, { value: 'sold-out', label: '품절' }]} onChange={status => change({ status })} /></td><td><SelectField label="옵션 이미지" value={variant.imageId} options={[{ value: '', label: '대표 이미지 사용' }, ...product.images.map((image, i) => ({ value: image.id, label: `${i + 1}. ${image.alt || '이미지'}` }))]} onChange={imageId => change({ imageId })} error={errors[`variants.${index}.imageId`]} /></td></tr>
          })}</tbody></table></div>
        </div>}
      </FormSection>
      <FormSection id="inventory" title="재고 관리" collapsible>
        <CheckField label="재고 관리 사용" value={product.inventory.enabled} onChange={value => updateGroup('inventory', { enabled: value })} />
        {product.inventory.enabled && <>
          <NumberField label="총 재고 수량" value={product.optionsEnabled ? product.variants.reduce((sum, variant) => sum + variant.stock, 0) : product.inventory.stock} onChange={value => updateGroup('inventory', { stock: value ?? 0 })} unit="개" disabled={product.optionsEnabled} error={errors['inventory.stock']} />
          <NumberField label="안전 재고 수량" value={product.inventory.safetyStock} onChange={value => updateGroup('inventory', { safetyStock: value ?? 0 })} unit="개" error={errors['inventory.safetyStock']} />
          <NumberField label="품절 임계값" value={product.inventory.soldOutThreshold} onChange={value => updateGroup('inventory', { soldOutThreshold: value ?? 0 })} unit="개" error={errors['inventory.soldOutThreshold']} />
          <CheckField label="품절 시 판매 중지" value={product.inventory.stopWhenSoldOut} onChange={value => updateGroup('inventory', { stopWhenSoldOut: value, preorder: value ? false : product.inventory.preorder })} />
          <CheckField label="품절 시 예약 주문 허용" value={product.inventory.preorder} onChange={value => updateGroup('inventory', { preorder: value, stopWhenSoldOut: value ? false : product.inventory.stopWhenSoldOut })} />
          <TextField label="재입고 예정일" type="date" value={product.inventory.restockDate} onChange={value => updateGroup('inventory', { restockDate: value })} error={errors['inventory.restockDate']} />
          <SelectField label="재고 상태" value={product.inventory.status} options={[{ value: 'available', label: '판매 가능' }, { value: 'sold-out', label: '품절' }, { value: 'restocking', label: '재입고 예정' }]} onChange={value => updateGroup('inventory', { status: value })} />
          {(product.optionsEnabled ? product.variants.every(variant => variant.stock === 0) : product.inventory.stock === 0) && <p className="product-notice product-full">재고가 0개예요. 품절 시 판매 중지 또는 예약 주문 정책을 확인하세요.</p>}
        </>}
      </FormSection>
      {(isExternalProduct(product) || isGroupBuyProduct(product)) ? <FormSection id="shipping" title="배송·교환·반품 안내"><FulfillmentPolicyPreview product={product} /></FormSection> : <>
      <FormSection id="shipping" title="배송 정책" collapsible>
        {policyChoice('shipping')}
        {product.policySelection.shipping === 'individual' && <ShippingPolicyFields value={product.policies.shipping} onChange={value => updatePolicy('shipping', value)} errors={policyErrors} />}
        <NumberField label="상품 무게" value={product.shipping.weight} onChange={value => updateGroup('shipping', { weight: value })} unit="g" integer={false} error={errors['shipping.weight']} />
        {(['width', 'depth', 'height'] as const).map((key, index) => <NumberField key={key} label={['포장 가로', '포장 세로', '포장 높이'][index]} value={product.shipping[key]} onChange={value => updateGroup('shipping', { [key]: value })} unit="cm" integer={false} error={errors[`shipping.${key}`]} />)}
      </FormSection>
      <FormSection id="exchange" title="교환 정책" collapsible>{policyChoice('exchange')}{product.policySelection.exchange === 'individual' && <ExchangePolicyFields value={product.policies.exchange} onChange={value => updatePolicy('exchange', value)} errors={policyErrors} />}</FormSection>
      <FormSection id="refund" title="반품·환불 정책" collapsible>{policyChoice('refund')}{product.policySelection.refund === 'individual' && <><RefundPolicyFields value={product.policies.refund} onChange={value => updatePolicy('refund', value)} errors={policyErrors} /><div className="product-full"><h3>반품 주소·고객센터</h3></div><ReturnAddressFields value={product.policies.address} onChange={value => updatePolicy('address', value)} errors={policyErrors} /></>}<div className="product-full"><Button type="button" variant="outline" onClick={() => setPolicyPreview(true)}>고객 정책 안내 미리보기</Button>{Object.entries(policyErrors).filter(([key]) => product.policySelection[key.split('.')[0] as 'shipping' | 'exchange' | 'refund'] === 'common').map(([key, value]) => <p className="product-error" key={key}>{value} · 공통 정책 설정에서 수정하세요.</p>)}</div></FormSection>
      </>}
      <FormSection id="disclosure" title="상품 고시·상세 정보" collapsible description="차 상품의 식품 정보를 입력하세요. 수입 상품 등 해당하는 항목을 채워주세요.">
        {(['country', 'foodType', 'manufactureDate', 'expiryDate', 'material', 'capacity', 'contents', 'storage', 'precautions', 'certification', 'support', 'importer', 'nutrition', 'allergens', 'gmo', 'additional'] as const).map((key, index) => <TextField key={key} label={['제조국·원산지', '식품 유형', '제조일자', '유통기한·소비기한', '원재료·소재', '크기·용량', '구성품', '사용·보관 방법', '주의사항', '인증·허가 정보', 'A/S·소비자 상담 연락처', '수입업체', '영양정보', '알레르기 정보', '유전자변형식품 표시', '추가 상품 고시'][index]} value={product.disclosure[key]} onChange={value => updateGroup('disclosure', { [key]: value })} type={['manufactureDate', 'expiryDate'].includes(key) ? 'date' : 'text'} multiline={['storage', 'precautions', 'nutrition', 'additional'].includes(key)} error={errors[`disclosure.${key}`]} />)}
      </FormSection>
      <FormSection id="seo" title="검색 엔진 최적화 (SEO)" collapsible>
        <TextField label="SEO 페이지 제목" value={product.seo.title} onChange={value => updateGroup('seo', { title: value })} hint={`자동 기본값: ${product.name || '상품명'}`} />
        <TextField label="메타 설명" multiline value={product.seo.description} onChange={value => updateGroup('seo', { description: value })} hint="비워두면 상품 상세 설명을 사용해요." />
        <TextField label="상품 URL 슬러그" value={product.seo.slug} onChange={value => updateGroup('seo', { slug: value })} hint={`자동 기본값: ${productSlug(product.name) || product.id}`} error={errors['seo.slug']} />
        <div className="product-search-preview product-full"><span>T's Recipe · Shop</span><strong>{product.seo.title || product.name || '상품명'}</strong><span>/recipes/product/{product.seo.slug || productSlug(product.name) || product.id}</span><p>{product.seo.description || descriptionText || '상품 상세 설명이 검색 결과에 표시돼요.'}</p></div>
      </FormSection>
      <FormSection id="visibility" title="판매·노출 설정" collapsible description="판매 상태와 공개 상태는 따로 관리돼요. 신규 상품은 비공개가 기본이며, 일시는 한국 시간(KST) 기준이에요.">
        <SelectField label="판매 상태" value={product.saleStatus} options={[{ value: 'active', label: '판매 중' }, { value: 'paused', label: '판매 중지' }, { value: 'sold-out', label: '품절' }]} onChange={value => update('saleStatus', value)} />
        <SelectField label="상품 공개 상태" value={product.visibility} options={[{ value: 'private', label: '비공개' }, { value: 'public', label: '공개' }, { value: 'scheduled', label: '예약 공개' }]} onChange={value => update('visibility', value)} />
        {product.visibility === 'scheduled' && <TextField label="예약 공개 일시" type="datetime-local" value={product.publishAt} onChange={value => update('publishAt', value)} error={errors.publishAt} />}
        {(['saleStart', 'saleEnd', 'exposureStart', 'exposureEnd'] as const).map((key, index) => <TextField key={key} label={['판매 시작일', '판매 종료일', '노출 시작일', '노출 종료일'][index]} type="datetime-local" value={product[key]} onChange={value => update(key, value)} error={errors[key]} />)}
        <CheckField label="추천 상품" value={product.featured} onChange={value => update('featured', value)} />
        <CheckField label="신상품 표시" value={product.newProduct} onChange={value => update('newProduct', value)} />
        {(['order', 'minQuantity', 'maxQuantity', 'perPersonLimit'] as const).map((key, index) => <NumberField key={key} label={['목록 노출 순서', '최소 구매 수량', '최대 구매 수량', '1인당 구매 제한'][index]} value={product[key]} onChange={value => update(key, key === 'order' ? value ?? 0 : key === 'minQuantity' ? value ?? 1 : value)} unit={key === 'order' ? undefined : '개'} error={errors[key]} />)}
      </FormSection>
      {id && <section className="product-section"><h2>상품 관리</h2><div className="product-inline-actions"><Button type="button" variant="outline" onClick={() => { if (!dirty || window.confirm('현재 상품의 저장본을 복제할까요? 저장하지 않은 변경 사항은 복제에 포함되지 않아요.')) { if (dirty) persist(); leaving.current = true; navigate(`/products/new?copy=${product.id}`) } }}>상품 복제</Button><Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>상품 삭제</Button></div></section>}
      <div className="product-fixed-actions"><span role="status">{uploading ? '이미지 업로드 중' : busy ? '저장 중' : dirty ? '저장되지 않은 변경 사항' : product.draft ? '임시 저장 상품' : '저장 완료'}</span><div><Button type="button" variant="ghost" disabled={busy} onClick={cancel}>취소</Button><Button type="button" variant="outline" disabled={busy || uploading} onClick={() => void save(true)}>임시 저장</Button><Button type="button" variant="outline" onClick={() => setPreview(true)}>미리보기</Button><Button type="submit" disabled={busy || uploading}>{id ? '변경사항 저장' : '상품 등록'}</Button></div></div>
    </form></div>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="product-preview-dialog"><DialogHeader><DialogTitle>고객 화면 미리보기</DialogTitle><DialogDescription>현재 입력 내용을 미리 보고 있어요. 아직 저장하지 않은 정보도 포함돼요.</DialogDescription></DialogHeader><ProductPreview product={product} settings={settings} /></DialogContent></Dialog>
    <Dialog open={policyPreview} onOpenChange={setPolicyPreview}><DialogContent className="product-preview-dialog"><DialogHeader><DialogTitle>배송·교환·반품 안내 미리보기</DialogTitle><DialogDescription>고객에게 표시될 정책 안내예요.</DialogDescription></DialogHeader><PolicyPreview policies={policies} /></DialogContent></Dialog>
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogHeader><DialogTitle>상품을 삭제할까요?</DialogTitle><DialogDescription>상품 목록에서 제거돼요. 상품 데이터와 변경 기록은 보관돼요.</DialogDescription></DialogHeader><div className="product-inline-actions"><Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>상품 삭제</Button></div></DialogContent></Dialog>
    {toast && <Toast {...toast} onClose={closeToast} />}
  </div>
}
