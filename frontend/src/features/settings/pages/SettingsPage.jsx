import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/shared/api/client'
import { AccountRegionModal } from '@/features/settings/components/AccountRegionModal'
import {
  CommentPrivacyModal,
  commentAudienceLabel,
} from '@/features/settings/components/CommentPrivacyModal'
import {
  DmReceiveModal,
  dmAudienceLabel,
} from '@/features/settings/components/DmReceiveModal'
import { DmPotentialOffConfirmModal } from '@/features/settings/components/DmPotentialOffConfirmModal'
import { DownloadYourDataPanel } from '@/features/settings/components/DownloadYourDataPanel'
import {
  DEFAULT_REGION_CODE,
  getRegionLabel,
} from '@/features/settings/utils/accountRegions'
import { collectLoginContext } from '@/security/loginContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useNotificationUnread } from '@/features/notification/store/NotificationUnreadContext'
import { useChatInboxBadge } from '@/features/chat/store/ChatInboxBadgeContext'
import { useSearchModal } from '@/features/search/store/SearchModalContext'
import { ActivityPanel } from '@/features/notification/components/ActivityPanel'
import { AccountAvatarMenu } from '@/shared/components/AccountAvatarMenu.jsx'
import { AvatarImage } from '@/shared/components/AvatarImage'
import { VibelyWordmark } from '@/shared/components/VibelyWordmark.jsx'
import {
  IoAccessibilityOutline,
  IoArrowBack,
  IoChatbubbleOutline,
  IoChevronForward,
  IoCloudUploadOutline,
  IoHourglassOutline,
  IoMegaphoneOutline,
  IoNotificationsOutline,
  IoPerson,
  IoSearchOutline,
  IoShieldOutline,
  IoStorefrontOutline,
  IoVideocamOutline,
} from 'react-icons/io5'

/** Sidebar mirrors TikTok web settings order/icons. */
const SETTINGS_NAV_IDS = [
  { id: 'account', labelKey: 'settings.account', icon: IoPerson },
  { id: 'privacy', labelKey: 'settings.privacy', icon: IoShieldOutline },
  { id: 'push', labelKey: 'settings.push', icon: IoNotificationsOutline },
  { id: 'business', labelKey: 'settings.business', icon: IoStorefrontOutline },
  { id: 'ads', labelKey: 'settings.ads', icon: IoMegaphoneOutline },
  { id: 'screen-time', labelKey: 'settings.screenTime', icon: IoHourglassOutline },
  { id: 'content', labelKey: 'settings.content', icon: IoVideocamOutline },
  { id: 'accessibility', labelKey: 'settings.accessibility', icon: IoAccessibilityOutline },
]

const DELETE_REASONS = [
  {
    id: 'temporary',
    labelKey: 'settings.delete.reasonTemporary',
    helpKey: 'settings.delete.reasonTemporaryHelp',
    actionKeys: ['settings.delete.reasonTemporaryAction'],
  },
  {
    id: 'too-much',
    labelKey: 'settings.delete.reasonTooMuch',
    helpKey: 'settings.delete.reasonHelpLead',
    actionKeys: ['settings.delete.reasonTooMuchAction'],
  },
  {
    id: 'privacy',
    labelKey: 'settings.delete.reasonPrivacy',
    helpKey: 'settings.delete.reasonHelpLead',
    actionKeys: [
      'settings.delete.reasonPrivacyAction1',
      'settings.delete.reasonPrivacyAction2',
      'settings.delete.reasonPrivacyAction3',
      'settings.delete.reasonPrivacyAction4',
    ],
  },
  {
    id: 'ads',
    labelKey: 'settings.delete.reasonAds',
    helpKey: 'settings.delete.reasonHelpLead',
    actionKeys: ['settings.delete.reasonAdsAction'],
  },
  {
    id: 'trouble',
    labelKey: 'settings.delete.reasonTrouble',
    helpKey: 'settings.delete.reasonHelpLead',
    actionKeys: ['settings.delete.reasonTroubleAction'],
  },
]

function SettingsSwitch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#20D5EC]' : 'bg-zinc-600'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function SettingsToggleRow({ title, description, checked, onChange, label, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 px-0 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        {description ? (
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">{description}</p>
        ) : null}
      </div>
      <SettingsSwitch
        checked={checked}
        onChange={onChange}
        label={label || title}
        disabled={disabled}
      />
    </div>
  )
}

function SettingsRow({ title, description, trailing, danger = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center justify-between gap-4 border-b border-zinc-800/70 px-0 py-4 text-left transition hover:bg-transparent last:border-b-0"
    >
      <span className="min-w-0">
        <span className={`block text-sm font-medium transition ${danger ? 'text-red-400' : 'text-zinc-100 group-hover:text-white'}`}>{title}</span>
        {description ? <span className="mt-1 block text-xs leading-relaxed text-zinc-500 transition group-hover:text-zinc-400">{description}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm text-zinc-500 transition group-hover:text-zinc-300">
        {trailing}
        <IoChevronForward className="text-base text-zinc-500 transition group-hover:text-zinc-300" aria-hidden />
      </span>
    </button>
  )
}

function maskEmail(email) {
  const [name = '', domain = ''] = String(email ?? '').split('@')
  if (!name || !domain) return email ?? ''
  const visible = name.slice(0, Math.min(2, name.length))
  return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`
}

function AccountRemovalChoice({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-start justify-between gap-4 rounded-xl bg-zinc-800/90 px-4 py-4 text-left transition hover:bg-zinc-800"
    >
      <span>
        <span className="block text-sm font-semibold text-zinc-100">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{description}</span>
      </span>
      <IoChevronForward className="mt-0.5 shrink-0 text-lg text-zinc-400 transition group-hover:text-zinc-100" aria-hidden />
    </button>
  )
}

function SettingsSection({ title, children }) {
  return (
    <section className="border-b border-zinc-800/80 py-6 first:pt-0 last:border-b-0">
      <h2 className="mb-2 text-lg font-bold text-zinc-100">{title}</h2>
      <div>{children}</div>
    </section>
  )
}

/** Nhóm con trong section — chỉ tiêu đề, không bấm chọn. */
function SettingsGroupLabel({ title }) {
  return <h3 className="pb-1 pt-5 text-sm font-semibold text-zinc-100 first:pt-2">{title}</h3>
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { token, user, logout, refreshProfile } = useAuth()
  const { t, i18n } = useTranslation()
  const { unreadCount } = useNotificationUnread()
  const { chatInboxBadgeCount } = useChatInboxBadge()
  const searchModal = useSearchModal()
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const SETTINGS_NAV = SETTINGS_NAV_IDS.map((item) => ({ ...item, label: t(item.labelKey) }))
  const [privateAccount, setPrivateAccount] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacyError, setPrivacyError] = useState('')
  const [suggestAccount, setSuggestAccount] = useState(true)
  const [profileViews, setProfileViews] = useState(false)
  const [browserActivity, setBrowserActivity] = useState(true)
  const [adPersonalization, setAdPersonalization] = useState(true)
  const [weeklyScreenReport, setWeeklyScreenReport] = useState(false)
  const [increaseColorContrast, setIncreaseColorContrast] = useState(false)
  const [activeSetting, setActiveSetting] = useState('account')

  useEffect(() => {
    document.documentElement.classList.toggle('vibely-high-contrast', increaseColorContrast)
    return () => document.documentElement.classList.remove('vibely-high-contrast')
  }, [increaseColorContrast])
  const [accountView, setAccountView] = useState('main')
  const [deactivationStep, setDeactivationStep] = useState('intro')
  const [deactivationCode, setDeactivationCode] = useState('')
  const [deactivationError, setDeactivationError] = useState('')
  const [deactivationCooldown, setDeactivationCooldown] = useState(0)
  const [sendingDeactivationCode, setSendingDeactivationCode] = useState(false)
  const [deactivatingAccount, setDeactivatingAccount] = useState(false)
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  const [deletionStep, setDeletionStep] = useState('reason')
  const [deletionReason, setDeletionReason] = useState('')
  const [deletionDataAcknowledged, setDeletionDataAcknowledged] = useState(false)
  const [deletionCode, setDeletionCode] = useState('')
  const [deletionError, setDeletionError] = useState('')
  const [deletionCooldown, setDeletionCooldown] = useState(0)
  const [sendingDeletionCode, setSendingDeletionCode] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [accountRegionCode, setAccountRegionCode] = useState(DEFAULT_REGION_CODE)
  const [accountRegionModalOpen, setAccountRegionModalOpen] = useState(false)
  const [accountRegionSaving, setAccountRegionSaving] = useState(false)
  const [accountRegionError, setAccountRegionError] = useState('')
  const [commentAudience, setCommentAudience] = useState('EVERYONE')
  const [commentPrivacyModalOpen, setCommentPrivacyModalOpen] = useState(false)
  const [commentPrivacySaving, setCommentPrivacySaving] = useState(false)
  const [commentPrivacyError, setCommentPrivacyError] = useState('')
  const [privacyView, setPrivacyView] = useState('main')
  const [dmPotentialAudience, setDmPotentialAudience] = useState('REQUEST')
  const [dmOthersAudience, setDmOthersAudience] = useState('REQUEST')
  const [dmModalKind, setDmModalKind] = useState(null)
  const [dmPotentialOffConfirmOpen, setDmPotentialOffConfirmOpen] = useState(false)
  const [dmSaving, setDmSaving] = useState(false)
  const [dmError, setDmError] = useState('')
  const [dataExportRequests, setDataExportRequests] = useState([])
  const [dataExportLoading, setDataExportLoading] = useState(false)
  const [dataExportSubmitting, setDataExportSubmitting] = useState(false)
  const [dataExportError, setDataExportError] = useState('')

  useEffect(() => {
    document.title = `${t('settings.title')} | Vibely`
  }, [t])

  useEffect(() => {
    if (!avatarMenuOpen) return
    const handler = (e) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarMenuOpen])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  useEffect(() => {
    setPrivateAccount(Boolean(user?.privateAccount))
  }, [user?.privateAccount])

  useEffect(() => {
    const code = String(user?.accountRegion || DEFAULT_REGION_CODE).toUpperCase()
    setAccountRegionCode(code || DEFAULT_REGION_CODE)
  }, [user?.accountRegion])

  useEffect(() => {
    const audience = String(user?.commentAudience || 'EVERYONE').toUpperCase()
    setCommentAudience(audience === 'FRIENDS' ? 'FRIENDS' : 'EVERYONE')
  }, [user?.commentAudience])

  useEffect(() => {
    const potential = String(user?.dmPotentialAudience || 'REQUEST').toUpperCase()
    setDmPotentialAudience(potential === 'OFF' ? 'OFF' : 'REQUEST')
    const others = String(user?.dmOthersAudience || 'REQUEST').toUpperCase()
    setDmOthersAudience(others === 'OFF' ? 'OFF' : 'REQUEST')
  }, [user?.dmPotentialAudience, user?.dmOthersAudience])

  const handlePrivateAccountToggle = async (nextValue) => {
    if (!token) {
      navigate('/login')
      return
    }
    const previous = privateAccount
    setPrivateAccount(nextValue)
    setPrivacySaving(true)
    setPrivacyError('')
    try {
      await apiClient.updatePrivacySettings(token, { privateAccount: nextValue })
      await refreshProfile()
    } catch (error) {
      setPrivateAccount(previous)
      setPrivacyError(error?.message || t('settings.errors.privacyUpdate'))
    } finally {
      setPrivacySaving(false)
    }
  }

  useEffect(() => {
    if (deactivationCooldown <= 0) return undefined
    const timer = window.setInterval(() => {
      setDeactivationCooldown((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [deactivationCooldown])

  useEffect(() => {
    if (deletionCooldown <= 0) return undefined
    const timer = window.setInterval(() => {
      setDeletionCooldown((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [deletionCooldown])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) {
          setActiveSetting(visible.target.id)
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.1, 0.35, 0.6],
      },
    )

    SETTINGS_NAV.forEach((item) => {
      const node = document.getElementById(item.id)
      if (node) {
        observer.observe(node)
      }
    })

    return () => observer.disconnect()
  }, [])

  const startDeactivationFlow = () => {
    setAccountView('deactivation')
    setDeactivationStep('intro')
    setDeactivationCode('')
    setDeactivationError('')
    setConfirmDeactivateOpen(false)
  }

  const startDeletionFlow = () => {
    setAccountView('deletion')
    setDeletionStep('reason')
    setDeletionReason('')
    setDeletionDataAcknowledged(false)
    setDeletionCode('')
    setDeletionError('')
    setConfirmDeleteOpen(false)
  }

  const sendDeactivationCode = async () => {
    if (!token) {
      setDeactivationError(t('settings.loginRequired'))
      return
    }
    setSendingDeactivationCode(true)
    setDeactivationError('')
    try {
      const loginContext = await collectLoginContext()
      const result = await apiClient.sendAccountDeactivationCode(token, loginContext)
      setDeactivationCooldown(result?.resendAfterSeconds ?? 60)
      setDeactivationStep('code')
    } catch (error) {
      setDeactivationError(error?.message || t('settings.errors.sendCode'))
    } finally {
      setSendingDeactivationCode(false)
    }
  }

  const deactivateAccount = async () => {
    if (!token) {
      setDeactivationError(t('settings.loginRequired'))
      return
    }
    setDeactivatingAccount(true)
    setDeactivationError('')
    try {
      await apiClient.deactivateAccount(token, { code: deactivationCode })
      logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setConfirmDeactivateOpen(false)
      setDeactivationError(error?.message || t('settings.errors.deactivate'))
    } finally {
      setDeactivatingAccount(false)
    }
  }

  const sendDeletionCode = async () => {
    if (!token) {
      setDeletionError(t('settings.loginRequired'))
      return
    }
    setSendingDeletionCode(true)
    setDeletionError('')
    try {
      const loginContext = await collectLoginContext({ requireLocation: true })
      const result = await apiClient.sendAccountDeletionCode(token, loginContext)
      setDeletionCooldown(result?.resendAfterSeconds ?? 60)
      setDeletionStep('code')
    } catch (error) {
      setDeletionError(error?.message || t('settings.errors.sendCode'))
    } finally {
      setSendingDeletionCode(false)
    }
  }

  const deleteAccount = async () => {
    if (!token) {
      setDeletionError(t('settings.loginRequired'))
      return
    }
    setDeletingAccount(true)
    setDeletionError('')
    try {
      await apiClient.deleteAccount(token, { code: deletionCode })
      logout()
      navigate('/signup', { replace: true })
    } catch (error) {
      setConfirmDeleteOpen(false)
      setDeletionError(error?.message || t('settings.errors.delete'))
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleConfirmAccountRegion = async (code) => {
    if (!token) {
      navigate('/login')
      return
    }
    const previous = accountRegionCode
    setAccountRegionSaving(true)
    setAccountRegionError('')
    try {
      await apiClient.updateAccountRegion(token, { accountRegion: code })
      setAccountRegionCode(code)
      await refreshProfile()
      setAccountRegionModalOpen(false)
    } catch (error) {
      setAccountRegionCode(previous)
      setAccountRegionError(error?.message || t('settings.errors.regionUpdate'))
    } finally {
      setAccountRegionSaving(false)
    }
  }

  const handleSelectCommentAudience = async (nextAudience) => {
    if (!token) {
      navigate('/login')
      return
    }
    const previous = commentAudience
    setCommentAudience(nextAudience)
    setCommentPrivacySaving(true)
    setCommentPrivacyError('')
    try {
      await apiClient.updatePrivacySettings(token, { commentAudience: nextAudience })
      await refreshProfile()
    } catch (error) {
      setCommentAudience(previous)
      setCommentPrivacyError(error?.message || t('settings.errors.commentUpdate'))
    } finally {
      setCommentPrivacySaving(false)
    }
  }

  const handleSelectDmAudience = async (nextValue) => {
    if (!token) {
      navigate('/login')
      return
    }
    if (dmModalKind !== 'potential' && dmModalKind !== 'others') return

    // Kết nối tiềm năng → Không nhận: cần xác nhận (cũng tắt Người khác).
    if (dmModalKind === 'potential' && nextValue === 'OFF') {
      setDmError('')
      setDmModalKind(null)
      setDmPotentialOffConfirmOpen(true)
      return
    }

    const isPotential = dmModalKind === 'potential'
    const previous = isPotential ? dmPotentialAudience : dmOthersAudience
    if (isPotential) setDmPotentialAudience(nextValue)
    else setDmOthersAudience(nextValue)
    setDmSaving(true)
    setDmError('')
    try {
      await apiClient.updatePrivacySettings(
        token,
        isPotential
          ? { dmPotentialAudience: nextValue }
          : { dmOthersAudience: nextValue },
      )
      await refreshProfile()
      setDmModalKind(null)
    } catch (error) {
      if (isPotential) setDmPotentialAudience(previous)
      else setDmOthersAudience(previous)
      setDmError(error?.message || t('settings.errors.dmUpdate'))
    } finally {
      setDmSaving(false)
    }
  }

  const handleConfirmDmPotentialOff = async () => {
    if (!token) {
      navigate('/login')
      return
    }
    const previousPotential = dmPotentialAudience
    const previousOthers = dmOthersAudience
    setDmPotentialAudience('OFF')
    setDmOthersAudience('OFF')
    setDmSaving(true)
    setDmError('')
    try {
      await apiClient.updatePrivacySettings(token, {
        dmPotentialAudience: 'OFF',
        dmOthersAudience: 'OFF',
      })
      await refreshProfile()
      setDmPotentialOffConfirmOpen(false)
    } catch (error) {
      setDmPotentialAudience(previousPotential)
      setDmOthersAudience(previousOthers)
      setDmError(error?.message || t('settings.errors.dmUpdate'))
    } finally {
      setDmSaving(false)
    }
  }

  const loadDataExportRequests = async () => {
    if (!token) return
    setDataExportLoading(true)
    setDataExportError('')
    try {
      const rows = await apiClient.listDataExports(token)
      setDataExportRequests(Array.isArray(rows) ? rows : [])
    } catch (error) {
      setDataExportError(error?.message || t('settings.errors.dataExportList'))
    } finally {
      setDataExportLoading(false)
    }
  }

  const handleCreateDataExport = async ({ format, categories }) => {
    if (!token) {
      navigate('/login')
      return
    }
    setDataExportSubmitting(true)
    setDataExportError('')
    try {
      await apiClient.createDataExport(token, { format, categories })
      await loadDataExportRequests()
    } catch (error) {
      setDataExportError(error?.message || t('settings.errors.dataExportCreate'))
    } finally {
      setDataExportSubmitting(false)
    }
  }

  const handleCancelDataExport = async (requestId) => {
    if (!token) {
      navigate('/login')
      return
    }
    setDataExportSubmitting(true)
    setDataExportError('')
    try {
      await apiClient.cancelDataExport(token, requestId)
      await loadDataExportRequests()
    } catch (error) {
      setDataExportError(error?.message || t('settings.errors.dataExportCancel'))
    } finally {
      setDataExportSubmitting(false)
    }
  }

  const contentRef = useRef(null)
  const avatarSrc = String(
    user?.avatarUrl || user?.avatar || user?.profileImageUrl || '/images/users/default-avatar.jpeg',
  ).trim()

  const scrollToSection = (id) => {
    const el = contentRef.current?.querySelector(`[data-section="${id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleOpenSettings = () => {
    setActiveSetting('account')
    setAccountView('main')
    setPrivacyView('main')
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    navigate('/settings')
  }

  return (
    <section className="vibely-chrome flex h-dvh flex-col overflow-hidden bg-black text-zinc-100">
      {/* ── TikTok-style top header ── */}
      <header className="relative z-50 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-900 bg-black px-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center text-zinc-100 hover:text-white">
          <VibelyWordmark className="h-9 w-auto shrink-0" />
        </Link>

        {/* Search bar */}
        <button
          type="button"
          onClick={() => searchModal?.openSearch?.()}
          className="mx-auto flex h-9 w-full max-w-sm items-center gap-2 rounded-full bg-zinc-900 px-4 text-sm text-zinc-500 ring-1 ring-zinc-800 hover:ring-zinc-600"
        >
          <IoSearchOutline className="shrink-0 text-base" />
          <span>{t('nav.search')}</span>
        </button>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Upload */}
          <Link
            to="/upload"
            className="flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          >
            <IoCloudUploadOutline className="text-base" />
            <span className="hidden sm:block">{t('nav.upload')}</span>
          </Link>

          {/* Messages */}
          <Link
            to="/messages"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900"
          >
            <IoChatbubbleOutline className="text-xl" />
            {chatInboxBadgeCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {chatInboxBadgeCount > 99 ? '99+' : chatInboxBadgeCount}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => { setNotifOpen((v) => !v); setAvatarMenuOpen(false) }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900"
            >
              <IoNotificationsOutline className="text-xl" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 h-[520px] w-80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                <ActivityPanel onClose={() => setNotifOpen(false)} />
              </div>
            )}
          </div>

          {/* Avatar + dropdown */}
          <div className="relative" ref={avatarMenuRef}>
            <button
              type="button"
              onClick={() => { setAvatarMenuOpen((v) => !v); setNotifOpen(false) }}
              className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-transparent hover:ring-zinc-600"
            >
              <AvatarImage src={avatarSrc} alt={user?.displayName || 'avatar'} className="h-full w-full object-cover" />
            </button>

            <AccountAvatarMenu
              open={avatarMenuOpen}
              onClose={() => setAvatarMenuOpen(false)}
              user={user}
              token={token}
              onLogout={logout}
              onOpenSettings={handleOpenSettings}
            />
          </div>
        </div>
      </header>

      <main className="scrollbar-none min-w-0 flex-1 overflow-y-auto" ref={contentRef}>
        <div className="mx-auto flex w-full max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <aside className="sticky top-6 hidden h-[calc(100dvh-48px)] w-64 shrink-0 overflow-y-auto rounded-xl bg-zinc-950 p-2 ring-1 ring-zinc-900 lg:block [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
              aria-label={t('common.back')}
            >
              <IoArrowBack className="text-xl" aria-hidden />
            </button>
            <nav className="space-y-0.5">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon
                const active = activeSetting === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAccountView('main')
                      setPrivacyView('main')
                      setActiveSetting(item.id)
                      scrollToSection(item.id)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                      active
                        ? 'bg-zinc-900 text-red-500'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="shrink-0 text-lg" aria-hidden />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 rounded-xl bg-zinc-950 px-5 py-6 ring-1 ring-zinc-900 sm:px-8">
            {privacyView !== 'direct-messages' && privacyView !== 'download-data' && accountView === 'main' && (
              <div className="mb-6">
                <div className="flex h-11 items-center gap-2 rounded-full bg-zinc-900 px-4 ring-1 ring-zinc-800 focus-within:ring-zinc-600">
                  <IoSearchOutline className="shrink-0 text-base text-zinc-500" aria-hidden />
                  <input
                    type="search"
                    placeholder={t('settings.searchPlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                  />
                </div>
              </div>
            )}
            {privacyView === 'direct-messages' ? (
              <div className="min-h-[520px]">
                <button
                  type="button"
                  onClick={() => setPrivacyView('main')}
                  className="mb-5 flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                  aria-label={t('common.back')}
                >
                  <IoArrowBack className="text-xl" aria-hidden />
                </button>
                <h1 className="text-2xl font-bold text-zinc-100">{t('settings.dm.title')}</h1>
                <p className="mt-6 text-sm font-semibold text-zinc-100">{t('settings.dm.whoCanMessage')}</p>
                <div className="mt-2">
                  <SettingsRow
                    title={t('settings.dm.potentialConnections')}
                    trailing={dmAudienceLabel(dmPotentialAudience, t)}
                    onClick={() => {
                      setDmError('')
                      setDmModalKind('potential')
                    }}
                  />
                  <SettingsRow
                    title={t('settings.dm.othersOnVibely')}
                    trailing={dmAudienceLabel(dmOthersAudience, t)}
                    onClick={() => {
                      setDmError('')
                      setDmModalKind('others')
                    }}
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  {t('settings.dm.footerHint')}
                </p>
              </div>
            ) : privacyView === 'download-data' ? (
              <DownloadYourDataPanel
                requests={dataExportRequests}
                loading={dataExportLoading}
                submitting={dataExportSubmitting}
                error={dataExportError}
                onBack={() => {
                  setDataExportError('')
                  setPrivacyView('main')
                }}
                onSubmit={handleCreateDataExport}
                onCancel={handleCancelDataExport}
              />
            ) : accountView === 'removal' ? (
              <div className="min-h-[520px]">
                <button
                  type="button"
                  onClick={() => setAccountView('main')}
                  className="mb-5 flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  aria-label={t('settings.deactivate.backToAccountAria')}
                >
                  <IoArrowBack className="text-lg" aria-hidden />
                </button>

                <section className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                  <h1 className="text-2xl font-bold text-zinc-100">{t('settings.deactivate.removalTitle')}</h1>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
                    {t('settings.deactivate.removalHint')}
                  </p>

                  <div className="mt-5 space-y-3">
                    <AccountRemovalChoice
                      title={t('settings.deactivate.deactivateTitle')}
                      description={t('settings.deactivate.deactivateDescription')}
                      onClick={startDeactivationFlow}
                    />
                    <AccountRemovalChoice
                      title={t('settings.deactivate.deleteTitle')}
                      description={t('settings.deactivate.deleteDescription')}
                      onClick={startDeletionFlow}
                    />
                  </div>
                </section>
              </div>
            ) : accountView === 'deactivation' ? (
              <div className="relative min-h-[520px]">
                <button
                  type="button"
                  onClick={() => {
                    if (deactivationStep === 'code') {
                      setDeactivationStep('intro')
                      setDeactivationError('')
                      return
                    }
                    setAccountView('removal')
                  }}
                  className="mb-5 flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  aria-label={t('common.back')}
                >
                  <IoArrowBack className="text-lg" aria-hidden />
                </button>

                {deactivationStep === 'intro' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <div>
                      <h1 className="text-lg font-bold text-zinc-100">
                        {t('settings.deactivate.confirmTitle', { username: user?.username })}
                      </h1>
                      <p className="mt-4 text-sm text-zinc-400">{t('settings.deactivate.confirmLead')}</p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
                        <li>{t('settings.deactivate.bullet1')}</li>
                        <li>{t('settings.deactivate.bullet2')}</li>
                        <li>{t('settings.deactivate.bullet3')}</li>
                        <li>{t('settings.deactivate.bullet4')}</li>
                      </ul>
                    </div>

                    {deactivationError ? (
                      <p className="mt-5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{deactivationError}</p>
                    ) : null}

                    <button
                      type="button"
                      onClick={sendDeactivationCode}
                      disabled={sendingDeactivationCode}
                      className="mt-auto w-full rounded-md bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/45"
                    >
                      {sendingDeactivationCode ? t('settings.sendingCode') : t('settings.deactivate.action')}
                    </button>
                  </section>
                ) : (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <div>
                      <h1 className="text-lg font-bold text-zinc-100">{t('settings.confirmIdentityTitle')}</h1>
                      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                        {t('settings.deactivate.confirmCodeLead', {
                          username: user?.username,
                          email: maskEmail(user?.email),
                        })}
                      </p>

                      <div className="mt-5 flex max-w-sm overflow-hidden rounded-lg bg-zinc-800">
                        <input
                          value={deactivationCode}
                          onChange={(event) => {
                            setDeactivationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                            setDeactivationError('')
                          }}
                          inputMode="numeric"
                          placeholder={t('settings.enterCodePlaceholder')}
                          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={sendDeactivationCode}
                          disabled={sendingDeactivationCode || deactivationCooldown > 0}
                          className="shrink-0 px-4 text-xs font-medium text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          {deactivationCooldown > 0
                            ? t('settings.resendCodeIn', { seconds: deactivationCooldown })
                            : t('settings.resendCode')}
                        </button>
                      </div>
                    </div>

                    {deactivationError ? (
                      <p className="mt-5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{deactivationError}</p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setConfirmDeactivateOpen(true)}
                      disabled={deactivationCode.length !== 6}
                      className="mt-auto w-full rounded-md bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/35"
                    >
                      {t('settings.deactivate.deactivateAccount')}
                    </button>
                  </section>
                )}

                {confirmDeactivateOpen ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/70 px-4">
                    <div className="w-full max-w-xs overflow-hidden rounded-xl bg-zinc-900 text-center shadow-2xl ring-1 ring-zinc-800">
                      <div className="px-5 py-5">
                        <h2 className="text-sm font-semibold text-zinc-100">{t('settings.deactivate.confirmModalTitle')}</h2>
                        <p className="mt-1 text-sm text-zinc-200">{user?.username}?</p>
                      </div>
                      <div className="grid grid-cols-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setConfirmDeactivateOpen(false)}
                          disabled={deactivatingAccount}
                          className="px-4 py-3 text-sm text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={deactivateAccount}
                          disabled={deactivatingAccount}
                          className="border-l border-zinc-800 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-red-400/50"
                        >
                          {deactivatingAccount ? t('settings.processing') : t('settings.deactivate.action')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : accountView === 'deletion' ? (
              <div className="relative min-h-[520px]">
                <button
                  type="button"
                  onClick={() => {
                    if (deletionStep === 'code') {
                      setDeletionStep('confirm')
                      setDeletionError('')
                      return
                    }
                    if (deletionStep === 'confirm') {
                      setDeletionStep('data')
                      setDeletionError('')
                      return
                    }
                    if (deletionStep === 'data') {
                      setDeletionStep('reason')
                      setDeletionError('')
                      return
                    }
                    setAccountView('removal')
                  }}
                  className="mb-5 flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  aria-label={t('common.back')}
                >
                  <IoArrowBack className="text-lg" aria-hidden />
                </button>

                {deletionStep === 'reason' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <h1 className="text-lg font-bold text-zinc-100">{t('settings.delete.reasonTitle')}</h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      {t('settings.delete.reasonHint')}
                    </p>
                    <div className="mt-5 space-y-3">
                      {DELETE_REASONS.map((reason) => {
                        const selected = deletionReason === reason.id
                        return (
                          <button
                            key={reason.id}
                            type="button"
                            onClick={() => setDeletionReason(reason.id)}
                            className="w-full text-left"
                          >
                            <span className="flex items-center justify-between gap-4 text-sm text-zinc-100">
                              {t(reason.labelKey)}
                              <span className={`h-4 w-4 rounded-full border ${selected ? 'border-red-500 bg-red-500 shadow-[inset_0_0_0_4px_#27272a]' : 'border-zinc-600'}`} />
                            </span>
                            {selected ? (
                              <span className="mt-3 block rounded-lg bg-zinc-800 px-4 py-3 text-xs leading-relaxed text-zinc-400">
                                {t(reason.helpKey)}
                                <span className="mt-2 block space-y-1">
                                  {reason.actionKeys.map((actionKey) => (
                                    <span key={actionKey} className="block font-semibold text-zinc-100">
                                      {t(actionKey)} ›
                                    </span>
                                  ))}
                                </span>
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeletionStep('data')}
                      disabled={!deletionReason}
                      className="mt-auto w-full rounded-md bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/35"
                    >
                      {t('settings.continue')}
                    </button>
                    <button type="button" onClick={() => setAccountView('removal')} className="mt-4 text-sm text-zinc-300 hover:text-white">
                      {t('settings.skip')}
                    </button>
                  </section>
                ) : deletionStep === 'data' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <h1 className="text-lg font-bold text-zinc-100">{t('settings.delete.dataTitle')}</h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      {t('settings.delete.dataHint')}
                    </p>
                    <button type="button" className="mt-5 w-fit text-sm font-semibold text-sky-400 hover:text-sky-300">
                      {t('settings.delete.requestDownload')}
                    </button>
                    <label className="mt-auto flex items-start gap-3 text-xs leading-relaxed text-zinc-400">
                      <input
                        type="checkbox"
                        checked={deletionDataAcknowledged}
                        onChange={(event) => setDeletionDataAcknowledged(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-red-500"
                      />
                      {t('settings.delete.dataAck')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setDeletionStep('confirm')}
                      disabled={!deletionDataAcknowledged}
                      className="mt-5 w-full rounded-md bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/35"
                    >
                      {t('settings.continue')}
                    </button>
                  </section>
                ) : deletionStep === 'confirm' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <h1 className="text-lg font-bold text-zinc-100">
                      {t('settings.delete.confirmTitle', { username: user?.username })}
                    </h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      {t('settings.delete.confirmLead')}
                    </p>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
                      <li>{t('settings.delete.bullet1')}</li>
                      <li>{t('settings.delete.bullet2')}</li>
                      <li>{t('settings.delete.bullet3')}</li>
                    </ul>
                    {deletionError ? (
                      <p className="mt-5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{deletionError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={sendDeletionCode}
                      disabled={sendingDeletionCode}
                      className="mt-auto w-full rounded-md bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/45"
                    >
                      {sendingDeletionCode ? t('settings.sendingCode') : t('settings.continue')}
                    </button>
                  </section>
                ) : (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <div>
                      <h1 className="text-lg font-bold text-zinc-100">{t('settings.confirmIdentityTitle')}</h1>
                      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                        {t('settings.delete.confirmCodeLead', {
                          username: user?.username,
                          email: maskEmail(user?.email),
                        })}
                      </p>
                      <div className="mt-5 flex max-w-sm overflow-hidden rounded-lg bg-zinc-800">
                        <input
                          value={deletionCode}
                          onChange={(event) => {
                            setDeletionCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                            setDeletionError('')
                          }}
                          inputMode="numeric"
                          placeholder={t('settings.enterCodePlaceholder')}
                          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={sendDeletionCode}
                          disabled={sendingDeletionCode || deletionCooldown > 0}
                          className="shrink-0 px-4 text-xs font-medium text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          {deletionCooldown > 0
                            ? t('settings.resendCodeIn', { seconds: deletionCooldown })
                            : t('settings.resendCode')}
                        </button>
                      </div>
                    </div>
                    {deletionError ? (
                      <p className="mt-5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{deletionError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(true)}
                      disabled={deletionCode.length !== 6}
                      className="mt-auto w-full rounded-md bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/35"
                    >
                      {t('settings.delete.deleteAccount')}
                    </button>
                  </section>
                )}

                {confirmDeleteOpen ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/80 px-4">
                    <div className="w-full max-w-xs overflow-hidden rounded-xl bg-zinc-900 text-center shadow-2xl ring-1 ring-zinc-800">
                      <div className="px-5 py-5">
                        <h2 className="text-sm font-semibold text-zinc-100">{t('settings.delete.confirmModalTitle')}</h2>
                        <p className="mt-1 text-sm font-semibold text-zinc-100">{user?.username}?</p>
                      </div>
                      <div className="grid grid-cols-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOpen(false)}
                          disabled={deletingAccount}
                          className="px-4 py-3 text-sm text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={deleteAccount}
                          disabled={deletingAccount}
                          className="border-l border-zinc-800 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-red-400/50"
                        >
                          {deletingAccount ? t('settings.delete.deleting') : t('common.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
            <div data-section="account" className="scroll-mt-4">
            <h1 className="text-2xl font-bold text-zinc-100">{t('settings.accountSection.title')}</h1>

            <SettingsSection title={t('settings.accountSection.control')}>
              <SettingsRow
                title={t('settings.accountSection.deactivateOrDelete')}
                onClick={() => {
                  setAccountView('removal')
                  setActiveSetting('account')
                  scrollToSection('account')
                }}
              />
            </SettingsSection>

            <SettingsSection title={t('settings.accountSection.info')}>
              <SettingsRow
                title={t('settings.accountSection.region')}
                trailing={getRegionLabel(accountRegionCode, i18n.language?.startsWith('vi') ? 'vi' : 'en')}
                onClick={() => {
                  setAccountRegionError('')
                  setAccountRegionModalOpen(true)
                }}
              />
            </SettingsSection>
            </div>

            <div data-section="privacy" className="scroll-mt-4">
            <SettingsSection title={t('settings.privacySection.title')}>
              <div>
                <SettingsGroupLabel title={t('settings.privacySection.discoverability')} />
                <SettingsToggleRow
                  title={t('settings.privacySection.privateAccount')}
                  description={t('settings.privacySection.privateAccountHint')}
                  checked={privateAccount}
                  onChange={(next) => void handlePrivateAccountToggle(next)}
                  disabled={privacySaving}
                />
                {privacyError ? (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{privacyError}</p>
                ) : null}
                {privacySaving ? (
                  <p className="text-xs text-zinc-500">{t('settings.savingPrivacy')}</p>
                ) : null}
                <SettingsGroupLabel title={t('settings.privacySection.interactions')} />
                <SettingsRow
                  title={t('settings.privacySection.comments')}
                  trailing={commentAudienceLabel(commentAudience, t)}
                  onClick={() => {
                    setCommentPrivacyError('')
                    setCommentPrivacyModalOpen(true)
                  }}
                />
                <SettingsRow
                  title={t('settings.privacySection.dm')}
                  onClick={() => {
                    setPrivacyView('direct-messages')
                    setActiveSetting('privacy')
                  }}
                />
                <SettingsGroupLabel title={t('settings.privacySection.data')} />
                <SettingsRow
                  title={t('settings.privacySection.downloadData')}
                  onClick={() => {
                    setPrivacyView('download-data')
                    setActiveSetting('privacy')
                    void loadDataExportRequests()
                  }}
                />
              </div>
            </SettingsSection>
            </div>

            <div data-section="push" className="scroll-mt-4">
            <SettingsSection title={t('settings.pushSection.title')}>
              <div>
                <SettingsGroupLabel title={t('settings.pushSection.desktopLong')} />
                <SettingsToggleRow
                  title={t('settings.pushSection.allowBrowser')}
                  description={t('settings.pushSection.allowBrowserHint')}
                  checked={suggestAccount}
                  onChange={setSuggestAccount}
                />
                <SettingsGroupLabel title={t('settings.pushSection.yourPreferences')} />
                <SettingsRow title={t('settings.pushSection.interactions')} />
                <SettingsGroupLabel title={t('settings.pushSection.inApp')} />
              </div>
            </SettingsSection>
            </div>

            <div data-section="business" className="scroll-mt-4">
            <SettingsSection title={t('settings.businessSection.title')}>
              <SettingsToggleRow
                title={t('settings.businessSection.title')}
                description={t('settings.businessSection.hint')}
                checked={profileViews}
                onChange={setProfileViews}
              />
            </SettingsSection>
            </div>

            <div data-section="ads" className="scroll-mt-4">
            <SettingsSection title={t('settings.adsSection.title')}>
              <div>
                <SettingsGroupLabel title={t('settings.adsSection.manageAds')} />
                <SettingsRow title={t('settings.adsSection.manageTopics')} />
                <SettingsRow title={t('settings.adsSection.turnOffAdvertisers')} />
                <SettingsRow title={t('settings.adsSection.editPersonalDetails')} />
                <SettingsGroupLabel title={t('settings.adsSection.offPlatformData')} />
                <SettingsToggleRow
                  title={t('settings.adsSection.targetedOutside')}
                  description={t('settings.adsSection.targetedOutsideHint')}
                  checked={adPersonalization}
                  onChange={setAdPersonalization}
                />
                <SettingsToggleRow
                  title={t('settings.adsSection.useOffPlatform')}
                  description={t('settings.adsSection.useOffPlatformHint')}
                  checked={browserActivity}
                  onChange={setBrowserActivity}
                />
                <SettingsRow title={t('settings.adsSection.disconnectAdvertisers')} />
                <SettingsRow title={t('settings.adsSection.clearOffPlatformData')} />
              </div>
            </SettingsSection>
            </div>

            <div data-section="screen-time" className="scroll-mt-4">
            <SettingsSection title={t('settings.screenTimeSection.title')}>
              <div>
                <SettingsRow title={t('settings.screenTimeSection.dailyLimit')} trailing={t('settings.off')} />
                <SettingsRow title={t('settings.screenTimeSection.restBreak')} trailing={t('settings.off')} />
                <SettingsToggleRow
                  title={t('settings.screenTimeSection.weeklyUpdate')}
                  description={t('settings.screenTimeSection.weeklyUpdateHint')}
                  checked={weeklyScreenReport}
                  onChange={setWeeklyScreenReport}
                />
                <SettingsRow title={t('settings.screenTimeSection.summary')} />
                <SettingsRow title={t('settings.screenTimeSection.helpResources')} />
              </div>
            </SettingsSection>
            </div>

            <div data-section="content" className="scroll-mt-4">
            <SettingsSection title={t('settings.contentSection.title')}>
              <div>
                <SettingsRow
                  title={t('settings.contentSection.filterKeywords')}
                  description={t('settings.contentSection.filterKeywordsHint')}
                />
              </div>
            </SettingsSection>
            </div>

            <div data-section="accessibility" className="scroll-mt-4">
            <SettingsSection title={t('settings.accessibilitySection.title')}>
              <SettingsToggleRow
                title={t('settings.accessibilitySection.increaseContrast')}
                description={t('settings.accessibilitySection.increaseContrastHint')}
                checked={increaseColorContrast}
                onChange={setIncreaseColorContrast}
              />
            </SettingsSection>
            </div>
              </>
            )}
          </div>
        </div>
      </main>

      <AccountRegionModal
        open={accountRegionModalOpen}
        currentCode={accountRegionCode}
        saving={accountRegionSaving}
        error={accountRegionError}
        onClose={() => {
          if (accountRegionSaving) return
          setAccountRegionError('')
          setAccountRegionModalOpen(false)
        }}
        onConfirm={handleConfirmAccountRegion}
      />
      <CommentPrivacyModal
        open={commentPrivacyModalOpen}
        value={commentAudience}
        saving={commentPrivacySaving}
        error={commentPrivacyError}
        onClose={() => {
          if (commentPrivacySaving) return
          setCommentPrivacyError('')
          setCommentPrivacyModalOpen(false)
        }}
        onSelect={handleSelectCommentAudience}
      />
      <DmReceiveModal
        open={dmModalKind === 'potential' || dmModalKind === 'others'}
        value={dmModalKind === 'others' ? dmOthersAudience : dmPotentialAudience}
        helpText={
          dmModalKind === 'others'
            ? t('settings.dm.othersHelp')
            : t('settings.dm.potentialHelp')
        }
        saving={dmSaving}
        error={dmError}
        onClose={() => {
          if (dmSaving) return
          setDmError('')
          setDmModalKind(null)
        }}
        onSelect={handleSelectDmAudience}
      />
      <DmPotentialOffConfirmModal
        open={dmPotentialOffConfirmOpen}
        saving={dmSaving}
        error={dmError}
        onClose={() => {
          if (dmSaving) return
          setDmError('')
          setDmPotentialOffConfirmOpen(false)
        }}
        onConfirm={handleConfirmDmPotentialOff}
      />
    </section>
  )
}
