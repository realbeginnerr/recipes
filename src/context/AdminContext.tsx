import { createContext, useContext, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from '../firebase'

const ADMIN_EMAIL = 'hijmjo@gmail.com'
type AdminLoginError = 'not-admin' | 'provider-disabled' | 'unauthorized-domain' | 'popup-blocked' | 'popup-closed' | 'failed'
type AdminLoginResult = { ok: true } | { ok: false; reason: AdminLoginError }

type AdminContextType = {
  isAdmin: boolean
  authReady: boolean
  login: () => Promise<AdminLoginResult>
  logout: () => Promise<void>
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  authReady: false,
  login: async () => ({ ok: false, reason: 'failed' }),
  logout: async () => {},
})

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setIsAdmin(user?.email?.toLowerCase() === ADMIN_EMAIL && user.emailVerified)
    setAuthReady(true)
  }), [])

  async function login(): Promise<AdminLoginResult> {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      const result = await signInWithPopup(auth, provider)
      const isAuthorized = result.user.email?.toLowerCase() === ADMIN_EMAIL && result.user.emailVerified
      if (!isAuthorized) {
        await signOut(auth)
        setIsAdmin(false)
        return { ok: false, reason: 'not-admin' }
      }
      setIsAdmin(true)
      return { ok: true }
    } catch (error) {
      const code = (error as { code?: string }).code
      console.error('Firebase Google sign-in failed:', code ?? error)
      if (code === 'auth/operation-not-allowed') return { ok: false, reason: 'provider-disabled' }
      if (code === 'auth/unauthorized-domain') return { ok: false, reason: 'unauthorized-domain' }
      if (code === 'auth/popup-blocked') return { ok: false, reason: 'popup-blocked' }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { ok: false, reason: 'popup-closed' }
      }
      return { ok: false, reason: 'failed' }
    }
  }

  async function logout(): Promise<void> {
    await signOut(auth)
    setIsAdmin(false)
  }

  return (
    <AdminContext.Provider value={{ isAdmin, authReady, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
