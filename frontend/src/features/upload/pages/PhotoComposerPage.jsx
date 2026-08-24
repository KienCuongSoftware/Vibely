import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  IoAdd,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoClose,
  IoHeartOutline,
  IoLocationOutline,
  IoMusicalNotesOutline,
  IoPaperPlaneOutline,
} from 'react-icons/io5'
import { StudioLayout } from '@/features/studio/components/StudioLayout.jsx'
import { useAuth } from '@/features/auth/hooks/useAuth.js'
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

function CardTitle({ children }) {
  return <h2 className="text-[15px] font-semibold text-[#161823]">{children}</h2>
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

  const handle = `@${user?.username || 'vibely'}`

  useEffect(() => {
    if (!files.length) navigate(STUDIO_UPLOAD_PHOTO_PATH, { replace: true })
  }, [files.length, navigate])

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    setPreviewIndex(0)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

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

  const moveCover = (index) => {
    if (index <= 0) return
    const next = [...files]
    const [picked] = next.splice(index, 1)
    next.unshift(picked)
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
      await apiClient.createVideo(
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
      navigate(asDraft ? '/vibelystudio/posts?tab=drafts' : '/vibelystudio/posts')
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
            <h1 className="text-xl font-bold text-[#161823]">{t('upload.photo.detailsTitle')}</h1>

            <Card>
              <CardTitle>{t('upload.photo.captionLabel')}</CardTitle>
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
            </Card>

            <Card>
              <CardTitle>{t('upload.photo.soundLabel')}</CardTitle>
              <button
                type="button"
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#f8f8f8] px-3 py-2 text-sm font-medium text-[#161823] hover:bg-[#f1f1f2]"
              >
                <IoMusicalNotesOutline aria-hidden />
                + {t('upload.photo.addSound')}
              </button>
            </Card>

            <Card>
              <CardTitle>{t('upload.photo.photosLabel')}</CardTitle>
              <p className="mt-1 text-sm text-[#8a8b91]">
                {t('upload.photo.gridHint', { count: files.length, max: PHOTO_UPLOAD_MAX_FILES })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((src, index) => (
                  <div
                    key={src}
                    className="relative h-[88px] w-[88px] overflow-hidden rounded-lg bg-[#f8f8f8]"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {t('upload.photo.cover')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="absolute bottom-1 left-1 cursor-pointer rounded bg-black/65 px-1 py-0.5 text-[10px] text-white"
                        onClick={() => moveCover(index)}
                      >
                        {t('upload.photo.setCover')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white"
                      onClick={() => removeAt(index)}
                      aria-label={t('upload.photo.remove')}
                    >
                      <IoClose className="text-xs" />
                    </button>
                  </div>
                ))}
                {files.length < PHOTO_UPLOAD_MAX_FILES ? (
                  <button
                    type="button"
                    className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#c6c6c8] text-2xl text-[#8a8b91] hover:bg-[#f8f8f8]"
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
            </Card>

            <Card>
              <CardTitle>{t('upload.location')}</CardTitle>
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
            <div className="mb-4 flex gap-5 border-b border-[#e8e8e9] text-sm">
              {[
                ['feed', t('upload.photo.previewFeed')],
                ['profile', t('upload.photo.previewProfile')],
                ['web', t('upload.photo.previewWeb')],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`cursor-pointer pb-2 font-medium ${
                    previewTab === id
                      ? 'border-b-2 border-[#161823] text-[#161823]'
                      : 'text-[#8a8b91]'
                  }`}
                  onClick={() => setPreviewTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mx-auto w-[240px] overflow-hidden rounded-[32px] border-[8px] border-[#161823] bg-black shadow-xl">
              <div className="relative aspect-[9/16] bg-[#111]">
                {previews[previewIndex] ? (
                  <img
                    src={previews[previewIndex]}
                    alt=""
                    className={`h-full w-full ${previewTab === 'profile' ? 'object-cover' : 'object-cover'}`}
                  />
                ) : null}
                {previewTab === 'feed' ? (
                  <>
                    <div className="absolute right-2 bottom-16 flex flex-col items-center gap-4 text-white">
                      <IoHeartOutline className="text-2xl drop-shadow" />
                      <IoChatbubbleEllipsesOutline className="text-2xl drop-shadow" />
                      <IoBookmarkOutline className="text-2xl drop-shadow" />
                      <IoPaperPlaneOutline className="text-2xl drop-shadow" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 p-3 pr-12">
                      <p className="text-xs font-semibold text-white">{handle}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-white/90">
                        {description || title}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-x-0 bottom-0 bg-black/55 p-3">
                    <p className="text-xs font-semibold text-white">{handle}</p>
                  </div>
                )}
                {previews.length > 1 ? (
                  <div className="absolute top-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
                    {previewIndex + 1}/{previews.length}
                  </div>
                ) : null}
              </div>
            </div>
            {previews.length > 1 ? (
              <div className="mx-auto mt-3 flex w-[240px] gap-1 overflow-x-auto">
                {previews.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className={`h-10 w-10 shrink-0 overflow-hidden rounded-md ring-2 ${
                      i === previewIndex ? 'ring-[#fe2c55]' : 'ring-transparent'
                    }`}
                    onClick={() => setPreviewIndex(i)}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </StudioLayout>
  )
}
