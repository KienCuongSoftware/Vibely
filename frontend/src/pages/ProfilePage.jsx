import React from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'

const DEFAULT_USER_AVATAR_URL = '/images/users/default-avatar.jpeg'

export function ProfilePage() {
  const { username } = useParams()
  const { token, user, refreshProfile } = useAuth()
  const [status, setStatus] = useState('')
  const [publicProfile, setPublicProfile] = useState(null)

  useEffect(() => {
    if (username) {
      let isMounted = true
      apiClient
        .getPublicProfile(username)
        .then((profile) => {
          if (!isMounted) return
          setPublicProfile(profile)
          setStatus('')
        })
        .catch((error) => {
          if (!isMounted) return
          setPublicProfile(null)
          setStatus(error.message)
        })
      return () => {
        isMounted = false
      }
    }

    if (!token) return
    refreshProfile()
      .then(() => setStatus('Đã tải hồ sơ'))
      .catch((error) => setStatus(error.message))
  }, [token, refreshProfile, username])

  const profile = username ? publicProfile : user
  const isPublicProfileLoading = Boolean(username) && !publicProfile && !status

  if (!username && !token) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xl font-semibold">Hồ sơ</h2>
        <p className="mt-2 text-zinc-300">Vui lòng đăng nhập để xem hồ sơ.</p>
      </section>
    )
  }

  if (isPublicProfileLoading) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-300">Đang tải hồ sơ...</p>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xl font-semibold">Hồ sơ @{profile?.username ?? '-'}</h2>
      <div className="flex items-center gap-3">
        <img
          className="h-16 w-16 rounded-full border border-zinc-700 object-cover"
          src={profile?.avatarUrl ?? DEFAULT_USER_AVATAR_URL}
          alt="avatar hồ sơ"
        />
      </div>
      <div className="grid gap-2 text-sm text-zinc-200">
        <p><span className="font-medium">Mã người dùng:</span> {profile?.id ?? '-'}</p>
        <p><span className="font-medium">Vibely ID:</span> @{profile?.username ?? '-'}</p>
        <p><span className="font-medium">Tên hiển thị:</span> {profile?.displayName ?? '-'}</p>
        {!username ? <p><span className="font-medium">Email:</span> {profile?.email ?? '-'}</p> : null}
        <p><span className="font-medium">Tiểu sử:</span> {profile?.bio ?? '-'}</p>
      </div>
      {status && <p className="text-xs text-zinc-400">{status}</p>}
    </section>
  )
}
