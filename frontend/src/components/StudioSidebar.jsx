import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  IoBarChartOutline,
  IoBulbOutline,
  IoCashOutline,
  IoChatboxEllipsesOutline,
  IoCutOutline,
  IoHome,
  IoMailOutline,
  IoMusicalNotesOutline,
  IoSchoolOutline,
  IoVideocamOutline,
} from 'react-icons/io5'

function NavSection({ title, children }) {
  return (
    <div className="mt-5">
      <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavLink({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
        active
          ? 'bg-zinc-800 font-medium text-white'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      }`}
    >
      <Icon className="shrink-0 text-lg opacity-90" aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  )
}

function ToolRow({ icon: Icon, label, dot }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
    >
      <Icon className="shrink-0 text-lg opacity-90" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden /> : null}
    </button>
  )
}

const OPEN_UPLOAD_PICKER_KEY = 'vibely-studio-open-upload-picker'

export function StudioSidebar({ active = 'home' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const onUpload = location.pathname.includes('/upload')

  const handleUploadClick = () => {
    if (onUpload) {
      window.dispatchEvent(new CustomEvent('vibely-studio-upload-pick'))
      return
    }
    try {
      sessionStorage.setItem(OPEN_UPLOAD_PICKER_KEY, '1')
    } catch {
      /* ignore */
    }
    navigate('/vibelystudio/upload')
  }

  return (
    <aside className="relative z-20 flex h-dvh w-[240px] shrink-0 flex-col overflow-y-auto border-r border-zinc-800/80 bg-[#121212] px-2.5 py-4">
      <Link
        to="/vibelystudio/home"
        className="px-2 text-lg font-black tracking-tight text-white sm:text-xl"
      >
        Vibely Studio
      </Link>

      <button
        type="button"
        onClick={handleUploadClick}
        className={`mt-5 w-full rounded-lg bg-[#fe2c55] px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#e62a4d] ${
          onUpload ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-[#121212]' : ''
        }`}
      >
        + Tải lên
      </button>

      <NavSection title="Quản lý">
        <NavLink
          to="/vibelystudio/home"
          icon={IoHome}
          label="Trang chủ"
          active={active === 'home'}
        />
        <NavLink
          to="/vibelystudio/posts"
          icon={IoVideocamOutline}
          label="Bài đăng"
          active={active === 'posts'}
        />
        <NavLink
          to="/vibelystudio/home"
          icon={IoBarChartOutline}
          label="Phân tích"
          active={active === 'analytics'}
        />
        <NavLink
          to="/vibelystudio/home"
          icon={IoChatboxEllipsesOutline}
          label="Bình luận"
          active={active === 'comments'}
        />
      </NavSection>

      <NavSection title="Phát triển">
        <ToolRow icon={IoBulbOutline} label="Cảm hứng" />
        <ToolRow icon={IoSchoolOutline} label="Học viện sáng tạo" />
      </NavSection>

      <NavSection title="Công cụ">
        <ToolRow icon={IoCashOutline} label="Kiếm tiền" dot />
        <ToolRow icon={IoMusicalNotesOutline} label="Âm thanh không giới hạn" />
        <ToolRow icon={IoCutOutline} label="Chia nhỏ thông minh" dot />
      </NavSection>

      <NavSection title="Khác">
        <ToolRow icon={IoMailOutline} label="Phản hồi" />
      </NavSection>
    </aside>
  )
}
