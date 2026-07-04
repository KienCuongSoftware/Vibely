import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { collectLoginContext } from '../security/loginContext'
import { useAuth } from '../state/useAuth'
import {
  IoArrowBack,
  IoBriefcaseOutline,
  IoChevronForward,
  IoGlobeOutline,
  IoLockClosedOutline,
  IoNotificationsOutline,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
  IoPerson,
} from 'react-icons/io5'

const SETTINGS_NAV = [
  { id: 'account', label: 'Quản lý tài khoản', icon: IoPerson },
  { id: 'privacy', label: 'Quyền riêng tư', icon: IoLockClosedOutline },
  { id: 'push', label: 'Thông báo đẩy', icon: IoNotificationsOutline },
  { id: 'business', label: 'Tài khoản doanh nghiệp', icon: IoBriefcaseOutline },
  { id: 'ads', label: 'Quảng cáo', icon: IoShieldCheckmarkOutline },
  { id: 'screen-time', label: 'Thời gian sử dụng màn hình', icon: IoTimeOutline },
  { id: 'content', label: 'Tùy chọn nội dung', icon: IoGlobeOutline },
]

const DELETE_REASONS = [
  {
    id: 'temporary',
    label: 'Tôi chỉ tạm thời ngừng sử dụng',
    help: 'Nếu bạn có ý định quay lại sử dụng, hãy cân nhắc hủy kích hoạt tài khoản. Việc này sẽ tạm ẩn hồ sơ và nội dung của bạn cho đến khi bạn đăng nhập lại.',
    actions: ['Hủy kích hoạt tài khoản'],
  },
  {
    id: 'too-much',
    label: 'Tôi dùng Vibely quá nhiều',
    help: 'Những biện pháp sau đây có thể giúp ích cho bạn:',
    actions: ['Đặt giới hạn về thời gian xem của bạn'],
  },
  {
    id: 'privacy',
    label: 'Lo ngại về sự an toàn hoặc quyền riêng tư',
    help: 'Những biện pháp sau đây có thể giúp ích cho bạn:',
    actions: [
      'Giữ an toàn cho tài khoản của bạn',
      'Chuyển sang tài khoản riêng tư và quản lý cài đặt quyền riêng tư',
      'Chặn người dùng',
      'Báo cáo vấn đề',
    ],
  },
  {
    id: 'ads',
    label: 'Quá nhiều quảng cáo không phù hợp',
    help: 'Những biện pháp sau đây có thể giúp ích cho bạn:',
    actions: ['Quản lý cá nhân hóa quảng cáo của bạn'],
  },
  {
    id: 'trouble',
    label: 'Gặp sự cố khi bắt đầu',
    help: 'Những biện pháp sau đây có thể giúp ích cho bạn:',
    actions: ['Thiết lập hồ sơ của bạn'],
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-zinc-700'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function SettingsRow({ title, description, trailing, danger = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border-b border-zinc-800/70 px-3 py-4 text-left transition hover:bg-zinc-800/70 last:border-b-0"
    >
      <span className="min-w-0">
        <span className={`block text-sm font-medium transition ${danger ? 'text-red-400' : 'text-zinc-100 group-hover:text-white'}`}>{title}</span>
        {description ? <span className="mt-1 block text-xs leading-relaxed text-zinc-500 transition group-hover:text-zinc-400">{description}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-500 transition group-hover:text-zinc-300">
        {trailing}
        <IoChevronForward className="text-base transition group-hover:text-zinc-300" aria-hidden />
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

export function SettingsPage() {
  const navigate = useNavigate()
  const { token, user, logout, refreshProfile } = useAuth()
  const [privateAccount, setPrivateAccount] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacyError, setPrivacyError] = useState('')
  const [suggestAccount, setSuggestAccount] = useState(true)
  const [profileViews, setProfileViews] = useState(false)
  const [browserActivity, setBrowserActivity] = useState(true)
  const [adPersonalization, setAdPersonalization] = useState(true)
  const [weeklyScreenReport, setWeeklyScreenReport] = useState(false)
  const [activeSetting, setActiveSetting] = useState('account')
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

  useEffect(() => {
    document.title = 'Cài đặt | Vibely'
  }, [])

  useEffect(() => {
    setPrivateAccount(Boolean(user?.privateAccount))
  }, [user?.privateAccount])

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
      setPrivacyError(error?.message || 'Không thể cập nhật quyền riêng tư.')
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
      setDeactivationError('Bạn cần đăng nhập để tiếp tục.')
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
      setDeactivationError(error?.message || 'Không thể gửi mã xác minh.')
    } finally {
      setSendingDeactivationCode(false)
    }
  }

  const deactivateAccount = async () => {
    if (!token) {
      setDeactivationError('Bạn cần đăng nhập để tiếp tục.')
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
      setDeactivationError(error?.message || 'Không thể hủy kích hoạt tài khoản.')
    } finally {
      setDeactivatingAccount(false)
    }
  }

  const sendDeletionCode = async () => {
    if (!token) {
      setDeletionError('Bạn cần đăng nhập để tiếp tục.')
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
      setDeletionError(error?.message || 'Không thể gửi mã xác minh.')
    } finally {
      setSendingDeletionCode(false)
    }
  }

  const deleteAccount = async () => {
    if (!token) {
      setDeletionError('Bạn cần đăng nhập để tiếp tục.')
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
      setDeletionError(error?.message || 'Không thể xóa tài khoản.')
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <section className="flex h-dvh overflow-hidden bg-black text-zinc-100">
      <main className="scrollbar-none min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <aside className="sticky top-6 hidden h-[calc(100dvh-48px)] w-64 shrink-0 rounded-xl bg-zinc-950 p-2 ring-1 ring-zinc-900 lg:block">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
              aria-label="Quay lại"
            >
              <IoArrowBack className="text-xl" aria-hidden />
            </button>
            <nav className="space-y-1">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon
                const active = activeSetting === item.id
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => {
                      setAccountView('main')
                      setActiveSetting(item.id)
                    }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'bg-zinc-900 text-red-500'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="text-lg" aria-hidden />
                    <span>{item.label}</span>
                  </a>
                )
              })}
            </nav>
          </aside>

          <div id="account" className="min-w-0 flex-1 scroll-mt-6 rounded-xl bg-zinc-950 px-5 py-6 ring-1 ring-zinc-900 sm:px-8">
            {accountView === 'removal' ? (
              <div className="min-h-[520px]">
                <button
                  type="button"
                  onClick={() => setAccountView('main')}
                  className="mb-5 flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  aria-label="Quay lại quản lý tài khoản"
                >
                  <IoArrowBack className="text-lg" aria-hidden />
                </button>

                <section className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                  <h1 className="text-2xl font-bold text-zinc-100">Xóa hoặc hủy kích hoạt?</h1>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
                    Nếu bạn muốn tạm ngừng sử dụng Vibely, bạn chỉ cần hủy kích hoạt tài khoản.
                    Tuy nhiên, nếu bạn chọn xóa tài khoản, bạn sẽ không thể khôi phục tài khoản đó sau 30 ngày.
                  </p>

                  <div className="mt-5 space-y-3">
                    <AccountRemovalChoice
                      title="Hủy kích hoạt tài khoản"
                      description="Không ai có thể nhìn thấy tài khoản của bạn, bao gồm nội dung đã đăng, bình luận và hồ sơ. Bạn có thể kích hoạt lại bất cứ khi nào đăng nhập lại."
                      onClick={startDeactivationFlow}
                    />
                    <AccountRemovalChoice
                      title="Xóa tài khoản vĩnh viễn"
                      description="Tài khoản và nội dung của bạn sẽ bị xóa vĩnh viễn. Sau khi xác nhận xóa, bạn không thể khôi phục tài khoản này."
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
                  aria-label="Quay lại"
                >
                  <IoArrowBack className="text-lg" aria-hidden />
                </button>

                {deactivationStep === 'intro' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <div>
                      <h1 className="text-lg font-bold text-zinc-100">
                        {user?.username}: Hủy kích hoạt tài khoản này?
                      </h1>
                      <p className="mt-4 text-sm text-zinc-400">Nếu bạn hủy kích hoạt tài khoản của mình:</p>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
                        <li>Không ai có thể tìm thấy tài khoản và nội dung của bạn.</li>
                        <li>Người khác vẫn có thể xem được những tương tác trong tài khoản của họ, chẳng hạn như tin nhắn.</li>
                        <li>Vibely sẽ tiếp tục lưu trữ dữ liệu để bạn có thể khôi phục khi đăng nhập lại.</li>
                        <li>Bạn có thể kích hoạt lại bằng cách đăng nhập và xác minh tài khoản.</li>
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
                      {sendingDeactivationCode ? 'Đang gửi mã...' : 'Hủy kích hoạt'}
                    </button>
                  </section>
                ) : (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <div>
                      <h1 className="text-lg font-bold text-zinc-100">Hãy giúp chúng tôi xác nhận đó là bạn</h1>
                      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                        Để hủy kích hoạt {user?.username}, hãy nhập mã chúng tôi gửi tới email {maskEmail(user?.email)} của bạn.
                      </p>

                      <div className="mt-5 flex max-w-sm overflow-hidden rounded-lg bg-zinc-800">
                        <input
                          value={deactivationCode}
                          onChange={(event) => {
                            setDeactivationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                            setDeactivationError('')
                          }}
                          inputMode="numeric"
                          placeholder="Nhập mã gồm 6 chữ số"
                          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={sendDeactivationCode}
                          disabled={sendingDeactivationCode || deactivationCooldown > 0}
                          className="shrink-0 px-4 text-xs font-medium text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          {deactivationCooldown > 0 ? `Gửi lại mã ${deactivationCooldown}s` : 'Gửi lại mã'}
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
                      Hủy kích hoạt tài khoản
                    </button>
                  </section>
                )}

                {confirmDeactivateOpen ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/70 px-4">
                    <div className="w-full max-w-xs overflow-hidden rounded-xl bg-zinc-900 text-center shadow-2xl ring-1 ring-zinc-800">
                      <div className="px-5 py-5">
                        <h2 className="text-sm font-semibold text-zinc-100">Hủy kích hoạt</h2>
                        <p className="mt-1 text-sm text-zinc-200">{user?.username}?</p>
                      </div>
                      <div className="grid grid-cols-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setConfirmDeactivateOpen(false)}
                          disabled={deactivatingAccount}
                          className="px-4 py-3 text-sm text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={deactivateAccount}
                          disabled={deactivatingAccount}
                          className="border-l border-zinc-800 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-red-400/50"
                        >
                          {deactivatingAccount ? 'Đang xử lý...' : 'Hủy kích hoạt'}
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
                  aria-label="Quay lại"
                >
                  <IoArrowBack className="text-lg" aria-hidden />
                </button>

                {deletionStep === 'reason' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <h1 className="text-lg font-bold text-zinc-100">Trước khi bạn thoát, chúng tôi có thể giúp gì cho bạn?</h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      Hãy cho chúng tôi biết lý do bạn muốn xóa tài khoản để chúng tôi có thể giúp giải quyết vấn đề thường gặp.
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
                              {reason.label}
                              <span className={`h-4 w-4 rounded-full border ${selected ? 'border-red-500 bg-red-500 shadow-[inset_0_0_0_4px_#27272a]' : 'border-zinc-600'}`} />
                            </span>
                            {selected ? (
                              <span className="mt-3 block rounded-lg bg-zinc-800 px-4 py-3 text-xs leading-relaxed text-zinc-400">
                                {reason.help}
                                <span className="mt-2 block space-y-1">
                                  {reason.actions.map((action) => (
                                    <span key={action} className="block font-semibold text-zinc-100">
                                      {action} ›
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
                      Tiếp tục
                    </button>
                    <button type="button" onClick={() => setAccountView('removal')} className="mt-4 text-sm text-zinc-300 hover:text-white">
                      Bỏ qua
                    </button>
                  </section>
                ) : deletionStep === 'data' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <h1 className="text-lg font-bold text-zinc-100">Tải về dữ liệu Vibely của bạn</h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      Chúng tôi khuyên bạn tải dữ liệu trước khi xóa tài khoản. Sau khi tài khoản bị xóa, bạn có thể không truy cập được hồ sơ, video, bình luận và dữ liệu liên quan.
                    </p>
                    <button type="button" className="mt-5 w-fit text-sm font-semibold text-sky-400 hover:text-sky-300">
                      Yêu cầu tải về
                    </button>
                    <label className="mt-auto flex items-start gap-3 text-xs leading-relaxed text-zinc-400">
                      <input
                        type="checkbox"
                        checked={deletionDataAcknowledged}
                        onChange={(event) => setDeletionDataAcknowledged(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-red-500"
                      />
                      Việc bỏ qua bước này có nghĩa là bạn đã xét duyệt yêu cầu dữ liệu của mình và muốn tiếp tục xóa tài khoản.
                    </label>
                    <button
                      type="button"
                      onClick={() => setDeletionStep('confirm')}
                      disabled={!deletionDataAcknowledged}
                      className="mt-5 w-full rounded-md bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:cursor-not-allowed disabled:bg-red-500/35"
                    >
                      Tiếp tục
                    </button>
                  </section>
                ) : deletionStep === 'confirm' ? (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <h1 className="text-lg font-bold text-zinc-100">{user?.username}: Xóa tài khoản này?</h1>
                    <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                      Sau khi xác nhận, tài khoản của bạn sẽ bị xóa khỏi Vibely và bạn sẽ bị đăng xuất khỏi tất cả thiết bị.
                    </p>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
                      <li>Bạn sẽ không thể đăng nhập bằng tài khoản này sau khi xóa.</li>
                      <li>Video, hồ sơ, lượt thích, bình luận và quan hệ follow liên quan sẽ bị xóa theo dữ liệu tài khoản.</li>
                      <li>Một số dữ liệu pháp lý hoặc bảo mật có thể được giữ lại theo yêu cầu hệ thống.</li>
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
                      {sendingDeletionCode ? 'Đang gửi mã...' : 'Tiếp tục'}
                    </button>
                  </section>
                ) : (
                  <section className="flex min-h-[460px] flex-col rounded-xl border border-zinc-900 bg-zinc-900/40 p-5">
                    <div>
                      <h1 className="text-lg font-bold text-zinc-100">Hãy giúp chúng tôi xác nhận đó là bạn</h1>
                      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                        Để xóa {user?.username}, hãy nhập mã chúng tôi gửi tới email {maskEmail(user?.email)} của bạn.
                      </p>
                      <div className="mt-5 flex max-w-sm overflow-hidden rounded-lg bg-zinc-800">
                        <input
                          value={deletionCode}
                          onChange={(event) => {
                            setDeletionCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                            setDeletionError('')
                          }}
                          inputMode="numeric"
                          placeholder="Nhập mã gồm 6 chữ số"
                          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={sendDeletionCode}
                          disabled={sendingDeletionCode || deletionCooldown > 0}
                          className="shrink-0 px-4 text-xs font-medium text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          {deletionCooldown > 0 ? `Gửi lại mã ${deletionCooldown}s` : 'Gửi lại mã'}
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
                      Xóa tài khoản
                    </button>
                  </section>
                )}

                {confirmDeleteOpen ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/80 px-4">
                    <div className="w-full max-w-xs overflow-hidden rounded-xl bg-zinc-900 text-center shadow-2xl ring-1 ring-zinc-800">
                      <div className="px-5 py-5">
                        <h2 className="text-sm font-semibold text-zinc-100">Xóa</h2>
                        <p className="mt-1 text-sm font-semibold text-zinc-100">{user?.username}?</p>
                      </div>
                      <div className="grid grid-cols-2 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOpen(false)}
                          disabled={deletingAccount}
                          className="px-4 py-3 text-sm text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-500"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={deleteAccount}
                          disabled={deletingAccount}
                          className="border-l border-zinc-800 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-red-400/50"
                        >
                          {deletingAccount ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
            <h1 className="text-2xl font-bold text-zinc-100">Quản lý tài khoản</h1>

            <SettingsSection title="Kiểm soát tài khoản">
              <SettingsRow
                title="Hủy kích hoạt hoặc xóa tài khoản"
                onClick={() => {
                  setAccountView('removal')
                  setActiveSetting('account')
                  document.getElementById('account')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              />
            </SettingsSection>

            <SettingsSection title="Thông tin tài khoản">
              <SettingsRow title="Khu vực tài khoản" trailing="Việt Nam" />
            </SettingsSection>

            <SettingsSection title="Quyền riêng tư">
              <div id="privacy" className="scroll-mt-6">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 py-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Tài khoản riêng tư</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Khi bật, chỉ người bạn phê duyệt mới có thể follow và xem nội dung của bạn.
                    </p>
                  </div>
                  <SettingsSwitch
                    checked={privateAccount}
                    onChange={(next) => void handlePrivateAccountToggle(next)}
                    label="Tài khoản riêng tư"
                    disabled={privacySaving}
                  />
                </div>
                {privacyError ? (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{privacyError}</p>
                ) : null}
                {privacySaving ? (
                  <p className="text-xs text-zinc-500">Đang lưu cài đặt quyền riêng tư…</p>
                ) : null}
                <SettingsRow title="Tương tác" description="Bình luận, nhắn tin, duet và quyền tương tác khác." trailing="Mọi người" />
                <SettingsRow title="Tin nhắn trực tiếp" trailing="Bạn bè" />
                <SettingsRow title="Đã thích" trailing="Chỉ mình tôi" />
              </div>
            </SettingsSection>

            <SettingsSection title="Thông báo đẩy">
              <div id="push" className="scroll-mt-6">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 py-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Thông báo trên máy tính để bàn</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">Nhận thông báo hoạt động tài khoản trên trình duyệt.</p>
                  </div>
                  <SettingsSwitch checked={suggestAccount} onChange={setSuggestAccount} label="Thông báo trên máy tính" />
                </div>
                <SettingsRow title="Tùy chọn của bạn" description="Lượt thích, bình luận, follower và tin nhắn." />
                <SettingsRow title="Tương tác" />
                <SettingsRow title="Thông báo trong ứng dụng" />
              </div>
            </SettingsSection>

            <SettingsSection title="Xác minh doanh nghiệp">
              <div id="business" className="flex scroll-mt-6 items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Xác minh doanh nghiệp</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">Tăng độ tin cậy và hiển thị thông tin doanh nghiệp trên hồ sơ.</p>
                </div>
                <SettingsSwitch checked={profileViews} onChange={setProfileViews} label="Xác minh doanh nghiệp" />
              </div>
            </SettingsSection>

            <SettingsSection title="Quảng cáo">
              <div id="ads" className="scroll-mt-6">
                <SettingsRow title="Quản lý quảng cáo bạn nhìn thấy" description="Điều chỉnh chủ đề quảng cáo và nhà quảng cáo bạn đã tương tác." />
                <SettingsRow title="Tải xuống dữ liệu quảng cáo" />
                <SettingsRow title="Chỉnh sửa thông tin đối tượng" />
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 py-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Quảng cáo được cá nhân hóa</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">Sử dụng hoạt động của bạn để cá nhân hóa quảng cáo trong Vibely.</p>
                  </div>
                  <SettingsSwitch checked={adPersonalization} onChange={setAdPersonalization} label="Quảng cáo cá nhân hóa" />
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Sử dụng hoạt động ngoài Vibely</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">Cho phép dùng dữ liệu đối tác để cải thiện trải nghiệm quảng cáo.</p>
                  </div>
                  <SettingsSwitch checked={browserActivity} onChange={setBrowserActivity} label="Hoạt động ngoài Vibely" />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Thời gian sử dụng màn hình">
              <div id="screen-time" className="scroll-mt-6">
                <SettingsRow title="Thời gian sử dụng mỗi ngày" trailing="Tắt" />
                <SettingsRow title="Nghỉ giải lao sau thời gian sử dụng màn hình" trailing="Tắt" />
                <SettingsRow title="Giờ ngủ" trailing="Tắt" />
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 py-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Cập nhật thời gian sử dụng hằng tuần</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">Nhận báo cáo thói quen sử dụng tài khoản của bạn.</p>
                  </div>
                  <SettingsSwitch checked={weeklyScreenReport} onChange={setWeeklyScreenReport} label="Báo cáo hằng tuần" />
                </div>
                <SettingsRow title="Tóm tắt" />
                <SettingsRow title="Trợ giúp và tài nguyên" danger />
              </div>
            </SettingsSection>

            <SettingsSection title="Tùy chọn nội dung">
              <div id="content" className="scroll-mt-6">
                <SettingsRow title="Lọc từ khóa" description="Ẩn nội dung chứa từ khóa bạn không muốn nhìn thấy." />
                <SettingsRow title="Ngôn ngữ nội dung" trailing="Tiếng Việt" />
              </div>
            </SettingsSection>
              </>
            )}
          </div>
        </div>
      </main>
    </section>
  )
}
