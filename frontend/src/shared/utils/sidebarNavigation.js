import { markFollowingPreferFeedFromSidebar } from '@/features/feed/utils/followingPageView.js'

/**
 * Central sidebar menu routing — keep "Đã follow" and other items consistent across pages.
 */
export function handleSidebarMenuSelect(
  navigate,
  id,
  { token, profilePath, onUnhandled, onActivity } = {},
) {
  if (id === 'more') return

  if (id === 'profile') {
    if (!token) {
      navigate('/login')
      return
    }
    navigate(profilePath || '/profile')
    return
  }

  if (id === 'explore') {
    if (!token) {
      navigate('/login')
      return
    }
    navigate('/explore')
    return
  }

  if (id === 'upload') {
    if (!token) {
      navigate('/login')
      return
    }
    navigate('/vibelystudio/upload')
    return
  }

  if (id === 'following') {
    if (!token) {
      navigate('/login')
      return
    }
    markFollowingPreferFeedFromSidebar()
    navigate('/following')
    return
  }

  if (id === 'friends') {
    if (!token) {
      navigate('/login')
      return
    }
    navigate('/friends')
    return
  }

  if (id === 'messages') {
    if (!token) {
      navigate('/login')
      return
    }
    navigate('/messages')
    return
  }

  if (id === 'activity') {
    if (!token) {
      navigate('/login')
      return
    }
    if (typeof onActivity === 'function') {
      onActivity()
      return
    }
  }

  if (id === 'latest') {
    navigate('/')
    return
  }

  if (typeof onUnhandled === 'function') {
    onUnhandled(id)
    return
  }

  navigate('/')
}
