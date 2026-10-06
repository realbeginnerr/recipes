import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isProtectedPagePath, useAddPageAccess } from './AddPageAccessProvider'
import { useAdmin } from '../context/AdminContext'

export function AddPagePasswordGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { approvedPath, requestAccess } = useAddPageAccess()
  const { authReady } = useAdmin()
  useEffect(() => {
    if (authReady && approvedPath !== pathname && isProtectedPagePath(pathname)) requestAccess(pathname)
  }, [pathname, approvedPath, requestAccess, authReady])
  return approvedPath === pathname ? <>{children}</> : null
}
