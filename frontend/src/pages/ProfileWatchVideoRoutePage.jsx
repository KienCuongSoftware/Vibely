import React from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { VideoWatchPage } from './VideoWatchPage.jsx'
import { isVideoPublicId } from '../utils/videoPublicId.js'

/** /@user/{publicId} — xem video từ lưới hồ sơ (VideoWatchPage). */
export function ProfileWatchVideoRoutePage() {
  const { username, publicId } = useParams()
  if (!isVideoPublicId(publicId)) {
    const slug = String(username ?? '').trim().replace(/^@+/, '')
    return <Navigate to={slug ? `/@${encodeURIComponent(slug)}` : '/foryou'} replace />
  }
  return <VideoWatchPage sidebarVariant="creator" />
}
