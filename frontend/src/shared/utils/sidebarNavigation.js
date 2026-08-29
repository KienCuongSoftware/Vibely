import { markFollowingPreferFeedFromSidebar } from '@/features/feed/utils/followingPageView.js'
import { tryOpenGuestLogin } from '@/features/auth/utils/guestAuthGate.js'
import { buildStudioUploadLoginHref } from '@/features/auth/utils/loginRedirect.js'
import {
  STUDIO_UPLOAD_PHOTO_PATH,
  STUDIO_UPLOAD_VIDEO_PATH,
} from '@/features/upload/utils/studioUploadPaths.js'

export function goStudioUpload(navigate, token, tab = 'video') {
  const path = tab === 'photo' ? STUDIO_UPLOAD_PHOTO_PATH : STUDIO_UPLOAD_VIDEO_PATH
  if (!token) {
    navigate(buildStudioUploadLoginHref(tab))
    return
  }
  navigate(path)
}

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
      if (!tryOpenGuestLogin()) navigate('/login')
      return
    }
    navigate(profilePath || '/profile')
    return
  }

  if (id === 'explore') {
    navigate('/explore')
    return
  }

  if (id === 'live') {
    navigate('/live')
    return
  }

  if (id === 'upload') {
    goStudioUpload(navigate, token, 'video')
    return
  }

  if (id === 'following') {
    markFollowingPreferFeedFromSidebar()
    navigate('/following')
    return
  }

  if (id === 'friends') {
    if (!token) {
      if (!tryOpenGuestLogin()) navigate('/login')
      return
    }
    navigate('/friends')
    return
  }

  if (id === 'messages') {
    if (!token) {
      if (!tryOpenGuestLogin()) navigate('/login')
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
