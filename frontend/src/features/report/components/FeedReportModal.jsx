import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  IoCheckmarkCircle,
  IoChevronBack,
  IoChevronForward,
  IoClose,
} from 'react-icons/io5'
import { apiClient } from '@/shared/api/client.js'
import { isVideoPublicId, normalizeVideoPublicId } from '@/features/post/utils/videoPublicId.js'

const HARASS_BULLETS = [
  'report.hate.bullyingSelf_b1',
  'report.hate.bullyingSelf_b2',
  'report.hate.bullyingSelf_b3',
]

const SHOPPING_SUB_REASONS = [
  { id: 'shopping_exaggerated', labelKey: 'report.shopping.exaggerated' },
  { id: 'shopping_misleading_gifts', labelKey: 'report.shopping.misleadingGifts' },
  { id: 'shopping_inconsistent_pricing', labelKey: 'report.shopping.inconsistentPricing' },
  { id: 'shopping_traffic_redirect', labelKey: 'report.shopping.trafficRedirect' },
  { id: 'shopping_other', labelKey: 'report.shopping.other' },
]

/** Danh mục báo cáo — thứ tự gần TikTok web; labelKey → report.* */
export const FEED_REPORT_CATEGORIES = [
  {
    id: 'shopping',
    labelKey: 'report.cats.shopping',
    children: SHOPPING_SUB_REASONS,
  },
  {
    id: 'counterfeit_sales',
    labelKey: 'report.cats.counterfeitSales',
    children: [
      {
        id: 'counterfeit_fake',
        labelKey: 'report.counterfeit.fakeProducts',
        infoTitleKey: null,
        infoBulletKeys: [
          'report.counterfeit.fakeProducts_b1',
          'report.counterfeit.fakeProducts_b2',
          'report.counterfeit.fakeProducts_b3',
        ],
        infoWithDescription: true,
      },
      {
        id: 'counterfeit_lookalike',
        labelKey: 'report.counterfeit.lookalike',
        infoTitleKey: null,
        infoBulletKeys: [
          'report.counterfeit.lookalike_b1',
          'report.counterfeit.lookalike_b2',
        ],
        infoWithDescription: true,
      },
      {
        id: 'counterfeit_other',
        labelKey: 'report.counterfeit.other',
        infoTitleKey: null,
        infoBulletKeys: [
          'report.counterfeit.other_b1',
          'report.counterfeit.other_b2',
          'report.counterfeit.other_b3',
        ],
        infoWithDescription: true,
      },
    ],
  },
  {
    id: 'violence',
    labelKey: 'report.cats.violence',
    children: [
      { id: 'violence_child', labelKey: 'report.violence.childExploit' },
      { id: 'violence_physical', labelKey: 'report.violence.physicalThreats' },
      { id: 'violence_sexual', labelKey: 'report.violence.sexualExploit' },
      { id: 'violence_human', labelKey: 'report.violence.humanExploit' },
      { id: 'violence_animal', labelKey: 'report.violence.animalAbuse' },
      { id: 'violence_other', labelKey: 'report.violence.otherCrime' },
    ],
  },
  {
    id: 'hate',
    labelKey: 'report.cats.hate',
    children: [
      {
        id: 'hate_speech',
        labelKey: 'report.hate.hateSpeech',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.hate.hateSpeech_b1',
          'report.hate.hateSpeech_b2',
          'report.hate.hateSpeech_b3',
          'report.hate.hateSpeech_b4',
        ],
      },
      {
        id: 'hate_bullying',
        labelKey: 'report.hate.bullying',
        children: [
          {
            id: 'hate_bullying_self',
            labelKey: 'report.hate.bullyingSelf',
            infoIntroKey: 'report.info.notAllowed',
            infoBulletKeys: HARASS_BULLETS,
          },
          {
            id: 'hate_bullying_known',
            labelKey: 'report.hate.bullyingSomeoneIKnow',
            detailLabelKey: 'report.provideAccountName',
            detailPlaceholderKey: 'report.searchAccount',
          },
          {
            id: 'hate_bullying_celebrity',
            labelKey: 'report.hate.bullyingCelebrity',
            infoIntroKey: 'report.info.notAllowed',
            infoBulletKeys: HARASS_BULLETS,
          },
          {
            id: 'hate_bullying_others',
            labelKey: 'report.hate.bullyingOthers',
            infoIntroKey: 'report.info.notAllowed',
            infoBulletKeys: HARASS_BULLETS,
            infoWithDescription: true,
            detailPlaceholderKey: 'report.infoDescPlaceholder',
          },
        ],
      },
    ],
  },
  {
    id: 'suicide',
    labelKey: 'report.cats.suicide',
    infoBulletKeys: [
      'report.suicide.b1',
      'report.suicide.b2',
      'report.suicide.b3',
    ],
  },
  {
    id: 'eating',
    labelKey: 'report.cats.eating',
    infoIntroKey: 'report.info.notAllowedContent',
    infoBulletKeys: ['report.eating.b1', 'report.eating.b2'],
  },
  {
    id: 'dangerous',
    labelKey: 'report.cats.dangerous',
    infoIntroKey: 'report.info.notAllowedContent',
    infoBulletKeys: ['report.dangerous.b1', 'report.dangerous.b2'],
  },
  {
    id: 'nudity',
    labelKey: 'report.cats.nudity',
    children: [
      {
        id: 'nudity_youth_sexual',
        labelKey: 'report.nudity.youthSexual',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.nudity.youthSexual_b1',
          'report.nudity.youthSexual_b2',
          'report.nudity.youthSexual_b3',
          'report.nudity.youthSexual_b4',
          'report.nudity.youthSexual_b5',
        ],
      },
      {
        id: 'nudity_youth_suggestive',
        labelKey: 'report.nudity.youthSuggestive',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.nudity.youthSuggestive_b1',
          'report.nudity.youthSuggestive_b2',
          'report.nudity.youthSuggestive_b3',
          'report.nudity.youthSuggestive_b4',
        ],
      },
      {
        id: 'nudity_adult_sexual',
        labelKey: 'report.nudity.adultSexual',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.nudity.adultSexual_b1',
          'report.nudity.adultSexual_b2',
        ],
      },
      {
        id: 'nudity_adult',
        labelKey: 'report.nudity.adultNudity',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.nudity.adultNudity_b1',
          'report.nudity.adultNudity_b2',
        ],
      },
      {
        id: 'nudity_porn_language',
        labelKey: 'report.nudity.pornLanguage',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: ['report.nudity.pornLanguage_b1'],
      },
    ],
  },
  {
    id: 'shocking',
    labelKey: 'report.cats.shocking',
    infoIntroKey: 'report.info.notAllowedContent',
    infoBulletKeys: [
      'report.shocking.b1',
      'report.shocking.b2',
      'report.shocking.b3',
    ],
  },
  {
    id: 'misinfo',
    labelKey: 'report.cats.misinfo',
    children: [
      {
        id: 'misinfo_election',
        labelKey: 'report.misinfo.election',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.misinfo.election_b1',
          'report.misinfo.election_b2',
        ],
      },
      {
        id: 'misinfo_dangerous',
        labelKey: 'report.misinfo.dangerous',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.misinfo.dangerous_b1',
          'report.misinfo.dangerous_b2',
          'report.misinfo.dangerous_b3',
          'report.misinfo.dangerous_b4',
        ],
      },
      {
        id: 'misinfo_deepfake',
        labelKey: 'report.misinfo.deepfake',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.misinfo.deepfake_b1',
          'report.misinfo.deepfake_b2',
          'report.misinfo.deepfake_b3',
          'report.misinfo.deepfake_b4',
        ],
      },
    ],
  },
  {
    id: 'spam',
    labelKey: 'report.cats.spam',
    children: [
      {
        id: 'spam_fake_engagement',
        labelKey: 'report.spam.fakeEngagement',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: ['report.spam.fakeEngagement_b1'],
      },
      {
        id: 'spam_mail',
        labelKey: 'report.spam.spamMail',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.spam.spamMail_b1',
          'report.spam.spamMail_b2',
        ],
      },
    ],
  },
  {
    id: 'controlled',
    labelKey: 'report.cats.controlled',
    children: [
      {
        id: 'controlled_gambling',
        labelKey: 'report.controlled.gambling',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: ['report.controlled.gambling_b1'],
      },
      {
        id: 'controlled_substances',
        labelKey: 'report.controlled.substances',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.controlled.substances_b1',
          'report.controlled.substances_b2',
          'report.controlled.substances_b3',
          'report.controlled.substances_b4',
          'report.controlled.substances_b5',
        ],
      },
      {
        id: 'controlled_weapons',
        labelKey: 'report.controlled.weapons',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.controlled.weapons_b1',
          'report.controlled.weapons_b2',
        ],
      },
      {
        id: 'controlled_other_trade',
        labelKey: 'report.controlled.otherTrade',
        infoIntroKey: 'report.info.notAllowedContent',
        infoBulletKeys: [
          'report.controlled.otherTrade_b1',
          'report.controlled.otherTrade_b2',
        ],
      },
    ],
  },
  {
    id: 'fraud',
    labelKey: 'report.cats.fraud',
    infoTitleKey: 'report.learnMore',
    infoBulletKeys: [
      'report.fraud.b1',
      'report.fraud.b2',
      'report.fraud.b3',
    ],
  },
  {
    id: 'personal_info',
    labelKey: 'report.cats.personalInfo',
    infoIntroKey: 'report.info.notAllowedContent',
    infoBulletKeys: [
      'report.personalInfo.b1',
      'report.personalInfo.b2',
      'report.personalInfo.b3',
      'report.personalInfo.b4',
    ],
  },
  {
    id: 'ip',
    labelKey: 'report.cats.ip',
    children: [
      {
        id: 'ip_counterfeit',
        labelKey: 'report.ip.counterfeit',
        children: [
          { id: 'ip_counterfeit_owner', labelKey: 'report.ip.counterfeitOwner' },
          {
            id: 'ip_counterfeit_suspect',
            labelKey: 'report.ip.counterfeitSuspect',
          },
        ],
      },
      { id: 'ip_violation', labelKey: 'report.ip.ipViolation' },
    ],
  },
  { id: 'other', labelKey: 'report.cats.other' },
]

/** @deprecated dùng FEED_REPORT_CATEGORIES */
export const FEED_REPORT_REASONS = FEED_REPORT_CATEGORIES.map((c) => c.labelKey)

const MAX_REASON_LEN = 500

/** @param {string | { id?: string, labelKey: string, infoIntroKey?: string, infoBulletKeys?: string[], infoTitleKey?: string | null }} child */
function normalizeReportChild(child) {
  if (typeof child === 'string') return { labelKey: child }
  return child
}

function buildReportPayload(categoryLabel, reasonLabel, description) {
  const desc = String(description ?? '').trim()
  const base =
    categoryLabel && categoryLabel !== reasonLabel
      ? `${categoryLabel} — ${reasonLabel}`
      : reasonLabel
  if (!desc) return base.slice(0, MAX_REASON_LEN)
  const joined = `${base}: ${desc}`
  return joined.slice(0, MAX_REASON_LEN)
}

/**
 * Modal báo cáo video kiểu TikTok — mở từ mục «Báo cáo» trong menu ⋯.
 *
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   videoPublicId?: string | number | null
 *   token?: string | null
 *   onRequireAuth?: () => void
 *   onSubmitted?: (reason: string) => void
 * }} props
 */
export function FeedReportModal({
  open,
  onClose,
  videoPublicId,
  token,
  onRequireAuth,
  onSubmitted,
}) {
  const { t } = useTranslation()
  /** 'pick' | 'sub' | 'detail' | 'info' | 'submitting' | 'done' */
  const [phase, setPhase] = useState('pick')
  /** Danh mục gốc (cấp 1) — dùng khi gửi payload. */
  const [category, setCategory] = useState(null)
  /** Stack menu con — phần tử cuối là danh sách đang hiện. */
  const [navStack, setNavStack] = useState([])
  /** Trang info đang xem (có thể là danh mục gốc hoặc mục con). */
  const [infoPage, setInfoPage] = useState(null)
  /** labelKey của lý do đã chọn */
  const [reasonKey, setReasonKey] = useState('')
  const [description, setDescription] = useState('')
  const [detailMeta, setDetailMeta] = useState(null)
  const [error, setError] = useState('')
  /** 'detail' | 'info' — màn trước khi gửi, để khôi phục khi lỗi. */
  const [submitFrom, setSubmitFrom] = useState('detail')
  /** Payload đã gửi thành công — gọi onSubmitted khi bấm Xong (tránh parent remount/reset modal). */
  const [submittedPayload, setSubmittedPayload] = useState(null)

  const reset = () => {
    setPhase('pick')
    setCategory(null)
    setNavStack([])
    setInfoPage(null)
    setReasonKey('')
    setDescription('')
    setDetailMeta(null)
    setError('')
    setSubmitFrom('detail')
    setSubmittedPayload(null)
  }

  const wasOpenRef = useRef(false)
  useEffect(() => {
    // Chỉ reset khi mở modal (false → true). Không reset khi videoPublicId
    // đổi giữa chừng (sau gửi báo cáo) — nếu không sẽ nhảy về màn chọn danh mục.
    if (open && !wasOpenRef.current) {
      reset()
    }
    wasOpenRef.current = open
  }, [open])

  const finishThanks = () => {
    const payload = submittedPayload
    if (payload != null) {
      onSubmitted?.(payload)
    }
    onClose()
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape' || phase === 'submitting') return
      if (phase === 'done') {
        finishThanks()
        return
      }
      if (phase === 'detail' || phase === 'info') {
        if (navStack.length > 0) {
          setPhase('sub')
          setInfoPage(null)
          setDetailMeta(null)
          setReasonKey('')
          setDescription('')
          setError('')
        } else {
          reset()
        }
        return
      }
      if (phase === 'sub') {
        if (navStack.length > 1) {
          setNavStack((prev) => prev.slice(0, -1))
          setError('')
        } else {
          reset()
        }
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, onSubmitted, phase, navStack.length, submittedPayload])

  const listItems = useMemo(() => {
    if (phase === 'sub' && navStack.length > 0) {
      const current = navStack[navStack.length - 1]
      return (current.children ?? []).map((raw) => {
        const child = normalizeReportChild(raw)
        return {
          id: child.id ?? child.labelKey,
          labelKey: child.labelKey,
          hasChildren: Boolean(child.children?.length),
          hasInfo: Boolean(child.infoBulletKeys?.length),
          isDetailOnly:
            Boolean(child.detailLabelKey || child.detailPlaceholderKey) &&
            !child.infoBulletKeys?.length,
          child,
        }
      })
    }
    return FEED_REPORT_CATEGORIES.map((item) => ({
      id: item.id ?? item.labelKey,
      labelKey: item.labelKey,
      hasChildren: Boolean(item.children?.length),
      hasInfo: Boolean(item.infoBulletKeys?.length),
      category: item,
    }))
  }, [phase, navStack])

  const goBack = () => {
    if (phase === 'submitting') return
    if (phase === 'detail' || phase === 'info') {
      if (navStack.length > 0) {
        setPhase('sub')
        setInfoPage(null)
        setDetailMeta(null)
        setReasonKey('')
        setDescription('')
        setError('')
      } else {
        reset()
      }
      return
    }
    if (phase === 'sub') {
      if (navStack.length > 1) {
        setNavStack((prev) => prev.slice(0, -1))
        setError('')
      } else {
        reset()
      }
    }
  }

  const openDetail = (page, parentCategory = category) => {
    setReasonKey(page.labelKey)
    setDescription('')
    setError('')
    setInfoPage(null)
    setDetailMeta({
      labelKey: page.detailLabelKey || 'report.descLabel',
      placeholderKey: page.detailPlaceholderKey || 'report.descPlaceholder',
    })
    setCategory(parentCategory)
    setSubmitFrom('detail')
    setPhase('detail')
  }

  const openInfoPage = (page, parentCategory = category) => {
    setCategory(parentCategory)
    setInfoPage(page)
    setReasonKey(page.labelKey)
    setDescription('')
    setDetailMeta(null)
    setError('')
    setSubmitFrom('info')
    setPhase('info')
  }

  const onPickItem = (item) => {
    if (phase === 'submitting') return
    if (phase === 'pick' && item.hasChildren) {
      setCategory(item.category)
      setNavStack([item.category])
      setPhase('sub')
      setError('')
      return
    }
    if (phase === 'pick' && item.hasInfo) {
      setNavStack([])
      openInfoPage(item.category, item.category)
      return
    }
    if (phase === 'pick') {
      setNavStack([])
      openDetail(
        item.category ?? { labelKey: item.labelKey },
        item.category ?? { labelKey: item.labelKey },
      )
      return
    }
    if (phase === 'sub') {
      if (item.hasChildren) {
        setNavStack((prev) => [...prev, item.child])
        setError('')
        return
      }
      if (item.hasInfo) {
        openInfoPage(item.child, category)
        return
      }
      openDetail(item.child, category)
    }
  }

  const submitReport = async () => {
    if (phase === 'submitting' || !reasonKey) return
    if (!token) {
      onRequireAuth?.()
      onClose()
      return
    }
    const publicId = normalizeVideoPublicId(videoPublicId)
    if (!isVideoPublicId(publicId)) {
      setError(t('report.videoUnknown'))
      return
    }

    const categoryLabel = category?.labelKey ? t(category.labelKey) : ''
    const reasonLabel = t(reasonKey)
    const payload = buildReportPayload(categoryLabel, reasonLabel, description)
    setError('')
    setPhase('submitting')
    try {
      await apiClient.reportVideo(publicId, payload, token)
      setSubmittedPayload(payload)
      setPhase('done')
    } catch (err) {
      const message =
        typeof err?.message === 'string' && err.message.trim()
          ? err.message.trim()
          : t('report.submitFailed')
      setError(message)
      setPhase(submitFrom === 'info' ? 'info' : 'detail')
    }
  }

  if (!open || typeof document === 'undefined') return null

  const showBack = phase === 'sub' || phase === 'detail' || phase === 'info'
  const showPickHint = phase === 'pick' || phase === 'sub'
  const infoSource = infoPage ?? category
  const infoBulletKeys = infoSource?.infoBulletKeys ?? []
  const infoIntro = infoSource?.infoIntroKey ? t(infoSource.infoIntroKey) : ''
  const infoWithDescription = Boolean(infoSource?.infoWithDescription)
  const infoTitle =
    infoSource &&
    Object.prototype.hasOwnProperty.call(infoSource, 'infoTitleKey')
      ? infoSource.infoTitleKey
        ? t(infoSource.infoTitleKey)
        : null
      : infoIntro
        ? null
        : t('report.learnMore')
  const reason = reasonKey ? t(reasonKey) : ''
  const detailLabel = t(detailMeta?.labelKey || 'report.descLabel')
  const detailPlaceholder = t(
    detailMeta?.placeholderKey || 'report.descPlaceholder',
  )
  const infoDescPlaceholder = t(
    infoSource?.detailPlaceholderKey || 'report.infoDescPlaceholder',
  )

  if (phase === 'done') {
    return createPortal(
      <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
        <button
          type="button"
          aria-label={t('report.close')}
          className="absolute inset-0 cursor-default bg-black/55"
          onClick={finishThanks}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vibely-report-thanks-title"
          className="relative z-10 w-full max-w-[400px] rounded-xl bg-[#2f2f2f] px-6 pb-5 pt-8 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <IoCheckmarkCircle
              className="mb-4 h-16 w-16 text-[#20D563]"
              aria-hidden
            />
            <h2
              id="vibely-report-thanks-title"
              className="text-[22px] font-bold leading-tight text-white"
            >
              {t('report.thanksTitle')}
            </h2>
            <p className="mt-3 text-[15px] leading-snug text-white/70">
              {t('report.thanksBody')}
            </p>
            <button
              type="button"
              className="mt-7 w-full cursor-pointer rounded-md bg-[#fe2c55] py-2.5 text-[16px] font-bold text-white transition hover:bg-[#ef2b50]"
              onClick={finishThanks}
            >
              {t('report.done')}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label={t('report.closeReport')}
        className="absolute inset-0 cursor-default bg-black/55"
        onClick={() => {
          if (phase !== 'submitting') onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('report.title')}
        className="relative z-10 flex max-h-[min(72vh,560px)] w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-[#252525] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.08] px-2 py-2.5">
          {showBack ? (
            <button
              type="button"
              aria-label={t('report.back')}
              disabled={phase === 'submitting'}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-50"
              onClick={goBack}
            >
              <IoChevronBack className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden />
          )}
          <h2 className="min-w-0 flex-1 text-[17px] font-bold text-white">
            {t('report.title')}
          </h2>
          <button
            type="button"
            aria-label={t('report.close')}
            disabled={phase === 'submitting'}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50"
            onClick={onClose}
          >
            <IoClose className="text-2xl" aria-hidden />
          </button>
        </div>

        {phase === 'info' || (phase === 'submitting' && submitFrom === 'info') ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-white/[0.06] px-5 py-3.5">
              <p className="text-[15px] font-medium leading-snug text-white">
                {reason}
              </p>
            </div>
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {infoTitle ? (
                <p className="mb-3 text-[15px] font-semibold text-white">
                  {infoTitle}
                </p>
              ) : null}
              {infoIntro ? (
                <p className="mb-3 text-[14px] leading-relaxed text-white/90">
                  {infoIntro}
                </p>
              ) : null}
              <ul className="list-disc space-y-3 pl-5 text-[14px] leading-relaxed text-white/90">
                {infoBulletKeys.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
              {infoWithDescription ? (
                <div className="mt-5">
                  <label
                    htmlFor="vibely-report-info-description"
                    className="mb-2 block text-[15px] font-medium text-white"
                  >
                    {t('report.descLabel')}
                  </label>
                  <textarea
                    id="vibely-report-info-description"
                    value={description}
                    disabled={phase === 'submitting'}
                    onChange={(e) => setDescription(e.target.value.slice(0, 400))}
                    placeholder={infoDescPlaceholder}
                    rows={4}
                    className="scrollbar-none min-h-[100px] w-full resize-none rounded-md border-0 bg-[#1a1a1a] px-3 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/35 outline-none ring-0 focus:ring-1 focus:ring-white/15 disabled:opacity-60"
                  />
                </div>
              ) : null}
              {error ? (
                <p className="mt-3 text-[13px] text-rose-300" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 justify-end border-t border-white/[0.08] px-5 py-3.5">
              <button
                type="button"
                disabled={phase === 'submitting'}
                className="cursor-pointer rounded-md bg-[#fe2c55] px-5 py-2 text-[14px] font-bold tracking-wide text-white uppercase transition hover:bg-[#ef2b50] disabled:cursor-wait disabled:opacity-70"
                onClick={() => void submitReport()}
              >
                {phase === 'submitting' ? t('report.sending') : t('report.send')}
              </button>
            </div>
          </div>
        ) : phase === 'detail' || phase === 'submitting' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 bg-[#2f2f2f] px-5 py-3.5">
              <p className="text-[15px] leading-snug text-white">{reason}</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-4">
              <label
                htmlFor="vibely-report-description"
                className="mb-2 text-[15px] font-medium text-white"
              >
                {detailLabel}
              </label>
              <textarea
                id="vibely-report-description"
                value={description}
                disabled={phase === 'submitting'}
                onChange={(e) => setDescription(e.target.value.slice(0, 400))}
                placeholder={detailPlaceholder}
                rows={6}
                className="scrollbar-none min-h-[140px] w-full flex-1 resize-none rounded-md border-0 bg-[#1a1a1a] px-3 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/35 outline-none ring-0 focus:ring-1 focus:ring-white/15 disabled:opacity-60"
              />
              {error ? (
                <p className="mt-2 text-[13px] text-rose-300" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={phase === 'submitting'}
                  className="cursor-pointer rounded-md bg-[#fe2c55] px-5 py-2 text-[14px] font-bold tracking-wide text-white uppercase transition hover:bg-[#ef2b50] disabled:cursor-wait disabled:opacity-70"
                  onClick={() => void submitReport()}
                >
                  {phase === 'submitting' ? t('report.sending') : t('report.send')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {showPickHint ? (
              <p className="shrink-0 px-5 pb-1 pt-3 text-[13px] text-white/45">
                {t('report.pickHint')}
              </p>
            ) : null}
            {error ? (
              <p className="shrink-0 px-5 pb-2 text-[13px] text-rose-300" role="alert">
                {error}
              </p>
            ) : null}
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
              <ul className="divide-y divide-white/[0.06]">
                {listItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.09]"
                      onClick={() => onPickItem(item)}
                    >
                      <span className="min-w-0 flex-1 text-[15px] leading-snug text-white">
                        {t(item.labelKey)}
                      </span>
                      <IoChevronForward
                        className="h-4 w-4 shrink-0 text-white/35"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
