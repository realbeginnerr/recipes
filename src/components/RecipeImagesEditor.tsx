import { useEffect, useState } from 'react'
import type { Recipe } from '../types'
import { useLanguage } from '../context/LanguageContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type ImageDraft = { url: string; file?: File }

export function recipeImageDrafts(recipe: Recipe): ImageDraft[] {
  const urls = [...new Set([recipe.imageUrl, ...(recipe.imageUrls ?? [])].map(url => url.trim()).filter(Boolean))]
  return urls.length ? urls.map(url => ({ url })) : [{ url: '' }]
}

function ImagePreview({ image, alt }: { image: ImageDraft; alt: string }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!image.file) { setPreview(''); return }
    const url = URL.createObjectURL(image.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image.file])
  return preview || image.url ? <img src={preview || image.url} alt={alt} className="edit-inline__image-preview" /> : null
}

export function RecipeImagesEditor({ images, onChange, disabled = false, allowFiles = true }: {
  images: ImageDraft[]
  onChange: (images: ImageDraft[]) => void
  disabled?: boolean
  allowFiles?: boolean
}) {
  const { language } = useLanguage()
  const ko = language === 'ko'
  const [error, setError] = useState('')
  function update(index: number, image: ImageDraft) {
    onChange(images.map((value, i) => i === index ? image : value))
  }
  return <fieldset className="edit-inline__image-field" disabled={disabled}>
    <legend className="text-sm font-medium">{ko ? '레시피 사진 (최대 5장)' : 'Recipe photos (up to 5)'}</legend>
    <p className="text-sm">{ko ? '첫 번째 사진이 대표 사진입니다. URL을 입력하거나 기기에서 사진을 선택하세요.' : 'The first photo is the cover. Enter a URL or choose a photo.'}</p>
    {images.map((image, index) => <div key={index} className="space-y-2">
      <label className="text-sm font-medium" htmlFor={`recipe-photo-${index}`}>{ko ? `사진 ${index + 1} URL` : `Photo ${index + 1} URL`}</label>
      <Input id={`recipe-photo-${index}`} value={image.url} placeholder="https://... 또는 /recipes/images/..." onChange={event => update(index, { url: event.target.value })} />
      <div className="edit-inline__image-controls">
        {allowFiles && <label className="text-sm">{ko ? '기기에서 사진 선택' : 'Choose photo'}<input type="file" accept="image/*" onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
            setError(ko ? '10MB 이하의 이미지 파일을 선택해 주세요.' : 'Choose an image under 10 MB.')
            return
          }
          setError('')
          update(index, { url: '', file })
        }} /></label>}
        {image.file && <span className="text-sm">{image.file.name}</span>}
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(images.length === 1 ? [{ url: '' }] : images.filter((_, i) => i !== index))}>{ko ? '사진 삭제' : 'Remove photo'}</Button>
        {index > 0 && <Button type="button" variant="outline" size="sm" onClick={() => onChange([image, ...images.filter((_, i) => i !== index)])}>{ko ? '대표 사진으로' : 'Use as cover'}</Button>}
      </div>
      <ImagePreview image={image} alt={ko ? `사진 ${index + 1} 미리보기` : `Photo ${index + 1} preview`} />
    </div>)}
    {error && <p role="alert">{error}</p>}
    <Button type="button" variant="outline" size="sm" disabled={images.length >= 5} onClick={() => onChange([...images, { url: '' }])}>{ko ? '사진 추가' : 'Add photo'}</Button>
  </fieldset>
}
