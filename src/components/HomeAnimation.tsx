import { useEffect, useRef } from 'react'

export function HomeAnimation({ ko }: { ko: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    // Reflect the initial mute state as well as the current muted property.
    if (videoRef.current) videoRef.current.defaultMuted = true
  }, [])

  function restart(video: HTMLVideoElement) {
    if (document.visibilityState === 'hidden') return
    video.currentTime = 0
    // Playback can still be refused by the browser. Keep native controls usable.
    void video.play().catch(() => {})
  }

  return <section className="home-animation" aria-label={ko ? '그리드 다이브 애니메이션' : 'Grid dive animation'}>
    <video ref={videoRef} autoPlay muted loop playsInline controls preload="auto"
      onEnded={event => restart(event.currentTarget)}
      onPause={event => { if (event.currentTarget.ended) restart(event.currentTarget) }}>
      <source src={`${import.meta.env.BASE_URL}animo-grid-dive-720p.webm`} type="video/webm" />
      {ko ? '이 브라우저에서는 영상을 재생할 수 없습니다.' : 'Your browser does not support video playback.'}
    </video>
  </section>
}
