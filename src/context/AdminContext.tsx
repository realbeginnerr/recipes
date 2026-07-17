import { createContext, useContext, useState } from 'react'

const ADMIN_PIN_HASH = import.meta.env.VITE_ADMIN_PIN_HASH as string
const SESSION_KEY = 'admin_auth'

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

type AdminContextType = {
  isAdmin: boolean
  login: (pin: string) => Promise<boolean>
  logout: () => void
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: async () => false,
  logout: () => {},
})

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')

  async function login(pin: string): Promise<boolean> {
    const hashed = await hashPin(pin)
    if (hashed === ADMIN_PIN_HASH) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setIsAdmin(true)
      return true
    }
    return false
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setIsAdmin(false)
  }

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
