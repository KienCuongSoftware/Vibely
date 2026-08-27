import { lazy } from 'react'

const CHUNK_RELOAD_KEY = 'vibely:chunk-reload'

/**
 * Lazy import that reloads once when a chunk fails (stale deploy hash or flaky network).
 * Incognito has no cached chunks so it hits this more often than normal tabs.
 */
export function lazyWithChunkRetry(factory) {
  return lazy(() =>
    factory()
      .then((mod) => {
        try {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY)
        } catch {
          /* ignore */
        }
        return mod
      })
      .catch((error) => {
        try {
          if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
            window.location.reload()
            return new Promise(() => {})
          }
          sessionStorage.removeItem(CHUNK_RELOAD_KEY)
        } catch {
          /* ignore */
        }
        throw error
      }),
  )
}

export const OPEN_LOGIN_AFTER_LOAD_KEY = 'vibely:open-login'

/** After logout: skip /me + /refresh once so a lingering cookie cannot bounce admins back. */
export const FORCE_GUEST_AFTER_LOAD_KEY = 'vibely:force-guest'

