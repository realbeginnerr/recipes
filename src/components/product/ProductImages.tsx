import { useEffect, useRef, useState } from 'react'
import type { ProductImage } from '../../types/product'
import { uploadProductImage } from '../../services/productService'
import { MAX_IMAGE_BYTES, MAX_PRODUCT_IMAGES, PRODUCT_IMAGE_TYPES, validWebUrl } from '../../utils/product'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { TextField } from './ProductFields'

type Upload = { id: string; file: File; percent: number; error: string; replaceId?: string }
export function ProductImages({ productId, images, onChange, error, onBusyChange }: { productId: string; images: ProductImage[]; onChange: (images: ProductImage[]) => void; error?: string; onBusyChange: (busy: boolean) => void }) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [url, setUrl] = useState('')
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const dragged = useRef<string | null>(null)
  const imageRef = useRef(images)
  const uploadRef = useRef(uploads)
  const callbacks = useRef({ onChange, onBusyChange })
  const cancellations = useRef(new Map<string, () => void>())
  const mounted = useRef(true)
  imageRef.current = images
  uploadRef.current = uploads
  callbacks.current = { onChange, onBusyChange }
  useEffect(() => { callbacks.current.onBusyChange(uploads.some(upload => !upload.error)) }, [uploads])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; for (const cancel of cancellations.current.values()) cancel() } }, [])
  async function upload(upload: Upload) {
    try {
      const task = uploadProductImage(productId, upload.file, percent => { if (mounted.current) setUploads(current => current.map(item => item.id === upload.id ? { ...item, percent } : item)) })
      cancellations.current.set(upload.id, task.cancel)
      const result = await task.promise
      if (!mounted.current) return
      const image = { id: upload.replaceId ?? crypto.randomUUID(), ...result, alt: upload.file.name.replace(/\.[^.]+$/, '') }
      const next = upload.replaceId ? imageRef.current.map(item => item.id === upload.replaceId ? image : item) : [...imageRef.current, image]
      imageRef.current = next
      callbacks.current.onChange(next)
      setUploads(current => current.filter(item => item.id !== upload.id))
    } catch (cause) {
      if (mounted.current) setUploads(current => current.map(item => item.id === upload.id ? { ...item, error: cause instanceof Error ? cause.message : '업로드에 실패했어요. 연결을 확인하고 다시 시도해 주세요.' } : item))
    } finally { cancellations.current.delete(upload.id) }
  }
  function addFiles(files: File[], replaceId?: string) {
    setNotice('')
    if (!replaceId && imageRef.current.length + uploadRef.current.length + files.length > MAX_PRODUCT_IMAGES) { setNotice(`최대 ${MAX_PRODUCT_IMAGES}장까지 등록할 수 있어요.`); return }
    if (files.some(file => !PRODUCT_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES)) { setNotice('JPG, PNG, WebP, AVIF 파일만 사용할 수 있어요. 각 파일은 10MB 이하여야 해요.'); return }
    const next = files.map(file => ({ id: crypto.randomUUID(), file, percent: 0, error: '', replaceId }))
    setUploads(current => [...current, ...next])
    next.forEach(item => void upload(item))
  }
  function move(id: string, destination: number) {
    const next = [...images]
    const from = next.findIndex(image => image.id === id)
    if (from < 0 || destination < 0 || destination >= images.length) return
    const [image] = next.splice(from, 1); next.splice(destination, 0, image); onChange(next)
  }
  return <div className="product-full">
    <div className={`product-dropzone${dragging ? ' is-dragging' : ''}`} onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true) } }} onDragLeave={() => setDragging(false)} onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)) } }}>
      <label>이미지를 끌어놓거나 파일을 선택하세요<Input type="file" accept={PRODUCT_IMAGE_TYPES.join(',')} multiple onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} /></label>
      <p>첫 번째 이미지가 대표 이미지예요. 최대 {MAX_PRODUCT_IMAGES}장 · JPG, PNG, WebP, AVIF · 장당 10MB</p>
    </div>
    <div className="product-image-url"><TextField label="이미지 URL로 추가" value={url} onChange={setUrl} /><Button type="button" variant="outline" onClick={() => {
      if (!validWebUrl(url)) { setNotice('유효한 http 또는 https 이미지 주소를 입력해 주세요.'); return }
      if (images.length + uploads.length >= MAX_PRODUCT_IMAGES) { setNotice(`이미지는 최대 ${MAX_PRODUCT_IMAGES}장까지 등록할 수 있어요.`); return }
      onChange([...images, { id: crypto.randomUUID(), url, alt: '' }]); setUrl(''); setNotice('')
    }}>이미지 추가</Button></div>
    {(error || notice) && <p className="product-error" role="alert">{error || notice}</p>}
    <div className="product-media-grid">{images.map((image, index) => <div className="product-media-item" key={image.id} draggable onDragStart={() => { dragged.current = image.id }} onDragOver={event => { if (dragged.current) event.preventDefault() }} onDrop={event => { if (dragged.current) { event.preventDefault(); move(dragged.current, index); dragged.current = null } }} onDragEnd={() => { dragged.current = null }}>
      <div className="product-media-photo card-photo"><img src={image.url} alt={image.alt} /></div><p>{index === 0 ? '대표 이미지' : `추가 이미지 ${index}`}</p>
      <TextField label="대체 텍스트" value={image.alt} onChange={alt => onChange(images.map(item => item.id === image.id ? { ...item, alt } : item))} />
      <div className="product-inline-actions"><Button type="button" variant="ghost" disabled={index === 0} onClick={() => move(image.id, 0)}>대표로</Button><Button type="button" variant="ghost" disabled={index === 0} onClick={() => move(image.id, index - 1)} aria-label={`이미지 ${index + 1} 앞으로`}>↑</Button><Button type="button" variant="ghost" disabled={index === images.length - 1} onClick={() => move(image.id, index + 1)} aria-label={`이미지 ${index + 1} 뒤로`}>↓</Button><Button type="button" variant="destructive" onClick={() => onChange(images.filter(item => item.id !== image.id))}>삭제</Button></div>
      <label className="product-replace">이미지 교체<Input type="file" accept={PRODUCT_IMAGE_TYPES.join(',')} onChange={event => { const file = event.target.files?.[0]; if (file) addFiles([file], image.id); event.target.value = '' }} /></label>
    </div>)}</div>
    {uploads.map(item => <div className="product-upload-status" key={item.id} role={item.error ? 'alert' : 'status'}><span>{item.file.name} · {item.error ? '업로드 실패' : `${item.percent}%`}</span>{item.error ? <><p>{item.error}</p><Button type="button" variant="outline" onClick={() => { setUploads(current => current.map(uploadItem => uploadItem.id === item.id ? { ...uploadItem, error: '' } : uploadItem)); void upload(item) }}>다시 시도</Button><Button type="button" variant="ghost" onClick={() => setUploads(current => current.filter(uploadItem => uploadItem.id !== item.id))}>닫기</Button></> : <progress value={item.percent} max="100" aria-label={`${item.file.name} 업로드 진행률`} />}</div>)}
  </div>
}
