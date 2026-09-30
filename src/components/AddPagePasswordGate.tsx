import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isProtectedPagePath, useAddPageAccess } from './AddPageAccessProvider'

export function AddPagePasswordGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { approvedPath, requestAccess } = useAddPageAccess()
  useEffect(() => {
    if (approvedPath !== pathname && isProtectedPagePath(pathname)) requestAccess(pathname)
  }, [pathname, approvedPath, requestAccess])
  return approvedPath === pathname ? <>{children}</> : null
}
