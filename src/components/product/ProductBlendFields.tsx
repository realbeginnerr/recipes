import { useUiCopy, useUiLanguage } from '../../context/LanguageContext'
import { translateContent } from '../../i18n/content'
import { useState } from 'react'
import type { Product } from '../../types/product'
import { Button } from '../ui/button'
import { NumberField, SelectField, TextField } from './ProductFields'
import { discountedPrice } from '../../utils/product'

export function ProductBlendFields({ product, catalog, error, participantsError, loadError, onChange }: { product: Product; catalog: Product[]; error?: string; participantsError?: string; loadError: boolean; onChange: (next: Product) => void }) {
  const copy = useUiCopy()
  const language = useUiLanguage()
  const displayName = (name: string | undefined) => translateContent(name, language)
  const [search, setSearch] = useState('')
  const components = product.blend?.components ?? []
  const totalGrams = components.reduce((sum, item) => sum + (item.grams ?? 0), 0)
  const updateComponents = (next: typeof components) => onChange({ ...product, blend: { components: next, waterMl: product.blend?.waterMl ?? null } })
  const candidates = catalog.filter(item => item.id !== product.id && !item.draft && item.compositionType !== 'blend' && !item.teaTags.includes('혼합차') && !components.some(component => component.productId === item.id) && (item.name + ' ' + displayName(item.name)).toLowerCase().includes(search.toLowerCase()))
  return <div className="product-full">
    <SelectField label={copy("차 구성 유형")} value={product.compositionType ?? 'single'} options={[{ value: 'single', label: copy("단일차") }, { value: 'blend', label: copy("혼합차") }]} onChange={value => onChange({ ...product, compositionType: value, teaTags: value === 'blend' ? [...new Set([...product.teaTags, '혼합차' as const])] : product.teaTags.filter(tag => tag !== '혼합차') })} />
    {product.compositionType === 'blend' && <>
      <p>{copy("단일차를 2개 이상 선택하고 배합량을 입력하세요. 가격은 선택한 단일상품 판매가의 합계예요.")}</p>
      <TextField label={copy("단일차 검색")} value={search} onChange={setSearch} />
      {loadError && <p className="product-error" role="alert">{copy("단일차를 불러오지 못했어요. 입력을 보관하고 다시 불러와 주세요.")}</p>}
      <div className="product-blend-candidates">{candidates.map(item => <Button key={item.id} type="button" variant="outline" onClick={() => updateComponents([...components, { productId: item.id, grams: null }])}>{displayName(item.name)} · {discountedPrice(item)?.toLocaleString('en-US', { maximumFractionDigits: 1 }) ?? copy("가격 미정")}{copy("원 +")}</Button>)}</div>
      {!candidates.length && <p>{copy("선택할 수 있는 단일차가 없어요.")}</p>}
      <div className="product-blend-list">{components.map((item, index) => <div key={item.productId} className="product-blend-row">
        <div className="product-blend-photo card-photo">{item.imageUrl && <img src={item.imageUrl} alt={displayName(item.name)} />}</div>
        <div><strong>{displayName(item.name) || copy("구성 차")}</strong>{item.unavailable && <p className="product-error">{copy("사용할 수 없는 상품이에요. 구성에서 제거해 주세요.")}</p>}<NumberField label={copy(`${displayName(item.name) || copy("구성 차")} 배합량`)} value={item.grams} integer={false} unit="g" onChange={grams => updateComponents(components.map((entry, i) => i === index ? { ...entry, grams } : entry))} /><span>{totalGrams > 0 ? ((item.grams ?? 0) / totalGrams * 100).toFixed(1) : '0.0'}%</span></div>
        <Button type="button" variant="ghost" onClick={() => updateComponents(components.filter((_, i) => i !== index))} aria-label={copy(`${displayName(item.name) || copy("구성 차")} 제거`)}>{copy("제거")}</Button>
      </div>)}</div>
      <NumberField label={copy("공동구매 참여 인원")} value={product.groupBuy?.participants ?? null} unit={copy("명")} error={participantsError} onChange={participants => onChange({ ...product, groupBuy: { participants } })} />
      <p>{copy("각 차의 양과 구매 비용은 참여 인원수로 뫞균등하게 나눕니다. 인원이 정해지면 입력해 주세요.")}</p>
      <NumberField label={copy("물 양")} value={product.blend?.waterMl ?? null} unit="ml" onChange={waterMl => onChange({ ...product, blend: { components, waterMl } })} />
      <p aria-live="polite">{copy("총 배합량 ")}{totalGrams.toLocaleString('en-US', { maximumFractionDigits: 1 })}{copy("g · 판매가 ")}{product.pricing.regular?.toLocaleString('en-US', { maximumFractionDigits: 1 }) ?? copy("가격 미정")}{copy("원")}</p>
      {error && <p className="product-error" role="alert">{copy(error)}</p>}
    </>}
  </div>
}
