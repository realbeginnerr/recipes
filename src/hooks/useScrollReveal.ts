import { useLayoutEffect, useRef } from 'react'

/** Prepare offscreen entrances before paint; without animation support content stays visible. */
export function useScrollReveal() {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const page = root.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!page || motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return

    const animations = new Set<Animation>()
    const pending = new Map<Element, Animation>()
    const heroText = page.querySelector('.story-hero-content')
    if (heroText) {
      const bounds = heroText.getBoundingClientRect()
      if (bounds.top < window.innerHeight && bounds.bottom > 0) {
        let entrance: Animation | undefined
        try {
          entrance = heroText.animate([
            { opacity: 0, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration: 400, easing: 'cubic-bezier(0, 0, 0.3, 1)', fill: 'backwards' })
          const animation = entrance
          animations.add(animation)
          animation.onfinish = () => animations.delete(animation)
        } catch {
          entrance?.cancel()
          if (entrance) animations.delete(entrance)
        }
      }
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        const animation = pending.get(entry.target)
        pending.delete(entry.target)
        if (!animation) continue
        if (motion.matches) {
          animation.cancel()
          animations.delete(animation)
          continue
        }
        try {
          animation.play()
        } catch {
          animation.cancel()
          animations.delete(animation)
        }
      }
    }, { rootMargin: `0px 0px -${window.innerHeight * 0.15}px 0px`, threshold: 0 })

    for (const section of page.querySelectorAll('section')) {
      // Animate image content, never the section background or its layout box.
      const groups = [
        ...section.querySelectorAll('.story-photo img, .story-banner img'),
        ...section.querySelectorAll('.story-panel > div, .story-reading'),
      ]
      groups.forEach((group, index) => {
        const bounds = group.getBoundingClientRect()
        // Initial content and content above restored scroll positions stay immediate.
        if (bounds.top < window.innerHeight) return
        let animation: Animation | undefined
        try {
          animation = group.animate([
            { opacity: 0, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], {
            duration: 400,
            delay: index * 80,
            easing: 'cubic-bezier(0, 0, 0.3, 1)',
            fill: 'backwards',
          })
          animation.pause()
          animation.currentTime = 0
          const entrance = animation
          entrance.onfinish = () => animations.delete(entrance)
          animations.add(entrance)
          pending.set(group, entrance)
          observer.observe(group)
        } catch {
          animation?.cancel()
          if (animation) animations.delete(animation)
          pending.delete(group)
        }
      })
    }

    const stopMotion = () => {
      if (!motion.matches) return
      observer.disconnect()
      animations.forEach(animation => animation.cancel())
      animations.clear()
      pending.clear()
    }
    motion.addEventListener('change', stopMotion)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', stopMotion)
      animations.forEach(animation => animation.cancel())
    }
  }, [])

  return root
}
