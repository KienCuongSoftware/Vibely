import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LIVE_PATHS } from '@/features/live/constants/liveConstants.js'
import { useLiveAuthGate } from '@/features/live/hooks/useLiveInteractions.js'
import { handleSidebarMenuSelect } from '@/shared/utils/sidebarNavigation.js'

export function useLiveNavigation() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const requireAuth = useLiveAuthGate()
  const profilePath = user?.username ? `/@${user.username}` : '/profile'

  const openLive = useCallback((live) => {
    if (live?.id) navigate(LIVE_PATHS.detail(live.id))
  }, [navigate])

  const goLive = useCallback(() => {
    if (requireAuth()) navigate(LIVE_PATHS.create)
  }, [navigate, requireAuth])

  /** History back when the user came from inside the app, discovery otherwise. */
  const back = useCallback(() => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(LIVE_PATHS.discovery)
  }, [navigate])

  const selectSidebarMenu = useCallback((id) => {
    handleSidebarMenuSelect(navigate, id, { token, profilePath })
  }, [navigate, profilePath, token])

  return { navigate, openLive, goLive, back, selectSidebarMenu, profilePath }
}
