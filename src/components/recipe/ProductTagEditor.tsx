import { useEffect, useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useAdmin } from '../../context/AdminContext'
import type { ImageDraft } from '../RecipeImagesEditor'
import type { RecipeProductTag, TaggedProduct } from '../../types/shoppable'
import { searchTaggedProducts, saveTaggedProduct, deleteTaggedProduct } from '../../services/taggedProductService'
import { uploadProductImage } from '../../services/productService'
import './ProductTagEditor.css'

const blankProduct = () => ({ category: '기타' as NonNullable<TaggedProduct['category']>, productName: '', brandName: '', thumbnailUrl: '', productUrl: '', price: '' })
export function ProductTagEditor({ images, tags, onChange, disabled, onBusyChange }: {
  images: ImageDraft[]; tags: RecipeProductTag[]; onChange: (tags: RecipeProductTag[]) => void; disabled: boolean; onBusyChange: (busy: boolean) => void
}) {
  const { isAdmin } = useAdmin()
  const [photoId, setPhotoId] = useState('')
  const [tagId, setTagId] = useState('')
  const [catalog, setCatalog] = useState<TaggedProduct[]>([])
  const [search, setSearch] = useState('')
  const [productId, setProductId] = useState('')
  const [editingId, setEditingId] = useState<string | undefined>()
  const [form, setForm] = useState(blankProduct)
  const [formOpen, setFormOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [preview, setPreview] = useState('')
  const available = images.filter(image => image.id && (image.url.trim() || image.file))
  const photo = available.find(image => image.id === photoId) ?? available[0]
  const selected = tags.find(tag => tag.id === tagId && tag.imageId === photo?.id)
  const selectedProduct = catalog.find(product => product.id === productId)
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void searchTaggedProducts().then(products => { if (!cancelled) { setCatalog(products); setError('') } }).catch(() => { if (!cancelled) setError('상품 목록을 불러오지 못했어요. 권한과 연결을 확인하고 다시 시도하세요.') })
    return () => { cancelled = true }
  }, [isAdmin, revision])
  useEffect(() => {
    if (!photo?.file) { setPreview(''); return }
    const url = URL.createObjectURL(photo.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo?.file])
  useEffect(() => { onBusyChange(busy) }, [busy, onBusyChange])
  if (!isAdmin) return null
  function updateTag(patch: Partial<RecipeProductTag>) {
    if (selected) onChange(tags.map(tag => tag.id === selected.id ? { ...tag, ...patch } : tag))
  }
  function addTag(x = 50, y = 50) {
    if (disabled || busy) return
    if (!photo?.id || !selectedProduct) { setError('먼저 기존 상품을 선택하거나 새 상품을 등록해 주세요.'); return }
    const tag = { id: crypto.randomUUID(), imageId: photo.id, productId: selectedProduct.id, positionX: x, positionY: y }
    onChange([...tags, tag]); setTagId(tag.id); setError('')
  }
  async function saveProduct() {
    if (disabled || busy) return
    if (!form.productName.trim() || !/^https?:\/\//i.test(form.productUrl) || (form.price !== '' && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0))) { setError('상품명, 구매 URL, 가격을 확인해 주세요.'); return }
    if (editingId && !window.confirm('이 상품을 사용하는 모든 레시피에 변경 사항이 반영됩니다. 공용 상품을 수정할까요?')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const id = editingId ?? crypto.randomUUID()
      const thumbnailUrl = file ? (await uploadProductImage(id, file, () => {}).promise).url : form.thumbnailUrl
      const product = await saveTaggedProduct({ category: form.category, productName: form.productName, brandName: form.brandName, thumbnailUrl, productUrl: form.productUrl, ...(form.price.trim() ? { price: Number(form.price) } : {}) }, id)
      setCatalog(current => [...current.filter(item => item.id !== id), product]); setProductId(id); setFormOpen(false); setFile(null)
      setNotice('공용 상품을 저장했어요. 이미지의 원하는 위치를 클릭해 태그를 추가하세요. 태그 위치는 레시피 저장 버튼으로 저장됩니다.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '상품을 저장하지 못했어요.') }
    finally { setBusy(false) }
  }
  async function removeProduct() {
    if (!selectedProduct || busy || disabled || !window.confirm('이 공용 상품을 삭제하면 사용하는 모든 레시피에서 상품 태그와 관련 상품이 숨겨집니다. 삭제할까요?')) return
    setBusy(true); setError('')
    try {
      await deleteTaggedProduct(selectedProduct.id)
      setCatalog(current => current.filter(item => item.id !== selectedProduct.id)); setProductId(''); setFormOpen(false)
      setNotice('공용 상품을 삭제했어요. 해당 상품을 사용하는 다른 레시피에서도 숨겨집니다.')
    } catch { setError('상품 삭제에 실패했어요. 권한과 연결을 확인해 주세요.') }
    finally { setBusy(false) }
  }
  return <fieldset className="product-tag-editor" disabled={disabled || busy}>
    <legend>사진 속 상품 태그</legend>
    <p>공용 상품은 즉시 저장되며 다른 레시피에서도 함께 사용됩니다. 태그 추가·위치·삭제는 레시피를 저장해야 반영됩니다.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <Button type="button" variant="outline" onClick={() => setRevision(value => value + 1)}>상품 목록 다시 불러오기</Button>
    <label>레시피 사진 선택<select value={photo?.id ?? ''} onChange={event => { setPhotoId(event.target.value); setTagId('') }}><option value="" disabled>사진을 선택하세요</option>{available.map((image, index) => <option key={image.id} value={image.id}>사진 {index + 1}</option>)}</select></label>
    <label>기존 상품 검색<Input value={search} onChange={event => setSearch(event.target.value)} placeholder="상품명 또는 브랜드" /></label>
    <label>기존 상품 선택<select value={productId} onChange={event => { setProductId(event.target.value); setFormOpen(false) }}><option value="">상품을 선택하세요</option>{catalog.filter(product => `${product.productName} ${product.brandName ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(product => <option key={product.id} value={product.id}>{product.productName}{product.brandName ? ` · ${product.brandName}` : ''}</option>)}</select></label>
    <div className="product-tag-actions">
      <Button type="button" variant="outline" onClick={() => { setEditingId(undefined); setForm(blankProduct()); setFile(null); setFormOpen(true) }}>새 상품 등록</Button>
      <Button type="button" variant="outline" disabled={!selectedProduct} onClick={() => { if (!selectedProduct) return; setEditingId(selectedProduct.id); setForm({ category: selectedProduct.category ?? '기타', productName: selectedProduct.productName, brandName: selectedProduct.brandName ?? '', thumbnailUrl: selectedProduct.thumbnailUrl, productUrl: selectedProduct.productUrl, price: selectedProduct.price === undefined ? '' : String(selectedProduct.price) }); setFile(null); setFormOpen(true) }}>공용 상품 수정</Button>
      <Button type="button" variant="destructive" disabled={!selectedProduct} onClick={() => void removeProduct()}>공용 상품 삭제</Button>
    </div>
    {formOpen && <div className="product-tag-form">
      <label>상품 분류<select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as NonNullable<TaggedProduct['category']> }))}>{(['그릇', '수저', '매트', '기타'] as const).map(category => <option key={category} value={category}>{category}</option>)}</select></label>
      {editingId && <p>이 상품을 수정하면 사용하는 모든 레시피에 반영됩니다.</p>}
      {([['productName', '상품명'], ['brandName', '브랜드명 (선택)'], ['thumbnailUrl', '상품 이미지 URL (선택)'], ['productUrl', '구매 URL'], ['price', '가격 (원, 선택)']] as const).map(([key, label]) => <label key={key}>{label}<Input type={key === 'price' ? 'number' : key.endsWith('Url') ? 'url' : 'text'} min={key === 'price' ? 0 : undefined} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>)}
      <label>상품 이미지 파일 (선택)<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => { const picked = event.target.files?.[0]; event.target.value = ''; if (!picked) return; if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(picked.type) || picked.size > 10 * 1024 * 1024) { setError('JPG, PNG, WebP, AVIF 이미지, 10MB 이하만 등록할 수 있어요.'); return } setFile(picked) }} /></label>{file && <p>{file.name}</p>}
      <div className="product-tag-actions"><Button type="button" onClick={() => void saveProduct()}>공용 상품 저장</Button><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>상품 편집 취소</Button></div>
    </div>}
    {photo ? <>
      <p>상품을 선택한 뒤 사진을 클릭하면 태그가 추가됩니다. 기존 +를 선택한 뒤 사진을 클릭하면 위치가 바뀝니다. 키보드로는 아래 숫자 입력을 사용하세요.</p>
      <div className="product-tag-canvas" onClick={event => { if (disabled || busy) return; const bounds = event.currentTarget.getBoundingClientRect(); if (!bounds.width || !bounds.height) return; const positionX = Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)); const positionY = Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)); if (selected) updateTag({ positionX, positionY }); else addTag(positionX, positionY) }}>
        <img src={preview || photo.url} alt="상품 태그 위치 편집" onError={() => setError('사진을 불러오지 못했어요. 이미지 주소를 확인해 주세요.')} />
        {tags.filter(tag => tag.imageId === photo.id).map(tag => <button key={tag.id} type="button" className="product-tag-marker" style={{ left: `${tag.positionX}%`, top: `${tag.positionY}%` }} aria-pressed={tag.id === selected?.id} aria-label={`${catalog.find(product => product.id === tag.productId)?.productName ?? '삭제되었거나 확인할 수 없는 상품'} 태그 선택`} onClick={event => { event.stopPropagation(); setTagId(tag.id); setProductId(tag.productId) }}>+</button>)}
      </div>
      <Button type="button" variant="outline" disabled={!selectedProduct} onClick={() => { setTagId(''); addTag() }}>가운데에 새 태그 추가</Button>
      {selected && <div className="product-tag-form"><p>선택한 태그</p>{(['positionX', 'positionY'] as const).map(key => <label key={key}>{key === 'positionX' ? '가로 위치 (%)' : '세로 위치 (%)'}<Input type="number" min="0" max="100" step="0.1" value={Math.round(selected[key] * 100) / 100} onChange={event => { if (!event.target.value.trim()) return; const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 100) updateTag({ [key]: value }) }} /></label>)}<Button type="button" variant="outline" disabled={!selectedProduct} onClick={() => updateTag({ productId })}>선택한 상품으로 태그 변경</Button><Button type="button" variant="destructive" onClick={() => { onChange(tags.filter(tag => tag.id !== selected.id)); setTagId('') }}>이 사진의 태그 삭제</Button><Button type="button" variant="outline" onClick={() => setTagId('')}>태그 선택 해제</Button></div>}
    </> : <p>먼저 레시피 사진을 추가하세요.</p>}
    {busy && <p role="status">상품을 저장하는 중입니다…</p>}
  </fieldset>
}
