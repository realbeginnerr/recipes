import { useContext, useEffect, type RefObject } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom'
import { Modal } from './Modal'

function RouteGuard({ dirty, allowed, ko }: { dirty: boolean; allowed: RefObject<boolean>; ko: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !allowed.current && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  return <Modal isOpen={blocker.state === 'blocked'} onClose={() => { if (blocker.state === 'blocked') blocker.reset() }}
    title={ko ? '변경 사항을 저장하지 않았어요' : 'Unsaved changes'}
    message={ko ? '나가면 작성 중인 내용이 사라집니다.' : 'Leaving will discard your unsaved changes.'}
    actions={[
      { label: ko ? '계속 작성' : 'Keep editing', variant: 'ghost', onClick: () => { if (blocker.state === 'blocked') blocker.reset() } },
      { label: ko ? '저장하지 않고 나가기' : 'Leave without saving', onClick: () => { if (blocker.state === 'blocked') blocker.proceed() } },
    ]} />
}

export function RecipeLeaveGuard({ dirty, allowed, ko }: { dirty: boolean; allowed: RefObject<boolean>; ko: boolean }) {
  const router = useContext(UNSAFE_DataRouterContext)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      if (allowed.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, allowed])
  return router ? <RouteGuard dirty={dirty} allowed={allowed} ko={ko} /> : null
}
