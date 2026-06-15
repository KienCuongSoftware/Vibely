import React from 'react'
import { FeedStyleVideoDetailPage } from '../components/watch/FeedStyleVideoDetailPage.jsx'
import { buildProfileVideoUrl } from '../utils/videoPublicId.js'

/** Trang chi tiết video công khai — /@user/video/{id}, giao diện giống For You. */
export function PublicVideoDetailPage() {
  return (
    <FeedStyleVideoDetailPage
      activeMenu={null}
      buildDetailVideoUrl={buildProfileVideoUrl}
      forYouStyle
      relatedLayout="grid"
    />
  )
}
