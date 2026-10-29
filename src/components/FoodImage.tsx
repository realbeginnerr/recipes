import { useState } from 'react'

export function FoodImage({ src, alt, className, onError }: {
  src?: string
  alt: string
  className?: string
  onError?: () => void
}) {
  const [failedSrc, setFailedSrc] = useState<string>()
  if (!src || src === failedSrc) return <div role="img" aria-label={alt || undefined} className={className} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
      <path d="M21 15v7" />
    </svg>
  </div>
  return <img key={src} src={src} alt={alt} className={className} loading="lazy" onError={() => { setFailedSrc(src); onError?.() }} />
}
