import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ShopSettings } from '../types/product'
import { emptyShopSettings, validatePolicies } from '../utils/shopPolicy'
import { loadPolicyHistory, loadShopSettings, ProductSaveError, saveShopSettings } from '../services/productService'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { ContentState, LoadingState } from '../components/feedback/ContentState'
import { Toast, useToast } from '../components/feedback/Toast'
import { FormSection, TextField } from '../components/product/ProductFields'
import { ShippingPolicyFields, ExchangePolicyFields, RefundPolicyFields, ReturnAddressFields } from '../components/product/PolicyFields'
import { PolicyPreview } from '../components/product/PolicyPreview'
import { useUnsavedProduct } from '../hooks/useUnsavedProduct'
import './ProductAdmin.css'

export function ShopSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>(emptyShopSettings)
  const [history, setHistory] = useState<ShopSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [baseline, setBaseline] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const { toast, showToast, closeToast } = useToast()
  const dirty = !!baseline && JSON.stringify(settings) !== baseline
  useUnsavedProduct(dirty, () => { try { sessionStorage.setItem('tea-shop-policy-draft', JSON.stringify(settings)) } catch { /* Keep form state when browser storage is unavailable. */ } })
  useEffect(() => {
    let cancelled = false
    setLoading(true); setLoadFailed(false)
    void Promise.all([loadShopSettings(), loadPolicyHistory()]).then(([current, revisions]) => {
      if (cancelled) return
      const next = current ?? emptyShopSettings()
      setSettings(next); setBaseline(JSON.stringify(next)); setHistory(revisions)
    }).catch(() => { if (!cancelled) setLoadFailed(true) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])
  async function save() {
    const validation = validatePolicies(settings.policies)
    if (Object.keys(validation).length) { setErrors(validation); showToast('오류가 있는 정책 항목을 확인해 주세요.', 'error'); return }
    if (!navigator.onLine) { showToast('인터넷 연결을 확인해 주세요. 입력 내용은 유지돼요.', 'error'); return }
    setBusy(true)
    try {
      const saved = await saveShopSettings(settings, settings.version)
      setSettings(saved); setBaseline(JSON.stringify(saved)); setHistory(current => [saved, ...current]); sessionStorage.removeItem('tea-shop-policy-draft'); setErrors({}); showToast('공통 정책을 저장했어요.', 'success')
    } catch (cause) { showToast(cause instanceof ProductSaveError ? cause.message : '저장하지 못했어요. 입력 내용은 유지돼요. 연결과 관리자 권한을 확인하고 다시 시도해 주세요.', 'error') }
    finally { setBusy(false) }
  }
  if (loading) return <LoadingState label="공통 정책을 불러오고 있어요." />
  if (loadFailed) return <ContentState error title="공통 정책을 불러오지 못했어요."><Button onClick={() => setAttempt(value => value + 1)}>다시 시도</Button></ContentState>
  return <div className="product-admin"><header className="product-admin-heading"><div><Link to="/blending-tea">← 차한잔</Link><p className="product-eyebrow">차한잔 · 관리자 설정</p><h1>배송·교환·반품 공통 정책</h1><p>공통 정책을 사용하는 상품에 적용돼요. 상품별 개별 정책은 변경되지 않아요.</p>{settings.updatedAt > 0 && <p>최종 수정 {new Date(settings.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · v{settings.version}</p>}</div><Link to="/products/new">상품 추가</Link></header>
    <div className="product-notice"><p>주문 처리와 환불 실행은 이 화면의 기능에 포함되지 않아요. 향후 주문 연동 시 주문 시점의 정책을 별도 저장하도록 데이터 구조를 마련했어요.</p>{sessionStorage.getItem('tea-shop-policy-draft') && <Button variant="outline" onClick={() => { try { const draft = JSON.parse(sessionStorage.getItem('tea-shop-policy-draft')!); if (draft.version === settings.version) setSettings(draft); else showToast('보관된 정책보다 서버 정책이 최신이에요. 변경 이력을 확인해 주세요.', 'info') } catch { showToast('보관된 설정을 읽을 수 없어요.', 'error') } }}>브라우저에 보관된 입력 복구</Button>}</div>
    <form noValidate onSubmit={event => { event.preventDefault(); void save() }}>
      <FormSection id="shop-categories" title="상품 카테고리" description="실제 사용할 분류 체계만 등록하세요. 미정이면 비워둘 수 있어요.">
        <div className="product-full">{settings.categoryPaths.map((path, index) => <div className="product-option-row" key={index}>{path.map((part, level) => <TextField key={level} label={['대분류', '중분류', '소분류'][level]} value={part} onChange={value => setSettings(current => ({ ...current, categoryPaths: current.categoryPaths.map((row, i) => i === index ? row.map((item, j) => j === level ? value : item) as [string, string, string] : row) }))} />)}<Button type="button" variant="destructive" onClick={() => setSettings(current => ({ ...current, categoryPaths: current.categoryPaths.filter((_, i) => i !== index) }))}>분류 삭제</Button></div>)}<Button type="button" variant="outline" onClick={() => setSettings(current => ({ ...current, categoryPaths: [...current.categoryPaths, ['', '', '']] }))}>분류 경로 추가</Button></div>
      </FormSection>
      <FormSection id="common-shipping" title="배송 정책"><ShippingPolicyFields value={settings.policies.shipping} onChange={value => setSettings(current => ({ ...current, policies: { ...current.policies, shipping: value } }))} errors={errors} /></FormSection>
      <FormSection id="common-exchange" title="교환 정책"><ExchangePolicyFields value={settings.policies.exchange} onChange={value => setSettings(current => ({ ...current, policies: { ...current.policies, exchange: value } }))} errors={errors} /></FormSection>
      <FormSection id="common-refund" title="반품·환불 정책"><RefundPolicyFields value={settings.policies.refund} onChange={value => setSettings(current => ({ ...current, policies: { ...current.policies, refund: value } }))} errors={errors} /></FormSection>
      <FormSection id="common-address" title="교환·반품 주소"><ReturnAddressFields value={settings.policies.address} onChange={value => setSettings(current => ({ ...current, policies: { ...current.policies, address: value } }))} errors={errors} /></FormSection>
      <FormSection id="policy-history" title="정책 변경 이력" collapsible><div className="product-full">{history.length ? history.map(revision => <details key={revision.version}><summary>v{revision.version} · {new Date(revision.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</summary><PolicyPreview policies={revision.policies} /></details>) : <p>저장된 변경 이력이 없어요.</p>}</div></FormSection>
      <div className="product-fixed-actions"><span>{busy ? '저장 중' : dirty ? '저장되지 않은 변경 사항' : '공통 정책'}</span><div><Button type="button" variant="outline" onClick={() => setPreview(true)}>고객 안내 미리보기</Button><Button type="submit" disabled={busy}>공통 정책 저장</Button></div></div>
    </form><Dialog open={preview} onOpenChange={setPreview}><DialogContent className="product-preview-dialog"><DialogHeader><DialogTitle>고객 정책 안내 미리보기</DialogTitle><DialogDescription>상품 상세에서 고객에게 표시될 안내 문구예요.</DialogDescription></DialogHeader><PolicyPreview policies={settings.policies} /></DialogContent></Dialog>{toast && <Toast {...toast} onClose={closeToast} />}
  </div>
}
