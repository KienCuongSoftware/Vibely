import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  IoAdd,
  IoArrowRedoOutline,
  IoBookmarkOutline,
  IoCameraOutline,
  IoChatbubbleEllipsesOutline,
  IoChevronBack,
  IoClose,
  IoEllipsisHorizontal,
  IoHeartOutline,
  IoHomeOutline,
  IoLocationOutline,
  IoMusicalNotesOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoSearchOutline,
} from 'react-icons/io5'
import { StudioLayout } from '@/features/studio/components/StudioLayout.jsx'
import { useAuth } from '@/features/auth/hooks/useAuth.js'
import { DEFAULT_AVATAR_URL } from '@/features/profile/utils/avatarUrl.js'
import { apiClient, uploadThumbnailToStorage } from '@/shared/api/client'
import {
  PHOTO_UPLOAD_ACCEPT,
  PHOTO_UPLOAD_MAX_FILES,
  STUDIO_UPLOAD_PHOTO_PATH,
  isAllowedPhotoFile,
} from '@/features/upload/utils/studioUploadPaths.js'
import {
  clearPhotoDraftFiles,
  getPhotoDraftFiles,
  setPhotoDraftFiles,
} from '@/features/upload/utils/photoDraftStore.js'
import {
  SCHEDULE_MIN_LEAD_MINUTES,
  SchedulePickers,
  defaultScheduleDate,
  isScheduleAtLeastLeadAhead,
} from '@/features/upload/components/SchedulePickers.jsx'

const TITLE_MAX = 90
const DESC_MAX = 1000

function Card({ children, className = '' }) {
  return (
    <section className={`rounded-xl border border-[#e8e8e9] bg-white p-5 ${className}`}>
      {children}
    </section>
  )
}

function CardTitle({ children, className = '' }) {
  return <h2 className={`text-[15px] font-semibold text-[#161823] ${className}`}>{children}</h2>
}

function PhotoBadge({ label }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
      <IoCameraOutline className="text-[10px]" aria-hidden />
      {label}
    </span>
  )
}

function CaptionStack({ displayName, description, locationQuery, soundLabel, photoBadge }) {
  return (
    <div className="min-w-0 text-left text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
      <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-bold">
        <span className="truncate">{displayName}</span>
        <PhotoBadge label={photoBadge} />
      </p>
      {description ? (
        <p className="mt-0.5 line-clamp-2 text-[11px] font-normal leading-snug text-white/95">{description}</p>
      ) : null}
      {locationQuery ? (
        <p className="mt-0.5 flex items-center gap-0.5 truncate text-[10px] text-white/85">
          <IoLocationOutline className="shrink-0" aria-hidden />
          {locationQuery}
        </p>
      ) : null}
      <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-white/90">
        <IoMusicalNotesOutline className="shrink-0 text-sm" aria-hidden />
        <span className="truncate">{soundLabel}</span>
      </p>
    </div>
  )
}

function SideActions({ avatarSrc, showDisc = true }) {
  return (
    <div className="flex w-11 flex-col items-center gap-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
      <div className="relative">
        <img
          src={avatarSrc}
          alt=""
          className="h-10 w-10 rounded-full border-[1.5px] border-white object-cover"
        />
        <span className="absolute -bottom-1 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-[#fe2c55] text-[11px] font-bold leading-none text-white ring-[2px] ring-black">
          +
        </span>
      </div>
      <IoHeartOutline className="text-[26px]" aria-hidden />
      <IoChatbubbleEllipsesOutline className="text-[25px]" aria-hidden />
      <IoBookmarkOutline className="text-[24px]" aria-hidden />
      <IoArrowRedoOutline className="text-[26px]" aria-hidden />
      {showDisc ? (
        <div
          className="mt-0.5 flex h-8 w-8 animate-[spin_9s_linear_infinite] items-center justify-center rounded-full bg-zinc-950 ring-[1.5px] ring-white/90"
          aria-hidden
        >
          <div className="h-3.5 w-3.5 rounded-full border border-dashed border-white/55" />
        </div>
      ) : null}
    </div>
  )
}

export function PhotoComposerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState(() => getPhotoDraftFiles())
  const [previews, setPreviews] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState('everyone')
  const [postTiming, setPostTiming] = useState('now')
  const [scheduleAt, setScheduleAt] = useState(() => defaultScheduleDate())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewTab, setPreviewTab] = useState('feed')
  const [showMoreSettings, setShowMoreSettings] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const dragFromRef = useRef(null)

  const handle = `@${user?.username || 'vibely'}`
  const displayName = user?.displayName || user?.username || 'Vibely'
  const avatarSrc = user?.avatarUrl || DEFAULT_AVATAR_URL
  const soundLabel = t('upload.photo.originalSound', { name: displayName })
  const captionText = description.trim() || title.trim()

  useEffect(() => {
    if (!files.length) navigate(STUDIO_UPLOAD_PHOTO_PATH, { replace: true })
  }, [files.length, navigate])

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  useEffect(() => {
    setPreviewIndex((i) => Math.min(i, Math.max(0, files.length - 1)))
  }, [files.length])

  const addFiles = (incoming) => {
    const next = [...files]
    for (const file of incoming) {
      if (!isAllowedPhotoFile(file)) continue
      if (next.length >= PHOTO_UPLOAD_MAX_FILES) break
      next.push(file)
    }
    setPhotoDraftFiles(next)
    setFiles(next)
  }

  const removeAt = (index) => {
    const next = files.filter((_, i) => i !== index)
    setPhotoDraftFiles(next)
    setFiles(next)
  }

  const reorderFiles = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= files.length || to >= files.length) return
    const next = [...files]
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked)
    setPhotoDraftFiles(next)
    setFiles(next)
  }

  const insertToken = (tokenText) => {
    setDescription((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${tokenText}`)
  }

  const publish = async ({ asDraft }) => {
    if (!token || !files.length || busy) return
    if (description.length > DESC_MAX) {
      setError(t('upload.descTooLong', { max: DESC_MAX }))
      return
    }
    if (!asDraft && postTiming === 'schedule' && !isScheduleAtLeastLeadAhead(scheduleAt)) {
      setError(t('upload.scheduleLead', { minutes: SCHEDULE_MIN_LEAD_MINUTES }))
      return
    }
    setBusy(true)
    setError('')
    try {
      const urls = []
      for (const file of files) {
        urls.push(await uploadThumbnailToStorage(token, file, file.name))
      }
      const caption = description.trim()
      const heading = (title.trim() || caption.slice(0, 80) || 'Photo').slice(0, 120)
      const created = await apiClient.createVideo(
        {
          title: heading,
          description: caption || heading,
          videoUrl: urls[0],
          thumbnailUrl: urls[0],
          durationSeconds: Math.max(1, urls.length),
          studioDraft: asDraft,
          privacy,
          mediaKind: 'PHOTO',
          photoUrls: urls,
          scheduledAt:
            !asDraft && postTiming === 'schedule' ? scheduleAt.toISOString() : undefined,
        },
        token,
      )
      clearPhotoDraftFiles()
      const scheduledLater = !asDraft && postTiming === 'schedule'
      navigate(asDraft ? '/vibelystudio/posts?tab=drafts' : '/vibelystudio/posts', {
        state: asDraft
          ? undefined
          : {
              pendingReview:
                !scheduledLater && created?.publicId
                  ? { publicIds: [created.publicId], privacy }
                  : undefined,
            },
      })
    } catch (err) {
      setError(err?.message || t('upload.uploadFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!files.length) return null

  const suggestedPlaces = [
    t('upload.photo.placeHint1'),
    t('upload.photo.placeHint2'),
    t('upload.photo.placeHint3'),
  ]

  return (
    <StudioLayout active="upload" hidePageHeader theme="light">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <p className="mb-3 shrink-0 rounded-lg bg-[#fff1f2] px-3 py-2 text-sm text-[#fe2c55]">{error}</p>
        ) : null}
        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 pb-8">
            <Card>
              <h1 className="text-xl font-bold text-[#161823]">{t('upload.photo.detailsTitle')}</h1>

              <CardTitle className="mt-6">{t('upload.photo.captionLabel')}</CardTitle>
              <div className="mt-3 rounded-lg bg-[#f8f8f8] px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                    placeholder={t('upload.photo.titlePlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#161823] outline-none placeholder:text-[#8a8b91]"
                  />
                  <span className="shrink-0 text-xs text-[#8a8b91]">
                    {title.length}/{TITLE_MAX}
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                  rows={4}
                  placeholder={t('upload.photo.captionPlaceholder')}
                  className="mt-2 w-full resize-none bg-transparent text-sm text-[#161823] outline-none placeholder:text-[#8a8b91]"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-[#161823] hover:bg-[#f1f1f2]"
                      onClick={() => insertToken('#')}
                    >
                      # Hashtag
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-[#161823] hover:bg-[#f1f1f2]"
                      onClick={() => insertToken('@')}
                    >
                      @ {t('upload.photo.mention')}
                    </button>
                  </div>
                  <span className="text-xs text-[#8a8b91]">
                    {description.length}/{DESC_MAX}
                  </span>
                </div>
              </div>

              <CardTitle className="mt-8">{t('upload.photo.soundLabel')}</CardTitle>
              <button
                type="button"
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#f8f8f8] px-3 py-2 text-sm font-medium text-[#161823] hover:bg-[#f1f1f2]"
              >
                <IoMusicalNotesOutline aria-hidden />
                + {t('upload.photo.addSound')}
              </button>

              <CardTitle className="mt-8">{t('upload.photo.photosLabel')}</CardTitle>
              <p className="mt-1 text-sm text-[#8a8b91]">
                {t('upload.photo.gridHint', { count: files.length })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((src, index) => (
                  <div
                    key={`${files[index]?.name}-${files[index]?.lastModified}-${index}`}
                    draggable
                    onDragStart={(e) => {
                      dragFromRef.current = index
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(index))
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverIndex(index)
                    }}
                    onDragLeave={() => {
                      setDragOverIndex((current) => (current === index ? null : current))
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const from = dragFromRef.current
                      dragFromRef.current = null
                      setDragOverIndex(null)
                      if (typeof from === 'number') reorderFiles(from, index)
                    }}
                    onDragEnd={() => {
                      dragFromRef.current = null
                      setDragOverIndex(null)
                    }}
                    className={`relative h-22 w-22 cursor-grab overflow-hidden rounded-lg bg-[#f8f8f8] active:cursor-grabbing ${
                      dragOverIndex === index ? 'ring-2 ring-[#fe2c55]' : ''
                    }`}
                  >
                    <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-[#161823]/80 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">
                        {t('upload.photo.cover')}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="absolute top-1 right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#b0b0b4] text-white hover:bg-[#9a9a9e]"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAt(index)
                      }}
                      aria-label={t('upload.photo.remove')}
                    >
                      <IoClose className="text-[11px]" />
                    </button>
                  </div>
                ))}
                {files.length < PHOTO_UPLOAD_MAX_FILES ? (
                  <button
                    type="button"
                    className="flex h-22 w-22 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#c6c6c8] text-2xl text-[#8a8b91] hover:bg-[#f8f8f8]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IoAdd aria-hidden />
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={PHOTO_UPLOAD_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files || []))
                  e.target.value = ''
                }}
              />

              <CardTitle className="mt-8">{t('upload.location')}</CardTitle>
              <div className="relative mt-3">
                <IoLocationOutline className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8b91]" />
                <input
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder={t('upload.photo.locationSearch')}
                  className="w-full rounded-lg bg-[#f8f8f8] py-2.5 pr-3 pl-9 text-sm text-[#161823] outline-none placeholder:text-[#8a8b91]"
                />
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {suggestedPlaces.map((place) => (
                  <button
                    key={place}
                    type="button"
                    className="shrink-0 cursor-pointer rounded-full bg-[#f8f8f8] px-3 py-1 text-xs font-medium text-[#161823] hover:bg-[#f1f1f2]"
                    onClick={() => setLocationQuery(place)}
                  >
                    {place}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <CardTitle>{t('upload.photo.settings')}</CardTitle>
              <p className="mt-4 text-sm font-medium text-[#161823]">{t('upload.photo.when')}</p>
              <div className="mt-2 flex gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#161823]">
                  <input
                    type="radio"
                    className="accent-[#fe2c55]"
                    checked={postTiming === 'now'}
                    onChange={() => setPostTiming('now')}
                  />
                  {t('upload.photo.now')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#161823]">
                  <input
                    type="radio"
                    className="accent-[#fe2c55]"
                    checked={postTiming === 'schedule'}
                    onChange={() => setPostTiming('schedule')}
                  />
                  {t('upload.schedule')}
                </label>
              </div>
              {postTiming === 'schedule' ? (
                <div className="mt-3">
                  <SchedulePickers value={scheduleAt} onChange={setScheduleAt} />
                </div>
              ) : null}
              <p className="mt-4 text-sm font-medium text-[#161823]">{t('upload.photo.privacy')}</p>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="mt-2 w-full max-w-sm cursor-pointer rounded-lg bg-[#f8f8f8] px-3 py-2.5 text-sm text-[#161823] outline-none"
              >
                <option value="everyone">{t('upload.privacy.everyone')}</option>
                <option value="friends">{t('upload.privacy.friends')}</option>
                <option value="onlyYou">{t('upload.privacy.onlyYou')}</option>
              </select>
              <button
                type="button"
                className="mt-3 cursor-pointer text-sm font-medium text-[#8a8b91] hover:text-[#161823]"
                onClick={() => setShowMoreSettings((v) => !v)}
              >
                {showMoreSettings ? t('upload.photo.showLess') : t('upload.photo.showMore')}
              </button>
              {showMoreSettings ? (
                <p className="mt-2 text-xs text-[#8a8b91]">{t('upload.photo.moreSettingsHint')}</p>
              ) : null}
            </Card>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                disabled={busy}
                className="min-w-[120px] cursor-pointer rounded-lg bg-[#fe2c55] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#e62a4d] disabled:opacity-50"
                onClick={() => void publish({ asDraft: false })}
              >
                {busy ? t('upload.posting') : t('upload.post')}
              </button>
              <button
                type="button"
                disabled={busy}
                className="min-w-[120px] cursor-pointer rounded-lg bg-[#f1f1f2] px-5 py-2.5 text-sm font-semibold text-[#161823] hover:bg-[#e8e8e9] disabled:opacity-50"
                onClick={() => void publish({ asDraft: true })}
              >
                {t('upload.saveDraft')}
              </button>
              <button
                type="button"
                disabled={busy}
                className="min-w-[120px] cursor-pointer rounded-lg bg-[#f1f1f2] px-5 py-2.5 text-sm font-semibold text-[#161823] hover:bg-[#e8e8e9] disabled:opacity-50"
                onClick={() => {
                  clearPhotoDraftFiles()
                  navigate(STUDIO_UPLOAD_PHOTO_PATH)
                }}
              >
                {t('upload.cancel')}
              </button>
            </div>
          </div>

          <aside className="hidden pb-8 lg:block">
            <div className="mb-3 flex rounded-lg bg-[#f1f1f2] p-0.5 text-sm">
              {[
                ['feed', t('upload.photo.previewFeed')],
                ['profile', t('upload.photo.previewProfile')],
                ['web', t('upload.photo.previewWeb')],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`min-w-0 flex-1 cursor-pointer rounded-md px-2 py-1.5 font-medium ${
                    previewTab === id
                      ? 'bg-white text-[#161823] shadow-sm'
                      : 'text-[#8a8b91]'
                  }`}
                  onClick={() => setPreviewTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {previewTab === 'feed' ? (
              <div className="mx-auto w-[260px] overflow-hidden rounded-[28px] border-[7px] border-[#161823] bg-black shadow-xl">
                <div className="relative aspect-9/16 bg-black text-white">
                  <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-1 text-[10px] font-medium">
                    <span>8:00</span>
                    <span className="flex items-center gap-0.5 opacity-90">●●● Wi‑Fi</span>
                  </div>
                  {previews[previewIndex] ? (
                    <button
                      type="button"
                      className="absolute inset-0 cursor-pointer"
                      onClick={() =>
                        setPreviewIndex((i) => (previews.length ? (i + 1) % previews.length : 0))
                      }
                    >
                      <img
                        src={previews[previewIndex]}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ) : null}
                  <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex items-start justify-between px-2.5 text-white">
                    <span className="mt-0.5 rounded border border-white/35 px-1 py-0.5 text-[8px] font-extrabold tracking-wide">
                      LIVE
                    </span>
                    <div className="flex items-end gap-5 text-[12px] font-semibold">
                      <span className="pb-1.5 text-white/45">Following</span>
                      <span className="relative pb-1.5">
                        For You
                        <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-white" />
                      </span>
                    </div>
                    <IoSearchOutline className="mt-0.5 text-lg" aria-hidden />
                  </div>
                  {previews.length > 1 ? (
                    <div className="pointer-events-none absolute top-14 right-2 z-20 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold">
                      {previewIndex + 1}/{previews.length}
                    </div>
                  ) : null}
                  {previews.length > 1 ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-[118px] z-20 flex justify-center gap-1">
                      {previews.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1 w-1 rounded-full ${i === previewIndex ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute right-1.5 bottom-[54px] z-20">
                    <SideActions avatarSrc={avatarSrc} />
                  </div>
                  <div className="pointer-events-none absolute right-14 bottom-[54px] left-2.5 z-20">
                    <CaptionStack
                      displayName={displayName}
                      description={captionText}
                      locationQuery={locationQuery}
                      soundLabel={soundLabel}
                      photoBadge={t('upload.photo.photoBadge')}
                    />
                  </div>
                  <nav
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[48px] items-end justify-between bg-black px-0.5 pb-1.5 text-white"
                    aria-hidden
                  >
                    <div className="flex flex-1 flex-col items-center gap-0.5">
                      <IoHomeOutline className="text-[20px]" />
                      <span className="text-[8px] font-semibold">Home</span>
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-0.5 opacity-80">
                      <IoPeopleOutline className="text-[19px]" />
                      <span className="text-[8px] font-semibold">Friends</span>
                    </div>
                    <div className="flex items-center gap-px px-1 pb-0.5">
                      <span className="h-6 w-[2px] rounded-sm bg-[#25f4ee]" />
                      <div className="flex h-8 w-10 items-center justify-center rounded-md border border-white bg-black">
                        <span className="text-lg leading-none">+</span>
                      </div>
                      <span className="h-6 w-[2px] rounded-sm bg-[#fe2c55]" />
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-0.5 opacity-80">
                      <IoChatbubbleEllipsesOutline className="text-[19px]" />
                      <span className="text-[8px] font-semibold">Inbox</span>
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-0.5 opacity-80">
                      <IoPersonOutline className="text-[19px]" />
                      <span className="text-[8px] font-semibold">Me</span>
                    </div>
                  </nav>
                </div>
              </div>
            ) : null}

            {previewTab === 'profile' ? (
              <div className="mx-auto w-[260px] overflow-hidden rounded-[28px] border-[7px] border-[#161823] bg-white shadow-xl">
                <div className="aspect-9/16 overflow-hidden bg-white text-[#161823]">
                  <div className="flex items-center justify-between px-3 pt-2 text-[10px] text-[#161823]">
                    <span>8:00</span>
                    <span className="opacity-70">●●●</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1">
                    <IoChevronBack className="text-lg" aria-hidden />
                    <IoEllipsisHorizontal className="text-lg" aria-hidden />
                  </div>
                  <div className="flex flex-col items-center px-4">
                    <img
                      src={avatarSrc}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                    />
                    <p className="mt-2 text-sm font-bold">{displayName}</p>
                    <p className="text-[11px] text-[#8a8b91]">{handle}</p>
                    <div className="mt-2 flex w-full justify-center gap-6 text-center text-[11px]">
                      <div>
                        <p className="font-bold">0</p>
                        <p className="text-[#8a8b91]">Following</p>
                      </div>
                      <div>
                        <p className="font-bold">0</p>
                        <p className="text-[#8a8b91]">Followers</p>
                      </div>
                      <div>
                        <p className="font-bold">0</p>
                        <p className="text-[#8a8b91]">Likes</p>
                      </div>
                    </div>
                    <div className="mt-2 flex w-full gap-2">
                      <div className="h-7 flex-1 rounded-md bg-[#f1f1f2]" />
                      <div className="h-7 flex-1 rounded-md bg-[#f1f1f2]" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-around border-b border-[#e8e8e9] pb-1 text-[#8a8b91]">
                    <span className="border-b-2 border-[#161823] px-4 pb-1 text-[#161823]">▦</span>
                    <span>↻</span>
                    <span>♡</span>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-[#e8e8e9]">
                    {previews[0] ? (
                      <button
                        type="button"
                        className="relative aspect-square cursor-pointer bg-black"
                        onClick={() => setPreviewTab('feed')}
                      >
                        <img src={previews[0]} alt="" className="h-full w-full object-cover" />
                        {previews.length > 1 ? (
                          <span className="absolute top-1 right-1 text-[10px] text-white drop-shadow">☰</span>
                        ) : null}
                      </button>
                    ) : null}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-square bg-[#f1f1f2]" />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {previewTab === 'web' ? (
              <div className="overflow-hidden rounded-2xl bg-black shadow-xl">
                <div className="relative aspect-9/16 w-full">
                  {previews[previewIndex] ? (
                    <img
                      src={previews[previewIndex]}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                  {previews.length > 1 ? (
                    <div className="pointer-events-none absolute top-3 right-3 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {previewIndex + 1}/{previews.length}
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute right-2 bottom-10">
                    <SideActions avatarSrc={avatarSrc} showDisc={false} />
                  </div>
                  <div className="pointer-events-none absolute right-14 bottom-10 left-3">
                    <CaptionStack
                      displayName={displayName}
                      description={captionText}
                      locationQuery={locationQuery}
                      soundLabel={soundLabel}
                      photoBadge={t('upload.photo.photoBadge')}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </StudioLayout>
  )
}
