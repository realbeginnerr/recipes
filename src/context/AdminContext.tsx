import { createContext, useContext, useState } from 'react'

const ADMIN_PIN = 'me_istj'
const SESSION_KEY = 'admin_auth'

type AdminContextType = {
  isAdmin: boolean
  login: (pin: string) => boolean
  logout: () => void
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: () => false,
  logout: () => {},
})

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')

  function login(pin: string): boolean {
    if (pin === ADMIN_PIN) {
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
