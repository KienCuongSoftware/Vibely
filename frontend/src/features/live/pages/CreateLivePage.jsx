import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IoArrowBack, IoCloseCircle, IoImageOutline } from 'react-icons/io5'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  LiveCharCounter,
  LiveFieldError,
  LiveFormSection,
  LiveToggle,
} from '@/features/live/components/create/LiveFormControls.jsx'
import { LiveSidebar } from '@/features/live/components/LiveSidebar.jsx'
import { LiveSpinner } from '@/features/live/components/LiveStateView.jsx'
import {
  LIVE_LIMITS,
  LIVE_PATHS,
  LIVE_SELECTABLE_CATEGORIES,
  LIVE_VISIBILITY_OPTIONS,
} from '@/features/live/constants/liveConstants.js'
import { useCreateLiveForm } from '@/features/live/hooks/useCreateLiveForm.js'
import { useLiveNavigation } from '@/features/live/hooks/useLiveNavigation.js'

const FIELD_IDS = {
  coverFile: 'live-create-cover',
  title: 'live-create-title',
  description: 'live-create-description',
  categoryId: 'live-create-category',
}

const errorId = (field) => `${FIELD_IDS[field]}-error`

export function CreateLivePage() {
  const { t } = useTranslation()
  const { token, logout } = useAuth()
  const { navigate, openLive, back } = useLiveNavigation()
  const form = useCreateLiveForm({ token })
  const { values, errors } = form
  const fileInputRef = useRef(null)

  useEffect(() => {
    document.title = t('livePage.create.pageTitle')
  }, [t])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const live = await form.submit()
    if (live?.id) {
      navigate(LIVE_PATHS.host(live.id), { replace: true })
      return
    }
    if (form.firstInvalidField) {
      document.getElementById(FIELD_IDS[form.firstInvalidField])?.focus()
    }
  }

  const clearCover = () => {
    form.setCover(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const describedBy = (field) => (errors[field] ? errorId(field) : undefined)

  return (
    <section className="vibely-live-page flex h-dvh max-h-dvh min-h-0 flex-col bg-black text-zinc-100 lg:flex-row">
      <div className="hidden shrink-0 lg:flex">
        <LiveSidebar
          activeNav="goLive"
          onSelectLive={openLive}
          onGoLive={() => {}}
          token={token}
          onLogout={token ? logout : undefined}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="live-mobile-header flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3 lg:px-6">
          <button
            type="button"
            onClick={back}
            aria-label={t('nav.back')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-100 transition hover:bg-white/10"
          >
            <IoArrowBack className="text-xl" aria-hidden />
          </button>
          <h1 className="text-[17px] font-bold">{t('livePage.create.title')}</h1>
        </header>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-28 pt-4 lg:px-6"
        >
          <div className="mx-auto flex max-w-[640px] flex-col gap-4">
            <LiveFormSection title={t('livePage.create.coverLabel')} description={t('livePage.create.coverHint', { max: LIVE_LIMITS.COVER_MAX_BYTES / (1024 * 1024) })}>
              <div className="flex items-start gap-4">
                <div className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  {form.coverPreviewUrl ? (
                    <>
                      <img src={form.coverPreviewUrl} alt={t('livePage.create.coverPreviewAlt')} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={clearCover}
                        aria-label={t('livePage.create.removeCover')}
                        className="absolute right-1 top-1 cursor-pointer text-white drop-shadow"
                      >
                        <IoCloseCircle className="text-2xl" aria-hidden />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-500">
                      <IoImageOutline className="text-3xl" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    ref={fileInputRef}
                    id={FIELD_IDS.coverFile}
                    type="file"
                    accept={LIVE_LIMITS.COVER_ACCEPTED_TYPES.join(',')}
                    className="sr-only"
                    aria-describedby={describedBy('coverFile')}
                    aria-invalid={Boolean(errors.coverFile)}
                    onChange={(event) => form.setCover(event.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor={FIELD_IDS.coverFile}
                    className="live-secondary-btn inline-flex cursor-pointer items-center rounded-lg bg-white/10 px-4 py-2 text-[14px] font-semibold text-zinc-100 transition hover:bg-white/15"
                  >
                    {values.coverFile ? t('livePage.create.changeCover') : t('livePage.create.chooseCover')}
                  </label>
                  {values.coverFile ? <p className="mt-2 truncate text-[12px] text-zinc-500">{values.coverFile.name}</p> : null}
                  <LiveFieldError id={errorId('coverFile')} error={errors.coverFile} />
                </div>
              </div>
            </LiveFormSection>

            <LiveFormSection title={t('livePage.create.detailsSection')}>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor={FIELD_IDS.title} className="text-[13px] font-semibold text-zinc-100">
                  {t('livePage.create.titleLabel')} <span className="text-[#fe2c55]">*</span>
                </label>
                <LiveCharCounter value={values.title} max={LIVE_LIMITS.TITLE_MAX} />
              </div>
              <input
                id={FIELD_IDS.title}
                type="text"
                value={values.title}
                onChange={(event) => form.setField('title', event.target.value)}
                onBlur={() => form.touch('title')}
                placeholder={t('livePage.create.titlePlaceholder')}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={describedBy('title')}
                aria-required="true"
                className="live-input h-11 w-full rounded-lg border border-white/10 bg-zinc-800 px-3 text-[14px] text-zinc-100 placeholder:text-zinc-500 focus:border-[#fe2c55] focus:outline-none"
              />
              <LiveFieldError id={errorId('title')} error={errors.title} />

              <div className="mb-1 mt-4 flex items-center justify-between">
                <label htmlFor={FIELD_IDS.description} className="text-[13px] font-semibold text-zinc-100">
                  {t('livePage.create.descriptionLabel')}
                </label>
                <LiveCharCounter value={values.description} max={LIVE_LIMITS.DESCRIPTION_MAX} />
              </div>
              <textarea
                id={FIELD_IDS.description}
                rows={3}
                value={values.description}
                onChange={(event) => form.setField('description', event.target.value)}
                onBlur={() => form.touch('description')}
                placeholder={t('livePage.create.descriptionPlaceholder')}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={describedBy('description')}
                className="live-input w-full resize-none rounded-lg border border-white/10 bg-zinc-800 px-3 py-2.5 text-[14px] text-zinc-100 placeholder:text-zinc-500 focus:border-[#fe2c55] focus:outline-none"
              />
              <LiveFieldError id={errorId('description')} error={errors.description} />
            </LiveFormSection>

            <LiveFormSection title={<>{t('livePage.create.categoryLabel')} <span className="text-[#fe2c55]">*</span></>}>
              <div
                id={FIELD_IDS.categoryId}
                role="radiogroup"
                tabIndex={-1}
                aria-label={t('livePage.create.categoryLabel')}
                aria-describedby={describedBy('categoryId')}
                className="flex flex-wrap gap-2 focus:outline-none"
              >
                {LIVE_SELECTABLE_CATEGORIES.map((category) => {
                  const active = values.categoryId === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        form.setField('categoryId', category.id)
                        form.touch('categoryId')
                      }}
                      className={`live-category-tab cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                        active
                          ? 'live-category-tab--active bg-white text-black'
                          : 'live-category-tab--inactive bg-zinc-800/90 text-zinc-100 hover:bg-zinc-700'
                      }`}
                    >
                      {t(category.labelKey)}
                    </button>
                  )
                })}
              </div>
              <LiveFieldError id={errorId('categoryId')} error={errors.categoryId} />
            </LiveFormSection>

            <LiveFormSection title={t('livePage.create.visibilityLabel')}>
              <div role="radiogroup" aria-label={t('livePage.create.visibilityLabel')} className="flex flex-col gap-1">
                {LIVE_VISIBILITY_OPTIONS.map((option) => (
                  <label key={option.id} className="flex cursor-pointer items-center gap-3 py-1.5 text-[14px] text-zinc-100">
                    <input
                      type="radio"
                      name="live-visibility"
                      value={option.id}
                      checked={values.visibility === option.id}
                      onChange={() => form.setField('visibility', option.id)}
                      className="h-4 w-4 accent-[#fe2c55]"
                    />
                    {t(option.labelKey)}
                  </label>
                ))}
              </div>
            </LiveFormSection>

            <LiveFormSection title={t('livePage.create.interactionSection')}>
              <div className="divide-y divide-white/5">
                <LiveToggle
                  id="live-create-allow-comments"
                  label={t('livePage.create.allowComments')}
                  checked={values.allowComments}
                  onChange={(checked) => form.setField('allowComments', checked)}
                />
                <LiveToggle
                  id="live-create-allow-gifts"
                  label={t('livePage.create.allowGifts')}
                  description={t('livePage.create.allowGiftsHint')}
                  checked={values.allowGifts}
                  onChange={(checked) => form.setField('allowGifts', checked)}
                />
                <LiveToggle
                  id="live-create-allow-guests"
                  label={t('livePage.create.allowGuests')}
                  description={t('livePage.create.allowGuestsHint')}
                  checked={values.allowGuests}
                  onChange={(checked) => form.setField('allowGuests', checked)}
                />
                <LiveToggle
                  id="live-create-mature"
                  label={t('livePage.create.matureContent')}
                  description={t('livePage.create.matureContentHint')}
                  checked={values.matureContent}
                  onChange={(checked) => form.setField('matureContent', checked)}
                />
              </div>
            </LiveFormSection>

            {form.submitError ? (
              <p className="rounded-lg bg-[#fe2c55]/10 px-4 py-3 text-[13px] text-[#fe2c55]" role="alert">
                {form.submitError.message || t('livePage.create.errors.submitFailed')}
              </p>
            ) : null}
          </div>

          <div className="live-create-footer fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/90 px-3 py-3 backdrop-blur lg:left-[220px] lg:px-6">
            <div className="mx-auto flex max-w-[640px] items-center justify-end gap-3">
              <button
                type="button"
                onClick={back}
                className="live-secondary-btn cursor-pointer rounded-lg bg-white/10 px-5 py-2.5 text-[14px] font-semibold text-zinc-100 transition hover:bg-white/15"
              >
                {t('livePage.create.cancel')}
              </button>
              <button
                type="submit"
                disabled={form.submitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#fe2c55] px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#e6284c] disabled:cursor-wait disabled:opacity-70"
              >
                {form.submitting ? <LiveSpinner className="h-4 w-4" /> : null}
                {form.submitting ? t('livePage.create.submitting') : t('livePage.create.submit')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
