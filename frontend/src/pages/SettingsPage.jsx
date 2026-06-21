import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function SettingsSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}
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
      className="group flex w-full items-center justify-between gap-4 rounded-lg border-b border-zinc-800/70 px-3 py-4 text-left transition hover:bg-zinc-800/70 last:border-b-0"
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

function AccountRemovalChoice({ title, description }) {
  return (
    <button
      type="button"
      className="group flex w-full items-start justify-between gap-4 rounded-xl bg-zinc-800/90 px-4 py-4 text-left transition hover:bg-zinc-800"
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
  const [privateAccount, setPrivateAccount] = useState(false)
  const [suggestAccount, setSuggestAccount] = useState(true)
  const [profileViews, setProfileViews] = useState(false)
  const [browserActivity, setBrowserActivity] = useState(true)
  const [adPersonalization, setAdPersonalization] = useState(true)
  const [weeklyScreenReport, setWeeklyScreenReport] = useState(false)
  const [activeSetting, setActiveSetting] = useState('account')
  const [accountView, setAccountView] = useState('main')

  useEffect(() => {
    document.title = 'Cài đặt | Vibely'
  }, [])

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
                    />
                    <AccountRemovalChoice
                      title="Xóa tài khoản vĩnh viễn"
                      description="Tài khoản và nội dung của bạn sẽ bị xóa vĩnh viễn. Bạn có thể hủy yêu cầu xóa bằng cách kích hoạt lại tài khoản trong vòng 30 ngày."
                    />
                  </div>
                </section>
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
                  <SettingsSwitch checked={privateAccount} onChange={setPrivateAccount} label="Tài khoản riêng tư" />
                </div>
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
