import type { ReactNode } from 'react'

const placeholder = `${import.meta.env.BASE_URL}images/ingredient-placeholder.svg`

export function FoodImage({ src, alt, className, empty }: {
  src?: string
  alt: string
  className?: string
  empty?: ReactNode
}) {
  if (!src && empty) return <>{empty}</>
  return <img key={src || placeholder} src={src || placeholder} alt={alt} className={className} loading="lazy" onError={event => {
    const image = event.currentTarget
    if (image.getAttribute('src') !== placeholder) image.src = placeholder
  }} />
}
