import type { ReactNode } from 'react'
import './StorySection.css'

type StoryContentProps = {
  titleId: string
  title: ReactNode
  number?: string
  children: ReactNode
}

function StoryContent({ titleId, title, number, children }: StoryContentProps) {
  return <>
    {number && <div className="story-number" aria-hidden="true">{number}</div>}
    <h2 id={titleId}>{title}</h2>
    {children}
  </>
}

export function StorySection({ banner, tone = 'default', ...content }: StoryContentProps & {
  tone?: 'default' | 'soft'
  banner?: { src: string; alt: string }
}) {
  const reading = <div className="story-reading"><StoryContent {...content} /></div>
  if (banner) return <section aria-labelledby={content.titleId}>
    <div className="story-banner"><img src={banner.src} alt={banner.alt} loading="lazy" /></div>
    <div className="story-section story-origin">{reading}</div>
  </section>
  return <section className={`story-section${tone === 'soft' ? ' story-soft' : ''}`} aria-labelledby={content.titleId}>{reading}</section>
}

export function StorySplit({ id, image, imageSide = 'left', tone = 'soft', eyebrow, ...content }: StoryContentProps & {
  id?: string
  image: { src: string; alt: string }
  imageSide?: 'left' | 'right'
  tone?: 'soft' | 'dark'
  eyebrow?: string
}) {
  const photo = <div className="story-photo"><img src={image.src} alt={image.alt} loading="lazy" /></div>
  return <section id={id} className={`story-split${tone === 'dark' ? ' story-dark' : ''}`} aria-labelledby={content.titleId}>
    {imageSide === 'left' && photo}
    <div className={`story-panel${tone === 'soft' ? ' story-soft' : ''}`}><div>
      {eyebrow && <p className="story-eyebrow">{eyebrow}</p>}
      <StoryContent {...content} />
    </div></div>
    {imageSide === 'right' && photo}
  </section>
}
