import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { SearchModal } from '../components/search/SearchModal'

const SearchModalContext = createContext(null)

export function SearchModalProvider({ children }) {
  const [open, setOpen] = useState(false)

  const openSearch = useCallback(() => setOpen(true), [])
  const closeSearch = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({
      open,
      openSearch,
      closeSearch,
    }),
    [closeSearch, open, openSearch],
  )

  return (
    <SearchModalContext.Provider value={value}>
      {children}
      <SearchModal open={open} onClose={closeSearch} />
    </SearchModalContext.Provider>
  )
}

export function useSearchModal() {
  return useContext(SearchModalContext)
}
