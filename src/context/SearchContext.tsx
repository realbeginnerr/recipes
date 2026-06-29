import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type SearchContextValue = {
  searchInput: string
  setSearchInput: (value: string) => void
  appliedSearch: string
  applySearch: () => void
  homeVersion: number
  resetHome: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [homeVersion, setHomeVersion] = useState(0)

  const applySearch = useCallback(() => {
    setAppliedSearch(searchInput.trim())
  }, [searchInput])

  const resetHome = useCallback(() => {
    setSearchInput('')
    setAppliedSearch('')
    setHomeVersion((version) => version + 1)
  }, [])

  const value = useMemo(
    () => ({
      searchInput,
      setSearchInput,
      appliedSearch,
      applySearch,
      homeVersion,
      resetHome,
    }),
    [searchInput, appliedSearch, applySearch, homeVersion, resetHome],
  )

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider')
  }
  return context
}
