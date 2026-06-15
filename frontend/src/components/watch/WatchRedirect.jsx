import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../api/client.js'
import { useAuth } from '../../state/useAuth.js'
import {
  buildProfileVideoUrl,
  isVideoPublicId,
  videoPublicIdOf,
} from '../../utils/videoPublicId.js'

/**
 * /watch/{publicId} → trang chi tiết TikTok-style /@user/video/{publicId}
 * (không redirect về /foryou?v=).
 */
export function WatchRedirect() {
  const { publicId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const id = String(publicId ?? '').trim()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isVideoPublicId(id)) return
    let cancelled = false
    apiClient
      .getVideo(id, { token })
      .then((video) => {
        if (cancelled) return
        const path = buildProfileVideoUrl(video?.authorUsername, videoPublicIdOf(video))
        if (path) {
          navigate(path, { replace: true })
          return
        }
        setFailed(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, navigate, token])

  if (!isVideoPublicId(id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-zinc-300">
        <div>
          <p className="text-lg font-semibold text-white">Liên kết video không hợp lệ</p>
          <p className="mt-2 text-sm text-zinc-400">
            Video được chia sẻ bằng mã UUID. Liên kết cũ dạng số không còn được hỗ trợ.
          </p>
          <a href="/foryou" className="mt-4 inline-block text-sm text-red-400 hover:text-red-300">
            Về trang feed
          </a>
        </div>
      </div>
    )
  }

  if (failed) {
    return <Navigate to="/foryou" replace />
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black text-zinc-400"
      aria-busy="true"
      aria-label="Đang mở video"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200" />
    </div>
  )
}
