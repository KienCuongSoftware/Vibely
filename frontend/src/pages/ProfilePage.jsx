import React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'
import { Sidebar } from '../components/Sidebar'
import { TooltipHoverWrap } from '../components/TooltipControls'
import { AccountActionsPill } from '../components/AccountActionsPill'
import {
  IoAlbumsOutline,
  IoArrowBack,
  IoArrowRedo,
  IoBookmarkOutline,
  IoCheckmark,
  IoCameraOutline,
  IoCompass,
  IoClose,
  IoEllipsisHorizontal,
  IoHeartOutline,
  IoHome,
  IoLogOutOutline,
  IoNotifications,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoSettingsOutline,
  IoVideocam,
} from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'
import { LuGrid2X2 } from 'react-icons/lu'

const DEFAULT_USER_AVATAR_URL = '/images/users/default-avatar.jpeg'

/** Legacy auto-filled OAuth bios — không hiển thị như tiểu sử thật. */
function resolveProfileBio(rawBio) {
  const trimmed = String(rawBio ?? '').trim()
  if (!trimmed) return null
  if (/^(Facebook|Google) user:/i.test(trimmed)) return null
  return trimmed
}

function profileHrefFromAuthUsername(raw) {
  const id = String(raw ?? '')
    .trim()
    .replace(/^@/, '')
  return id ? `/@${encodeURIComponent(id)}` : '/profile'
}

export function ProfilePage() {
  const { username } = useParams()
  const { token, user, refreshProfile, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [favoritesSubTab, setFavoritesSubTab] = useState('posts')
  const [status, setStatus] = useState('')
  const [publicProfile, setPublicProfile] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
  })
  const [initialEditForm, setInitialEditForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
  })
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)
  const [avatarEditorSrc, setAvatarEditorSrc] = useState('')
  const [avatarEditorZoom, setAvatarEditorZoom] = useState(1)
  const avatarFileInputRef = useRef(null)
  const accountMenuRef = useRef(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [bookmarkItems, setBookmarkItems] = useState([])
  const [bookmarkTotal, setBookmarkTotal] = useState(0)
  const [likedItems, setLikedItems] = useState([])
  const [likedTotal, setLikedTotal] = useState(0)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [likedLoading, setLikedLoading] = useState(false)
  const [libraryError, setLibraryError] = useState('')
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [newCollectionStep, setNewCollectionStep] = useState('form')
  const [collectionDraftName, setCollectionDraftName] = useState('')
  const [collectionDraftPublic, setCollectionDraftPublic] = useState(false)
  const [collectionPickIds, setCollectionPickIds] = useState(() => new Set())

  const COLLECTION_NAME_MAX = 30

  const closeNewCollectionModal = useCallback(() => {
    setNewCollectionOpen(false)
    setNewCollectionStep('form')
    setCollectionDraftName('')
    setCollectionDraftPublic(false)
    setCollectionPickIds(new Set())
  }, [])

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

  useEffect(() => {
    if (!newCollectionOpen) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeNewCollectionModal()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [newCollectionOpen, closeNewCollectionModal])

  const profile = username ? publicProfile : user
  const isPublicProfileLoading = Boolean(username) && !publicProfile && !status
  const normalizeUsername = (value) => String(value ?? '').trim().replace(/^@/, '').toLowerCase()
  const isOwnProfile =
    Boolean(user?.username) &&
    Boolean(profile?.username) &&
    normalizeUsername(user.username) === normalizeUsername(profile.username)

  const profileMainTab =
    searchParams.get('tab') === 'favorites'
      ? 'favorites'
      : searchParams.get('tab') === 'liked'
        ? 'liked'
        : 'videos'

  const setProfileMainTab = (next) => {
    if (next === 'videos') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: next }, { replace: true })
    }
  }

  useEffect(() => {
    if (!token || !isOwnProfile) {
      setBookmarkItems([])
      setBookmarkTotal(0)
      return
    }
    if (profileMainTab !== 'favorites') {
      return
    }
    let live = true
    setBookmarkLoading(true)
    setLibraryError('')
    apiClient
      .getMyBookmarkedVideos(token, { page: 0, size: 48 })
      .then((data) => {
        if (!live) return
        setBookmarkItems(data?.items ?? [])
        setBookmarkTotal(Number(data?.total ?? 0))
      })
      .catch((e) => {
        if (live) setLibraryError(e.message)
      })
      .finally(() => {
        if (live) setBookmarkLoading(false)
      })
    return () => {
      live = false
    }
  }, [token, isOwnProfile, profileMainTab])

  useEffect(() => {
    if (!token || !isOwnProfile) {
      setLikedItems([])
      setLikedTotal(0)
      return
    }
    if (profileMainTab !== 'liked') {
      return
    }
    let live = true
    setLikedLoading(true)
    setLibraryError('')
    apiClient
      .getMyLikedVideos(token, { page: 0, size: 48 })
      .then((data) => {
        if (!live) return
        setLikedItems(data?.items ?? [])
        setLikedTotal(Number(data?.total ?? 0))
      })
      .catch((e) => {
        if (live) setLibraryError(e.message)
      })
      .finally(() => {
        if (live) setLikedLoading(false)
      })
    return () => {
      live = false
    }
  }, [token, isOwnProfile, profileMainTab])

  const collectionTotal = 0

  const bioDraftLength = editForm.bio.length
  const normalizeEditForm = (value) => ({
    username: normalizeUsername(value?.username),
    displayName: String(value?.displayName ?? '').trim(),
    bio: String(value?.bio ?? '').trim(),
    avatarUrl: String(value?.avatarUrl ?? '').trim(),
  })
  const hasEditChanges =
    JSON.stringify(normalizeEditForm(editForm)) !== JSON.stringify(normalizeEditForm(initialEditForm))
  const normalizedEditUsername = normalizeUsername(editForm.username)
  const usernameValidationMessage =
    normalizedEditUsername.length < 2 ? 'Vibely ID phải gồm ít nhất 2 ký tự' : ''
  const canSubmitEditForm =
    hasEditChanges &&
    !savingEdit &&
    !usernameValidationMessage &&
    normalizedEditUsername.length > 0 &&
    editForm.displayName.trim().length > 0

  useEffect(() => {
    if (!username && !token) {
      document.title = 'Hồ sơ | Vibely'
      return
    }
    if (isPublicProfileLoading) {
      document.title = 'Đang tải hồ sơ | Vibely'
      return
    }
    const p = profile
    if (!p?.username) {
      document.title = 'Hồ sơ | Vibely'
      return
    }
    const display = String(p.displayName ?? '').trim() || 'Người dùng Vibely'
    const id = String(p.username).trim().replace(/^@/, '').toLowerCase()
    document.title = `${display} (@${id}) | Vibely`
  }, [username, token, isPublicProfileLoading, profile])

  const menuItems = [
    { id: 'latest', label: 'Đề xuất', icon: IoHome },
    { id: 'explore', label: 'Khám phá', icon: IoCompass },
    { id: 'following', label: 'Đã follow', icon: IoPeople },
    ...(token
      ? [
          { id: 'friends', label: 'Bạn bè', icon: IoPeople },
          { id: 'messages', label: 'Tin nhắn', icon: IoPaperPlane },
          { id: 'activity', label: 'Hoạt động', icon: IoNotifications },
        ]
      : []),
    { id: 'live', label: 'LIVE', icon: IoVideocam },
    { id: 'upload', label: 'Tải lên', icon: MdOutlineFileUpload },
    { id: 'profile', label: 'Hồ sơ', icon: IoPerson },
    { id: 'more', label: 'Thêm', icon: IoEllipsisHorizontal },
  ]

  const activeMenu = 'profile'
  const handleSelectMenu = (id) => {
    if (id === 'profile' || id === 'more') return
    // Profile page tập trung nội dung trang profile; các mục khác quay về feed.
    navigate('/foryou', { replace: true })
  }

  const openEditProfileModal = () => {
    if (!profile) return
    const formSnapshot = {
      username: profile.username ?? '',
      displayName: profile.displayName ?? '',
      bio: resolveProfileBio(profile.bio) ?? '',
      avatarUrl: profile.avatarUrl && profile.avatarUrl !== DEFAULT_USER_AVATAR_URL ? profile.avatarUrl : '',
    }
    setEditForm(formSnapshot)
    setInitialEditForm(formSnapshot)
    setEditError('')
    setIsEditModalOpen(true)
  }

  const handleSubmitProfileEdit = async (event) => {
    event.preventDefault()
    if (!token || !canSubmitEditForm) return
    setSavingEdit(true)
    setEditError('')
    try {
      const normalizedUsername = normalizeUsername(editForm.username)
      await updateProfile({
        username: normalizedUsername,
        displayName: editForm.displayName.trim(),
        bio: editForm.bio.trim(),
        avatarUrl: editForm.avatarUrl.trim(),
      })
      setStatus('Cập nhật hồ sơ thành công')
      setIsEditModalOpen(false)
    } catch (error) {
      setEditError(error.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handlePickAvatarFromDevice = () => {
    avatarFileInputRef.current?.click()
  }

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setEditError('Vui lòng chọn file ảnh hợp lệ')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditError('Ảnh đại diện tối đa 5MB')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarEditorSrc(reader.result)
        setAvatarEditorZoom(1)
        setIsAvatarEditorOpen(true)
        setEditError('')
      }
    }
    reader.onerror = () => setEditError('Không thể đọc ảnh, vui lòng thử lại')
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const applyAvatarEditor = () => {
    if (!avatarEditorSrc) return
    const image = new Image()
    image.onload = () => {
      const size = 512
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) {
        setEditError('Không thể xử lý ảnh, vui lòng thử lại')
        return
      }
      const baseScale = Math.max(size / image.width, size / image.height)
      const scale = baseScale * avatarEditorZoom
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const dx = (size - drawWidth) / 2
      const dy = (size - drawHeight) / 2
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, dx, dy, drawWidth, drawHeight)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setEditForm((prev) => ({ ...prev, avatarUrl: dataUrl }))
      setIsAvatarEditorOpen(false)
      setAvatarEditorSrc('')
    }
    image.onerror = () => {
      setEditError('Không thể xử lý ảnh, vui lòng thử lại')
    }
    image.src = avatarEditorSrc
  }

  return (
    <section className="flex h-dvh min-h-0 bg-black text-zinc-100">
      <Sidebar
        menuItems={menuItems}
        activeMenu={activeMenu}
        onSelectMenu={handleSelectMenu}
        token={token}
        user={profile ?? user}
        onLogout={token ? logout : undefined}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
        {token ? (
          <AccountActionsPill className="absolute right-8 top-5 z-10" tone="profile">
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap tip="Tài khoản">
                <button
                  type="button"
                  className="flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-700 transition hover:ring-zinc-500"
                  aria-label="Menu tài khoản"
                  aria-expanded={showAccountMenu}
                  aria-haspopup="menu"
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                >
                  <img
                    className="h-7 w-7 rounded-full object-cover"
                    src={
                      user?.avatarUrl && user.avatarUrl.trim()
                        ? user.avatarUrl
                        : DEFAULT_USER_AVATAR_URL
                    }
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                    }}
                  />
                </button>
              </TooltipHoverWrap>
              {showAccountMenu ? (
                <div
                  className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl"
                  role="menu"
                >
                  <Link
                    to={profileHrefFromAuthUsername(user?.username)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    role="menuitem"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <IoPerson className="text-base" />
                    Xem hồ sơ
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    role="menuitem"
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
          </AccountActionsPill>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        {!username && !token ? (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-xl font-semibold">Hồ sơ</h2>
            <p className="mt-2 text-zinc-300">Vui lòng đăng nhập để xem hồ sơ.</p>
          </section>
        ) : isPublicProfileLoading ? (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-300">Đang tải hồ sơ...</p>
          </section>
        ) : (
          <section className="flex min-h-0 w-full max-w-5xl flex-1 flex-col bg-black px-4 py-6 md:px-8">
            <div className="flex items-start gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-5">
                <img
                  className="h-28 w-28 rounded-full border border-zinc-800 object-cover md:h-32 md:w-32"
                  src={
                    profile?.avatarUrl && profile.avatarUrl.trim()
                      ? profile.avatarUrl
                      : DEFAULT_USER_AVATAR_URL
                  }
                  alt="avatar hồ sơ"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                    <h2 className="text-3xl font-bold leading-none">
                      {profile?.displayName ?? 'Người dùng Vibely'}
                    </h2>
                    <span className="text-zinc-500">|</span>
                    <p className="pt-1 text-base text-zinc-400">@{profile?.username ?? '-'}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
                    <span>
                      <span className="font-semibold text-zinc-100">0</span> Đã follow
                    </span>
                    <span>
                      <span className="font-semibold text-zinc-100">0</span> Follower
                    </span>
                    <span>
                      <span className="font-semibold text-zinc-100">0</span> Lượt thích
                    </span>
                  </div>

                  {isOwnProfile ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                        onClick={openEditProfileModal}
                      >
                        Sửa hồ sơ
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                      >
                        Quảng bá bài đăng
                      </button>
                      <button
                        type="button"
                        aria-label="Cài đặt hồ sơ"
                        className="cursor-pointer rounded-full border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-100 hover:bg-zinc-800"
                      >
                        <IoSettingsOutline />
                      </button>
                      <button
                        type="button"
                        aria-label="Chia sẻ hồ sơ"
                        className="cursor-pointer rounded-full border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-100 hover:bg-zinc-800"
                      >
                        <IoArrowRedo />
                      </button>
                    </div>
                  ) : null}

                  <p className="text-sm text-zinc-300">
                    {resolveProfileBio(profile?.bio) ?? 'Chưa có tiểu sử'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-b border-zinc-900">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex gap-1 text-sm sm:gap-6" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={profileMainTab === 'videos'}
                    className={`cursor-pointer px-2 py-3 sm:px-1 ${
                      profileMainTab === 'videos'
                        ? 'border-b-2 border-white font-semibold text-zinc-100'
                        : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={() => setProfileMainTab('videos')}
                  >
                    <span className="inline-flex items-center gap-2">
                      <LuGrid2X2 className="text-base" aria-hidden />
                      Video
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={profileMainTab === 'favorites'}
                    className={`cursor-pointer px-2 py-3 sm:px-1 ${
                      profileMainTab === 'favorites'
                        ? 'border-b-2 border-white font-semibold text-zinc-100'
                        : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={() => setProfileMainTab('favorites')}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IoBookmarkOutline className="text-lg" aria-hidden />
                      Yêu thích
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={profileMainTab === 'liked'}
                    className={`cursor-pointer px-2 py-3 sm:px-1 ${
                      profileMainTab === 'liked'
                        ? 'border-b-2 border-white font-semibold text-zinc-100'
                        : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={() => setProfileMainTab('liked')}
                  >
                    <span className="inline-flex items-center gap-2">
                      <IoHeartOutline className="text-lg" aria-hidden />
                      Đã thích
                    </span>
                  </button>
                </div>

                {profileMainTab === 'videos' ? (
                  <div className="mb-2 hidden items-center gap-1 rounded-md bg-zinc-900 p-1 text-xs text-zinc-300 md:flex">
                    <button
                      type="button"
                      className="cursor-pointer rounded bg-zinc-700 px-3 py-1 font-semibold text-zinc-100"
                    >
                      Mới nhất
                    </button>
                    <button type="button" className="cursor-pointer rounded px-3 py-1 hover:bg-zinc-800">
                      Thịnh hành
                    </button>
                    <button type="button" className="cursor-pointer rounded px-3 py-1 hover:bg-zinc-800">
                      Cũ nhất
                    </button>
                  </div>
                ) : null}
              </div>

              {profileMainTab === 'favorites' ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/90 py-2.5">
                  <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 text-xs text-zinc-300">
                    <button
                      type="button"
                      className={`cursor-pointer rounded-md px-3 py-1.5 font-semibold ${
                        favoritesSubTab === 'posts' ? 'bg-zinc-700 text-zinc-100' : 'hover:bg-zinc-800'
                      }`}
                      onClick={() => setFavoritesSubTab('posts')}
                    >
                      {isOwnProfile ? `Bài đăng ${bookmarkTotal}` : 'Bài đăng 0'}
                    </button>
                    <button
                      type="button"
                      className={`cursor-pointer rounded-md px-3 py-1.5 font-semibold ${
                        favoritesSubTab === 'collections'
                          ? 'bg-zinc-700 text-zinc-100'
                          : 'hover:bg-zinc-800'
                      }`}
                      onClick={() => setFavoritesSubTab('collections')}
                    >
                      Bộ sưu tập {collectionTotal}
                    </button>
                  </div>
                  {isOwnProfile ? (
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-900"
                      onClick={() => {
                        setNewCollectionOpen(true)
                        setNewCollectionStep('form')
                        setCollectionDraftName('')
                        setCollectionDraftPublic(false)
                        setCollectionPickIds(new Set())
                      }}
                    >
                      + Tạo bộ sưu tập mới
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {profileMainTab === 'videos' ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center py-14 text-center">
                <div className="mb-4 rounded-full bg-zinc-800 p-6 text-zinc-200">
                  <LuGrid2X2 className="text-3xl" aria-hidden />
                </div>
                <p className="text-3xl font-bold">Tải video đầu tiên của bạn lên</p>
                <p className="mt-1 text-base text-zinc-400">Video của bạn sẽ xuất hiện tại đây</p>
              </div>
            ) : null}

            {profileMainTab === 'favorites' ? (
              <div className="min-h-0 flex-1 px-2 py-4 sm:px-4 sm:py-5">
                {!isOwnProfile ? (
                  <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                    <IoBookmarkOutline
                      className="mb-4 h-28 w-28 shrink-0 text-zinc-100"
                      aria-hidden
                    />
                    <p className="text-lg font-semibold text-zinc-100">Bài đăng yêu thích</p>
                    <p className="mt-2 max-w-sm text-sm text-zinc-400">
                      Bài đăng yêu thích của người này ở chế độ riêng tư.
                    </p>
                  </div>
                ) : favoritesSubTab === 'posts' ? (
                  <>
                    {libraryError ? (
                      <p className="py-8 text-center text-sm text-red-400">{libraryError}</p>
                    ) : null}
                    {bookmarkLoading && bookmarkItems.length === 0 ? (
                      <p className="py-8 text-center text-sm text-zinc-500">Đang tải…</p>
                    ) : null}
                    {!bookmarkLoading && bookmarkItems.length > 0 ? (
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {bookmarkItems.map((v) => (
                          <li key={v.id}>
                            <Link to="/foryou" className="block">
                              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-600">
                                <img
                                  src={
                                    v.thumbnailUrl?.trim()
                                      ? v.thumbnailUrl
                                      : 'https://picsum.photos/seed/vibely-thumb/360/640'
                                  }
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-zinc-200">
                                {v.title ?? 'Video'}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : !bookmarkLoading && bookmarkItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                        <IoBookmarkOutline
                          className="mb-4 h-28 w-28 shrink-0 text-zinc-100"
                          aria-hidden
                        />
                        <p className="text-lg font-semibold text-zinc-100">Bài đăng yêu thích</p>
                        <p className="mt-2 max-w-sm text-sm text-zinc-400">
                          Bài đăng bạn yêu thích sẽ xuất hiện tại đây.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mx-auto flex max-w-sm flex-col items-center px-3 py-8 text-center sm:py-10">
                    <IoAlbumsOutline
                      className="mb-3 h-20 w-20 shrink-0 text-zinc-100 sm:h-24 sm:w-24"
                      aria-hidden
                    />
                    <p className="text-base font-semibold text-zinc-100 sm:text-lg">Bộ sưu tập của bạn</p>
                    <p className="mt-2 text-xs leading-snug text-zinc-400 sm:text-sm sm:leading-snug">
                      Chỉ thêm được video từ Yêu thích. Hãy yêu thích vài video trước, rồi quay lại tạo bộ sưu tập.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {profileMainTab === 'liked' ? (
              <div className="min-h-0 flex-1 px-2 py-4 sm:px-4 sm:py-5">
                {!isOwnProfile ? (
                  <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                    <IoHeartOutline className="mb-4 h-28 w-28 shrink-0 text-zinc-100" aria-hidden />
                    <p className="text-lg font-semibold text-zinc-100">Video đã thích</p>
                    <p className="mt-2 max-w-sm text-sm text-zinc-400">
                      Video đã thích của người này ở chế độ riêng tư.
                    </p>
                  </div>
                ) : (
                  <>
                    {libraryError ? (
                      <p className="py-8 text-center text-sm text-red-400">{libraryError}</p>
                    ) : null}
                    {likedLoading && likedItems.length === 0 ? (
                      <p className="py-8 text-center text-sm text-zinc-500">Đang tải…</p>
                    ) : null}
                    {!likedLoading && likedItems.length > 0 ? (
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {likedItems.map((v) => (
                          <li key={v.id}>
                            <Link to="/foryou" className="block">
                              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-600">
                                <img
                                  src={
                                    v.thumbnailUrl?.trim()
                                      ? v.thumbnailUrl
                                      : 'https://picsum.photos/seed/vibely-thumb/360/640'
                                  }
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-zinc-200">
                                {v.title ?? 'Video'}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : !likedLoading && likedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                        <IoHeartOutline className="mb-4 h-28 w-28 shrink-0 text-zinc-100" aria-hidden />
                        <p className="text-lg font-semibold text-zinc-100">Video đã thích</p>
                        <p className="mt-2 max-w-sm text-sm text-zinc-400">
                          Các video bạn thích sẽ xuất hiện tại đây.
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {status ? <p className="text-xs text-zinc-500">{status}</p> : null}
          </section>
        )}
        </div>
        {isEditModalOpen ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <h3 className="text-2xl font-semibold">Sửa hồ sơ</h3>
                <button
                  type="button"
                  aria-label="Đóng"
                  className="cursor-pointer rounded-full p-2 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <IoClose className="text-xl" />
                </button>
              </div>

              <form className="space-y-0 px-5 py-4" onSubmit={handleSubmitProfileEdit}>
                <div className="border-b border-zinc-800 pb-4">
                  <div className="mb-3 text-sm font-semibold text-zinc-100">Ảnh hồ sơ</div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handlePickAvatarFromDevice}
                      className="group relative cursor-pointer rounded-full"
                      aria-label="Đổi ảnh hồ sơ"
                    >
                      <img
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-zinc-700"
                        src={editForm.avatarUrl || profile?.avatarUrl || DEFAULT_USER_AVATAR_URL}
                        alt="Ảnh hồ sơ"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                        }}
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600 group-hover:bg-zinc-700">
                        <IoCameraOutline className="text-xs" />
                      </span>
                    </button>
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[96px_1fr] items-start gap-3 border-b border-zinc-800 py-4">
                  <label htmlFor="edit-profile-username" className="pt-2 text-sm font-semibold text-zinc-100">
                    Vibely ID
                  </label>
                  <div className="space-y-2">
                    <input
                      id="edit-profile-username"
                      className="w-full rounded bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-red-500/30 placeholder:text-zinc-500 focus:ring-2"
                      value={editForm.username}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, username: e.target.value.replace(/\s+/g, '') }))
                      }
                      placeholder="vibely.id"
                      required
                      minLength={2}
                      maxLength={24}
                    />
                    {usernameValidationMessage ? (
                      <p className="text-xs text-red-400">{usernameValidationMessage}</p>
                    ) : null}
                    <p className="text-xs text-zinc-400">
                      {typeof globalThis !== 'undefined' && globalThis.window?.location?.origin
                        ? globalThis.window.location.origin
                        : 'http://localhost:5173'}
                      /@{editForm.username || 'vibely.id'}
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-500">
                      Vibely ID chỉ có thể bao gồm chữ cái, chữ số, dấu gạch dưới và dấu chấm. Khi thay đổi TikTok ID, liên kết hồ sơ của bạn cũng sẽ thay đổi.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[96px_1fr] items-start gap-3 border-b border-zinc-800 py-4">
                  <label htmlFor="edit-profile-display-name" className="pt-2 text-sm font-semibold text-zinc-100">
                    Tên
                  </label>
                  <div className="space-y-2">
                    <input
                      id="edit-profile-display-name"
                      className="w-full rounded bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-red-500/30 placeholder:text-zinc-500 focus:ring-2"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Tên hiển thị"
                      required
                      maxLength={80}
                    />
                    <p className="text-xs text-zinc-500">Bạn chỉ có thể thay đổi biệt danh 7 ngày một lần.</p>
                  </div>
                </div>

                <div className="grid grid-cols-[96px_1fr] items-start gap-3 py-4">
                  <label htmlFor="edit-profile-bio" className="pt-2 text-sm font-semibold text-zinc-100">
                    Tiểu sử
                  </label>
                  <div className="space-y-2">
                    <textarea
                      id="edit-profile-bio"
                      className="h-24 w-full resize-none rounded bg-zinc-900 px-3 py-2 text-zinc-100 outline-none ring-red-500/30 placeholder:text-zinc-500 focus:ring-2"
                      value={editForm.bio}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value.slice(0, 300) }))}
                      placeholder="Tiểu sử"
                      maxLength={300}
                    />
                    <p className="text-xs text-zinc-500">{bioDraftLength}/300</p>
                  </div>
                </div>

                {editError ? <p className="text-sm text-red-400">{editError}</p> : null}

                <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                  <button
                    type="button"
                    className="cursor-pointer rounded-md bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={savingEdit}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={`rounded-md px-5 py-2 text-sm font-semibold transition ${
                      canSubmitEditForm
                        ? 'cursor-pointer bg-red-500 text-white hover:bg-red-400'
                        : 'cursor-not-allowed bg-zinc-900 text-zinc-500'
                    }`}
                    disabled={!canSubmitEditForm}
                  >
                    {savingEdit ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
        {isAvatarEditorOpen ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-2 text-zinc-100 hover:text-white"
                  onClick={() => setIsAvatarEditorOpen(false)}
                >
                  <IoArrowBack className="text-xl" />
                  <span className="text-2xl font-semibold">Chỉnh sửa ảnh</span>
                </button>
                <button
                  type="button"
                  aria-label="Đóng"
                  className="cursor-pointer rounded-full p-2 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => setIsAvatarEditorOpen(false)}
                >
                  <IoClose className="text-xl" />
                </button>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-lg">
                  <img
                    src={avatarEditorSrc}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ transform: `scale(${avatarEditorZoom})`, transformOrigin: 'center center' }}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    aria-hidden
                  >
                    <div
                      className="h-full aspect-square rounded-full"
                      style={{
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.86), inset 0 0 0 6px rgba(0,0,0,0.6)',
                      }}
                    />
                  </div>
                </div>

                <div className="mx-auto flex w-full max-w-[380px] items-center gap-4 px-2">
                  <span className="w-24 whitespace-nowrap text-sm text-zinc-200">Thu phóng</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={avatarEditorZoom}
                    onChange={(event) => setAvatarEditorZoom(Number(event.target.value))}
                    className="h-1 w-full cursor-pointer accent-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
                <button
                  type="button"
                  className="cursor-pointer rounded-md bg-zinc-800 px-6 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
                  onClick={() => setIsAvatarEditorOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md bg-red-500 px-6 py-2 text-sm font-semibold text-white hover:bg-red-400"
                  onClick={applyAvatarEditor}
                >
                  Đăng ký
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {newCollectionOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeNewCollectionModal()
            }}
          >
            <div
              className="flex max-h-[min(560px,90vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="relative flex shrink-0 items-center justify-center border-b border-zinc-800 px-4 py-3">
                {newCollectionStep === 'pick' ? (
                  <button
                    type="button"
                    aria-label="Quay lại"
                    className="absolute left-2 rounded-full p-2 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => setNewCollectionStep('form')}
                  >
                    <IoArrowBack className="text-xl" aria-hidden />
                  </button>
                ) : null}
                <h2 className="text-center text-lg font-semibold text-zinc-100">
                  {newCollectionStep === 'form' ? 'Bộ sưu tập mới' : 'Chọn video'}
                </h2>
                <button
                  type="button"
                  aria-label="Đóng"
                  className="absolute right-2 rounded-full p-2 text-zinc-200 hover:bg-zinc-800"
                  onClick={closeNewCollectionModal}
                >
                  <IoClose className="text-xl" aria-hidden />
                </button>
              </div>

              {newCollectionStep === 'form' ? (
                <div className="flex flex-col gap-4 px-4 pb-5 pt-3">
                  <div>
                    <label htmlFor="new-collection-name" className="text-sm font-medium text-zinc-100">
                      Tên ({Math.min(collectionDraftName.length, COLLECTION_NAME_MAX)}/{COLLECTION_NAME_MAX})
                    </label>
                    <input
                      id="new-collection-name"
                      type="text"
                      maxLength={COLLECTION_NAME_MAX}
                      value={collectionDraftName}
                      onChange={(e) =>
                        setCollectionDraftName(e.target.value.slice(0, COLLECTION_NAME_MAX))
                      }
                      placeholder="Nhập tên bộ sưu tập"
                      className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-zinc-800/80 pt-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-100">Đặt ở chế độ công khai</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        Những bộ sưu tập ở chế độ công khai sẽ hiển thị trên hồ sơ của bạn và có thể được chia sẻ với
                        bạn bè.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={collectionDraftPublic}
                      onClick={() => setCollectionDraftPublic((p) => !p)}
                      className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
                        collectionDraftPublic ? 'bg-rose-600' : 'bg-zinc-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          collectionDraftPublic ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={!collectionDraftName.trim() || bookmarkLoading}
                    onClick={() => setNewCollectionStep('pick')}
                    className="mt-1 w-full rounded-xl py-3 text-sm font-semibold text-white transition enabled:cursor-pointer enabled:bg-[#7b202c] enabled:hover:bg-[#651a24] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Tiếp
                  </button>
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-1 flex-col">
                  {bookmarkLoading ? (
                    <p className="flex flex-1 items-center justify-center py-12 text-sm text-zinc-500">Đang tải…</p>
                  ) : bookmarkItems.length === 0 ? (
                    <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
                      <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
                        <IoBookmarkOutline className="mb-4 h-24 w-24 shrink-0 text-zinc-100" aria-hidden />
                        <p className="text-lg font-semibold text-zinc-100">
                          Không có video yêu thích để thêm vào
                        </p>
                        <p className="mt-2 max-w-sm text-sm text-zinc-400">
                          Toàn bộ video yêu thích của bạn hiện đã có trong bộ sưu tập.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeNewCollectionModal}
                        className="w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
                      >
                        Xong
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
                      <ul className="grid max-h-[min(360px,45vh)] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                        {bookmarkItems.map((v) => {
                          const selected = collectionPickIds.has(v.id)
                          return (
                            <li key={v.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setCollectionPickIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(v.id)) next.delete(v.id)
                                    else next.add(v.id)
                                    return next
                                  })
                                }
                                className="relative block w-full cursor-pointer text-left"
                              >
                                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-zinc-950 ring-1 ring-zinc-700">
                                  <img
                                    src={
                                      v.thumbnailUrl?.trim()
                                        ? v.thumbnailUrl
                                        : 'https://picsum.photos/seed/vibely-thumb/360/640'
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                  <span
                                    className={`absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                      selected
                                        ? 'border-white bg-rose-600 text-white'
                                        : 'border-white/90 bg-black/45'
                                    }`}
                                  >
                                    {selected ? <IoCheckmark className="text-xs" aria-hidden /> : null}
                                  </span>
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                      <button
                        type="button"
                        onClick={closeNewCollectionModal}
                        className="mt-3 w-full rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
                      >
                        Xong
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {showLogoutConfirm ? (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
            <div className="w-full max-w-sm rounded-xl bg-zinc-800 p-6 text-center shadow-2xl">
              <p className="text-2xl font-bold leading-snug">
                Bạn có chắc chắn muốn đăng xuất?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-base">
                <button
                  type="button"
                  className="rounded-md bg-zinc-700 py-2 font-semibold text-zinc-200 hover:bg-zinc-600"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-500 py-2 font-semibold text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    setShowLogoutConfirm(false)
                    logout()
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
