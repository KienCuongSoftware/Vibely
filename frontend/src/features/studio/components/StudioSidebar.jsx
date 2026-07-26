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

function NavSection({ title, children, light }) {
  return (
    <div className="mt-5">
      <p
        className={
          light
            ? 'mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400'
            : 'mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500'
        }
      >
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavLink({ to, icon: Icon, label, active, light, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={() => onNavigate?.()}
      className={
        light
          ? `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
              active
                ? 'bg-slate-100 font-semibold text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          : `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
              active
                ? 'bg-zinc-800 font-medium text-white'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`
      }
    >
      <Icon className="shrink-0 text-lg opacity-90" aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  )
}

function ToolRow({ icon: Icon, label, dot, light }) {
  return (
    <button
      type="button"
      className={
        light
          ? 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900'
          : 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200'
      }
    >
      <Icon className="shrink-0 text-lg opacity-90" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden /> : null}
    </button>
  )
}

const OPEN_UPLOAD_PICKER_KEY = 'vibely-studio-open-upload-picker'

/** @param {'dark' | 'light'} [theme='dark'] */
export function StudioSidebar({ active = 'home', theme = 'dark', className = '', onNavigate }) {
  const light = theme === 'light'
  const location = useLocation()
  const navigate = useNavigate()
  const onUpload = /^\/vibelystudio\/upload\/?$/.test(location.pathname)
  const onCommentPostPath = /^\/vibelystudio\/comment\/\d+/.test(location.pathname)
  const postsNavActive =
    !onCommentPostPath &&
    (active === 'posts' ||
      /^\/vibelystudio\/posts\/?$/.test(location.pathname) ||
      /^\/vibelystudio\/(upload\/post|analytics)\//.test(location.pathname))
  const commentsNavActive = onCommentPostPath || active === 'comments'

  const handleUploadClick = () => {
    if (onUpload) return
    try {
      sessionStorage.setItem(OPEN_UPLOAD_PICKER_KEY, '1')
    } catch {
      /* ignore */
    }
    navigate('/vibelystudio/upload')
    onNavigate?.()
  }

  const asideClass = light
    ? 'relative z-20 flex h-dvh w-[240px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-white px-2.5 py-4 scrollbar-none'
    : 'relative z-20 flex h-dvh w-[240px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-900 bg-black px-2.5 py-4 scrollbar-none'

  return (
    <aside className={className ? `${asideClass} ${className}` : asideClass}>
      <Link
        to="/vibelystudio/home"
        onClick={() => onNavigate?.()}
        className={
          light
            ? 'px-2 text-lg font-black tracking-tight text-slate-900 sm:text-xl'
            : 'px-2 text-lg font-black tracking-tight text-white sm:text-xl'
        }
      >
        Vibely Studio
      </Link>

      <button
        type="button"
        disabled={onUpload}
        onClick={handleUploadClick}
        title={onUpload ? 'Bạn đang ở trang tải lên' : undefined}
        className={`mt-5 w-full rounded-lg px-3 py-2.5 text-center text-sm font-semibold shadow-sm transition ${
          onUpload
            ? light
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
            : 'bg-[#fe2c55] text-white hover:bg-[#e62a4d]'
        }`}
      >
        + Tải lên
      </button>

      <NavSection title="Quản lý" light={light}>
        <NavLink to="/vibelystudio/home" icon={IoHome} label="Trang chủ" active={active === 'home'} light={light} onNavigate={onNavigate} />
        <NavLink
          to="/vibelystudio/posts"
          icon={IoVideocamOutline}
          label="Bài đăng"
          active={postsNavActive}
          light={light}
          onNavigate={onNavigate}
        />
        <NavLink
          to="/vibelystudio/home"
          icon={IoBarChartOutline}
          label="Phân tích"
          active={active === 'analytics'}
          light={light}
          onNavigate={onNavigate}
        />
        <NavLink
          to="/vibelystudio/posts"
          icon={IoChatboxEllipsesOutline}
          label="Bình luận"
          active={commentsNavActive}
          light={light}
          onNavigate={onNavigate}
        />
      </NavSection>

      <NavSection title="Phát triển" light={light}>
        <ToolRow icon={IoBulbOutline} label="Cảm hứng" light={light} />
        <ToolRow icon={IoSchoolOutline} label="Học viện sáng tạo" light={light} />
      </NavSection>

      <NavSection title="Công cụ" light={light}>
        <ToolRow icon={IoCashOutline} label="Kiếm tiền" dot light={light} />
        <ToolRow icon={IoMusicalNotesOutline} label="Âm thanh không giới hạn" light={light} />
        <ToolRow icon={IoCutOutline} label="Chia nhỏ thông minh" dot light={light} />
      </NavSection>

      <NavSection title="Khác" light={light}>
        <ToolRow icon={IoMailOutline} label="Phản hồi" light={light} />
      </NavSection>
    </aside>
  )
}
