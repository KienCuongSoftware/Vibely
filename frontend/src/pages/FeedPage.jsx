import React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'
import {
  IoArrowRedo,
  IoBookmark,
  IoChatbubble,
  IoChevronDown,
  IoChevronUp,
  IoCompass,
  IoEllipsisHorizontal,
  IoHeart,
  IoHome,
  IoLogOutOutline,
  IoNotifications,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoVideocam,
} from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'

const DEFAULT_USER_AVATAR_URL = '/images/users/default-avatar.jpeg'

function formatCompactCount(value) {
  const count = Number(value ?? 0)
  if (count >= 1_000_000) {
    const formatted = count >= 10_000_000 ? (count / 1_000_000).toFixed(0) : (count / 1_000_000).toFixed(1)
    return `${formatted.replace(/\.0$/, '')}M`
  }
  if (count >= 1_000) {
    const formatted = count >= 10_000 ? (count / 1_000).toFixed(0) : (count / 1_000).toFixed(1)
    return `${formatted.replace(/\.0$/, '')}K`
  }
  return String(count)
}

const guestFallbackVideos = [
  {
    id: 'guest-1',
    title: 'Mèo chill buổi tối',
    description: 'Video demo giao diện Vibely cho chế độ chưa đăng nhập.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://picsum.photos/seed/vibely-guest/720/1280',
    avatarUrl: 'https://i.pravatar.cc/120?img=15',
    authorUsername: 'vibely_demo',
    likeCount: 1600000,
    commentCount: 9007,
    shareCount: 770400,
    favoriteCount: 119400,
  },
]

function ForYouFeedPage({ token, user, onLogout }) {
  const [videos, setVideos] = useState(guestFallbackVideos)
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeMenu, setActiveMenu] = useState('latest')
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [shared, setShared] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const accountMenuRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    const request =
      token && activeMenu === 'following'
        ? apiClient.getFollowingFeed(token, { page: 0, size: 8 })
        : apiClient.getFeed({ page: 0, size: 8, sort: 'latest' })

    request
      .then((response) => {
        const items = response?.items ?? []
        if (!isMounted || items.length === 0) return
        const normalized = items.map((item) => ({
          ...item,
          avatarUrl: `https://i.pravatar.cc/120?u=${encodeURIComponent(item.authorUsername ?? item.id)}`,
          shareCount: item.likeCount ? item.likeCount * 2 : 1280,
          favoriteCount: item.commentCount ? item.commentCount * 3 : 640,
        }))
        setVideos(normalized)
      })
      .catch(() => {
        if (isMounted) {
          setVideos(guestFallbackVideos)
        }
      })
    return () => {
      isMounted = false
    }
  }, [token, activeMenu])

  useEffect(() => {
    if (!showAccountMenu) return undefined

    const handleOutsideClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setShowAccountMenu(false)
      }
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowAccountMenu(false)
        setShowLogoutConfirm(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showAccountMenu])

  useEffect(() => {
    if (!showLogoutConfirm) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowLogoutConfirm(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showLogoutConfirm])

  const activeVideo = videos[activeIndex] ?? guestFallbackVideos[0]
  const mainMenuItems = [
    {
      id: 'latest',
      label: 'Đề xuất',
      icon: IoHome,
    },
    {
      id: 'explore',
      label: 'Khám phá',
      icon: IoCompass,
    },
    {
      id: 'following',
      label: 'Đã follow',
      icon: IoPeople,
    },
    ...(token
      ? [
          { id: 'friends', label: 'Bạn bè', icon: IoPeople },
          { id: 'messages', label: 'Tin nhắn', icon: IoPaperPlane },
          { id: 'activity', label: 'Hoạt động', icon: IoNotifications },
        ]
      : []),
    {
      id: 'live',
      label: 'LIVE',
      icon: IoVideocam,
    },
    {
      id: 'upload',
      label: 'Tải lên',
      icon: MdOutlineFileUpload,
    },
    {
      id: 'profile',
      label: 'Hồ sơ',
      icon: IoPerson,
    },
    {
      id: 'more',
      label: 'Thêm',
      icon: IoEllipsisHorizontal,
    },
  ]

  return (
    <section className="flex min-h-screen bg-black text-zinc-100">
      <aside className="flex w-72 flex-col border-r border-zinc-900 px-4 py-5">
        <h1 className="mb-5 text-3xl font-black tracking-tight">Vibely</h1>
        <div className="mb-5 rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-400">Tìm kiếm</div>
        <nav className="space-y-1">
          {mainMenuItems.map((item) => {
            const isActive = activeMenu === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                  isActive ? 'bg-zinc-900 font-semibold text-red-500' : 'hover:bg-zinc-900'
                }`}
                onClick={() => setActiveMenu(item.id)}
              >
                <Icon className="text-base" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        {!token ? (
          <div className="my-5 border-t border-zinc-900 pt-4">
            <p className="mb-3 text-sm text-zinc-400">Đăng nhập để thích, bình luận và theo dõi nhà sáng tạo.</p>
            <Link
              to="/login"
              className="block rounded-md bg-red-600 px-3 py-2 text-center font-semibold text-white hover:bg-red-500"
            >
              Đăng nhập
            </Link>
          </div>
        ) : null}
        <div className="mt-auto space-y-2 text-xs text-zinc-500">
          <p>Công ty</p>
          <p>Chương trình</p>
          <p>Điều khoản và chính sách</p>
          <p>© 2026 Vibely</p>
        </div>
      </aside>

      <div className="relative flex flex-1 items-center justify-center px-6 py-5">
        <div className="absolute right-8 top-5 z-10 flex items-center gap-3 rounded-full bg-zinc-900/90 px-4 py-2 text-sm">
          <button className="text-zinc-300 hover:text-white">Xu</button>
          <button className="text-zinc-300 hover:text-white">Tải app</button>
          <button className="text-zinc-300 hover:text-white">Ứng dụng</button>
          {!token ? (
            <Link to="/login" className="rounded-full bg-red-600 px-4 py-1 font-semibold hover:bg-red-500">
              Đăng nhập
            </Link>
          ) : (
            <div className="relative" ref={accountMenuRef}>
              <button
                className="h-8 w-8 overflow-hidden rounded-full border border-zinc-600 transition hover:border-zinc-400"
                onClick={() => setShowAccountMenu((prev) => !prev)}
              >
                <img
                  className="h-full w-full object-cover"
                  src={user?.avatarUrl ?? DEFAULT_USER_AVATAR_URL}
                  alt="avatar người dùng"
                />
              </button>
              {showAccountMenu ? (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl">
                  <Link
                    to={user?.username ? `/@${user.username}` : '/profile'}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <IoPerson className="text-base" />
                    Xem hồ sơ
                  </Link>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => {
                      setShowAccountMenu(false)
                      setShowLogoutConfirm(true)
                    }}
                  >
                    <IoLogOutOutline className="text-base" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="relative h-[88vh] w-[390px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          {activeVideo.videoUrl ? (
            <video
              className="h-full w-full object-cover"
              src={activeVideo.videoUrl}
              poster={activeVideo.thumbnailUrl ?? undefined}
              controls
              muted
              playsInline
            />
          ) : (
            <img
              className="h-full w-full object-cover"
              src={activeVideo.thumbnailUrl ?? guestFallbackVideos[0].thumbnailUrl}
              alt={activeVideo.title}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-4">
            <p className="text-sm font-semibold">@{activeVideo.authorUsername}</p>
            <p className="text-sm text-zinc-200">{activeVideo.title}</p>
            <p className="text-xs text-zinc-300">{activeVideo.description}</p>
          </div>
        </div>

        <div className="ml-4 flex flex-col items-center gap-4">
          <button className="relative h-12 w-12 rounded-full border-2 border-white/90 bg-zinc-700 p-[2px]">
            <img
              className="h-full w-full rounded-full object-cover"
              src={activeVideo.avatarUrl ?? 'https://i.pravatar.cc/120?img=15'}
              alt={`avatar-${activeVideo.authorUsername}`}
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-1 text-[10px] leading-3 text-white">
              +
            </span>
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-lg"
            onClick={() => setLiked((prev) => !prev)}
          >
            <IoHeart className={liked ? 'text-red-500' : ''} />
          </button>
          <span className="text-xs text-zinc-300">{formatCompactCount(activeVideo.likeCount)}</span>
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-lg">
            <IoChatbubble />
          </button>
          <span className="text-xs text-zinc-300">{formatCompactCount(activeVideo.commentCount)}</span>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-lg"
            onClick={() => setBookmarked((prev) => !prev)}
          >
            <IoBookmark className={bookmarked ? 'text-white' : ''} />
          </button>
          <span className="text-xs text-zinc-300">{formatCompactCount(activeVideo.favoriteCount)}</span>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-lg"
            onClick={() => setShared((prev) => !prev)}
          >
            <IoArrowRedo className={shared ? 'text-white' : ''} />
          </button>
          <span className="text-xs text-zinc-300">{formatCompactCount(activeVideo.shareCount)}</span>
        </div>

        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          <button
            className="rounded-full bg-zinc-900/90 px-3 py-1 text-sm disabled:opacity-40"
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
          >
            <IoChevronUp />
          </button>
          <button
            className="rounded-full bg-zinc-900/90 px-3 py-1 text-sm disabled:opacity-40"
            disabled={activeIndex >= videos.length - 1}
            onClick={() => setActiveIndex((prev) => Math.min(prev + 1, videos.length - 1))}
          >
            <IoChevronDown />
          </button>
        </div>
      </div>
      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-sm rounded-xl bg-zinc-800 p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold leading-snug">Bạn có chắc chắn muốn đăng xuất?</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-base">
              <button
                className="rounded-md bg-zinc-700 py-2 font-semibold text-zinc-200 hover:bg-zinc-600"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Hủy
              </button>
              <button
                className="rounded-md border border-red-500 py-2 font-semibold text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  onLogout()
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function FeedPage() {
  const { token, user, logout } = useAuth()
  return <ForYouFeedPage token={token} user={user} onLogout={logout} />
}
