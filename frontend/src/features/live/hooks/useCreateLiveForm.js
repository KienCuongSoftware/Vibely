import { useCallback, useEffect, useMemo, useState } from 'react'
import { LIVE_VISIBILITY } from '@/features/live/constants/liveConstants.js'
import { liveService } from '@/features/live/services/liveService.js'
import { validateCreateLive, validateLiveCover } from '@/features/live/utils/validateCreateLive.js'

const INITIAL_VALUES = Object.freeze({
  title: '',
  description: '',
  categoryId: '',
  coverFile: null,
  visibility: LIVE_VISIBILITY.PUBLIC,
  allowComments: true,
  allowGifts: true,
  allowGuests: false,
  matureContent: false,
})

export const CREATE_LIVE_FIELD_ORDER = ['coverFile', 'title', 'description', 'categoryId']

/** Form state, validation and submission for /live/create. */
export function useCreateLiveForm({ token }) {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null)

  const errors = useMemo(() => validateCreateLive(values), [values])

  const visibleErrors = useMemo(() => {
    if (submitted) return errors
    return Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field]))
  }, [errors, submitted, touched])

  useEffect(() => {
    const file = values.coverFile
    if (!file || validateLiveCover(file)) {
      setCoverPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setCoverPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [values.coverFile])

  const setField = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }, [])

  const touch = useCallback((field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }, [])

  const setCover = useCallback((file) => {
    setValues((prev) => ({ ...prev, coverFile: file ?? null }))
    setTouched((prev) => ({ ...prev, coverFile: true }))
  }, [])

  /** @returns {Promise<import('../api/liveContracts.js').LiveDetail|null>} */
  const submit = useCallback(async () => {
    setSubmitted(true)
    setSubmitError(null)
    if (Object.keys(errors).length > 0 || submitting) return null
    setSubmitting(true)
    try {
      return await liveService.createLive(
        {
          title: values.title.trim(),
          description: values.description.trim(),
          categoryId: values.categoryId,
          coverFile: values.coverFile,
          settings: {
            visibility: values.visibility,
            allowComments: values.allowComments,
            allowGifts: values.allowGifts,
            allowGuests: values.allowGuests,
            matureContent: values.matureContent,
          },
        },
        token,
      )
    } catch (error) {
      setSubmitError(error)
      return null
    } finally {
      setSubmitting(false)
    }
  }, [errors, submitting, token, values])

  const firstInvalidField = CREATE_LIVE_FIELD_ORDER.find((field) => errors[field])

  return {
    values,
    errors: visibleErrors,
    firstInvalidField,
    coverPreviewUrl,
    submitting,
    submitError,
    setField,
    touch,
    setCover,
    submit,
  }
}
