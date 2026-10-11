import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

export function useUnsavedProduct(dirty: boolean, persist: () => void, shouldBlock: () => boolean = () => true) {
  const persistRef = useRef(persist)
  persistRef.current = persist
  const shouldBlockRef = useRef(shouldBlock)
  shouldBlockRef.current = shouldBlock
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && shouldBlockRef.current() && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('저장하지 않은 변경 사항이 있어요. 입력 내용을 이 브라우저에 보관하고 이동할까요?')) { persistRef.current(); blocker.proceed() }
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { persistRef.current(); event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => { window.removeEventListener('beforeunload', beforeUnload); persistRef.current() }
  }, [dirty])
}
