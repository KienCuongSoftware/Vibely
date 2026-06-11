import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ActivityModalContext = createContext(null)

export function ActivityModalProvider({ children }) {
  const [open, setOpen] = useState(false)

  const openActivity = useCallback(() => setOpen(true), [])
  const closeActivity = useCallback(() => setOpen(false), [])
  const toggleActivity = useCallback(() => setOpen((prev) => !prev), [])

  const value = useMemo(
    () => ({
      open,
      openActivity,
      closeActivity,
      toggleActivity,
    }),
    [closeActivity, open, openActivity, toggleActivity],
  )

  return (
    <ActivityModalContext.Provider value={value}>
      {children}
    </ActivityModalContext.Provider>
  )
}

export function useActivityModal() {
  return useContext(ActivityModalContext)
}
