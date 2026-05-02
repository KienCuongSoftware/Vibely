import React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'
import { Sidebar } from '../components/Sidebar'
import { TooltipHoverWrap } from '../components/TooltipControls'
import { AccountActionsPill } from '../components/AccountActionsPill'
import {
  IoArrowBack,
  IoArrowRedo,
  IoCameraOutline,
  IoCompass,
  IoClose,
  IoEllipsisHorizontal,
  IoHome,
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
  const normalizeUsername = (value) => String(value ?? '').trim().replace(/^@/, '').toLowerCase()
  const isOwnProfile =
    Boolean(user?.username) &&
    Boolean(profile?.username) &&
    normalizeUsername(user.username) === normalizeUsername(profile.username)
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
    <section className="flex min-h-screen bg-black text-zinc-100">
      <Sidebar
        menuItems={menuItems}
        activeMenu={activeMenu}
        onSelectMenu={handleSelectMenu}
        token={token}
        user={profile ?? user}
        onLogout={token ? logout : undefined}
      />

      <div className="relative flex flex-1 items-center justify-center px-6 py-5">
        {token ? (
          <AccountActionsPill className="absolute right-8 top-5 z-10" tone="profile">
            <TooltipHoverWrap tip="Tài khoản">
              <Link
                to={profileHrefFromAuthUsername(user?.username)}
                className="flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-700 transition hover:ring-zinc-500"
                aria-label="Tài khoản"
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
              </Link>
            </TooltipHoverWrap>
          </AccountActionsPill>
        ) : null}

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
          <section className="w-full max-w-5xl bg-black px-4 py-6 md:px-8">
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

            <div className="mt-6 flex items-center justify-between border-b border-zinc-900">
              <div className="flex items-center gap-6 text-sm">
                <button
                  type="button"
                  className="cursor-pointer border-b-2 border-zinc-200 px-1 py-3 font-semibold text-zinc-100"
                >
                  <span className="inline-flex items-center gap-2">
                    <LuGrid2X2 /> Video
                  </span>
                </button>
                <button
                  type="button"
                  className="cursor-pointer px-1 py-3 text-zinc-400 hover:text-zinc-200"
                >
                  Yêu thích
                </button>
                <button
                  type="button"
                  className="cursor-pointer px-1 py-3 text-zinc-400 hover:text-zinc-200"
                >
                  Đã thích
                </button>
              </div>

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
            </div>

            <div className="flex min-h-[320px] flex-col items-center justify-center py-14 text-center">
              <div className="mb-4 rounded-full bg-zinc-800 p-6 text-zinc-200">
                <LuGrid2X2 className="text-3xl" />
              </div>
              <p className="text-3xl font-bold">Tải video đầu tiên của bạn lên</p>
              <p className="mt-1 text-base text-zinc-400">Video của bạn sẽ xuất hiện tại đây</p>
            </div>

            {status ? <p className="text-xs text-zinc-500">{status}</p> : null}
          </section>
        )}
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
                    <p className="text-xs text-zinc-400">vibely.app/@{editForm.username || 'vibely.id'}</p>
                    <p className="text-xs leading-relaxed text-zinc-500">
                      Vibely ID chỉ có thể đổi một lần mỗi 7 ngày. Sau khi đổi, liên kết hồ sơ của bạn cũng sẽ thay đổi.
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
      </div>
    </section>
  )
}
