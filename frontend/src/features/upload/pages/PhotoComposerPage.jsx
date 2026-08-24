import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { IoAdd, IoClose, IoMusicalNotesOutline } from 'react-icons/io5'
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

const DESC_MAX = 1000

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

  return (
    <StudioLayout active="upload" hidePageHeader>
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        <h1 className="text-xl font-bold text-zinc-100">{t('upload.photo.detailsTitle')}</h1>
        {error ? (
          <p className="mt-3 rounded-xl bg-rose-950/80 px-3 py-2 text-sm text-rose-200">{error}</p>
        ) : null}
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-200">{t('upload.photo.titleLabel')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder={t('upload.photo.titlePlaceholder')}
                className="mt-2 w-full rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-zinc-200">{t('upload.photo.captionLabel')}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                rows={4}
                placeholder={t('upload.photo.captionPlaceholder')}
                className="mt-2 w-full resize-y rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
              />
            </label>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{t('upload.photo.soundLabel')}</p>
              <button
                type="button"
                className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-300 ring-1 ring-zinc-800"
              >
                <IoMusicalNotesOutline aria-hidden />
                {t('upload.photo.addSound')}
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                {t('upload.photo.gridHint', { count: files.length, max: PHOTO_UPLOAD_MAX_FILES })}
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {previews.map((src, index) => (
                  <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-900">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {index === 0 ? (
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {t('upload.photo.cover')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="absolute bottom-1 left-1 cursor-pointer rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
                        onClick={() => moveCover(index)}
                      >
                        {t('upload.photo.setCover')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
                      onClick={() => removeAt(index)}
                      aria-label={t('upload.photo.remove')}
                    >
                      <IoClose />
                    </button>
                  </div>
                ))}
                {files.length < PHOTO_UPLOAD_MAX_FILES ? (
                  <button
                    type="button"
                    className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-600 text-3xl text-zinc-400"
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
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{t('upload.photo.when')}</p>
              <div className="mt-2 flex gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="radio"
                    checked={postTiming === 'now'}
                    onChange={() => setPostTiming('now')}
                  />
                  {t('upload.photo.now')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="radio"
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
            </div>
            <label className="block max-w-xs">
              <span className="text-sm font-semibold text-zinc-200">{t('upload.photo.privacy')}</span>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="mt-2 w-full cursor-pointer rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-zinc-800"
              >
                <option value="everyone">{t('upload.privacy.everyone')}</option>
                <option value="friends">{t('upload.privacy.friends')}</option>
                <option value="onlyYou">{t('upload.privacy.onlyYou')}</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={busy}
                className="cursor-pointer rounded-lg bg-[#fe2c55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e62a4d] disabled:opacity-50"
                onClick={() => void publish({ asDraft: false })}
              >
                {busy ? t('upload.posting') : t('upload.post')}
              </button>
              <button
                type="button"
                disabled={busy}
                className="cursor-pointer rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                onClick={() => void publish({ asDraft: true })}
              >
                {t('upload.saveDraft')}
              </button>
              <button
                type="button"
                disabled={busy}
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-zinc-900"
                onClick={() => {
                  clearPhotoDraftFiles()
                  navigate(STUDIO_UPLOAD_PHOTO_PATH)
                }}
              >
                {t('upload.cancel')}
              </button>
            </div>
          </div>
          <aside className="hidden lg:block">
            <p className="mb-3 text-sm font-semibold text-zinc-300">{t('upload.photo.preview')}</p>
            <div className="mx-auto w-[220px] overflow-hidden rounded-[28px] bg-black ring-1 ring-zinc-800">
              <div className="relative aspect-[9/16] bg-zinc-950">
                {previews[previewIndex] ? (
                  <img src={previews[previewIndex]} alt="" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 p-3">
                  <p className="text-xs font-semibold text-white">@{user?.username || 'vibely'}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-zinc-200">{description || title}</p>
                </div>
                {previews.length > 1 ? (
                  <div className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
                    {previewIndex + 1}/{previews.length}
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StudioLayout>
  )
}
