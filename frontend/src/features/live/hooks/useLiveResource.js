import { useCallback, useEffect, useRef, useState } from 'react'

export const RESOURCE_STATUS = Object.freeze({
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
})

/**
 * Loads one async resource with stale-response protection.
 * `loader` must be memoized by the caller; it re-runs whenever it changes.
 */
export function useLiveResource(loader, { enabled = true } = {}) {
  const [state, setState] = useState({ status: RESOURCE_STATUS.LOADING, data: null, error: null })
  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setState((prev) => ({ ...prev, status: RESOURCE_STATUS.LOADING, error: null }))
    try {
      const data = await loader()
      if (requestId === requestIdRef.current) {
        setState({ status: RESOURCE_STATUS.SUCCESS, data, error: null })
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setState({ status: RESOURCE_STATUS.ERROR, data: null, error })
      }
    }
  }, [loader])

  /** Background update: keeps the current data on screen and ignores failures. */
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      const data = await loader()
      if (requestId === requestIdRef.current) {
        setState({ status: RESOURCE_STATUS.SUCCESS, data, error: null })
      }
    } catch {
      // keep showing the last successful data
    }
  }, [loader])

  useEffect(() => {
    if (!enabled) return undefined
    void load()
    return () => {
      requestIdRef.current += 1
    }
  }, [enabled, load])

  const setData = useCallback((updater) => {
    setState((prev) => ({
      ...prev,
      data: typeof updater === 'function' ? updater(prev.data) : updater,
    }))
  }, [])

  return { ...state, reload: load, refresh, setData }
}
