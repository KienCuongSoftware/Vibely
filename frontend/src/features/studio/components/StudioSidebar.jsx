import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IoBarChartOutline,
  IoBulbOutline,
  IoCashOutline,
  IoChatboxEllipsesOutline,
  IoCutOutline,
  IoHomeOutline,
  IoMailOutline,
  IoMusicalNotesOutline,
  IoSchoolOutline,
  IoVideocamOutline,
} from 'react-icons/io5'
import { UploadTypeFlyout } from '@/features/upload/components/UploadTypeFlyout.jsx'
import {
  STUDIO_UPLOAD_PHOTO_PATH,
  STUDIO_UPLOAD_VIDEO_PATH,
} from '@/features/upload/utils/studioUploadPaths.js'

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
  const { t } = useTranslation()
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
  const commentsNavActive =
    onCommentPostPath ||
    active === 'comments' ||
    /^\/vibelystudio\/comments\/?$/.test(location.pathname)
  const analyticsNavActive =
    active === 'analytics' || /^\/vibelystudio\/analytics\/?$/.test(location.pathname)
  const inspirationNavActive =
    active === 'inspiration' || /^\/vibelystudio\/inspiration\/?$/.test(location.pathname)

  const goUpload = (tab) => {
    try {
      if (tab === 'video') sessionStorage.setItem(OPEN_UPLOAD_PICKER_KEY, '1')
    } catch {
      /* ignore */
    }
    navigate(tab === 'photo' ? STUDIO_UPLOAD_PHOTO_PATH : STUDIO_UPLOAD_VIDEO_PATH)
    onNavigate?.()
  }

  const handleUploadClick = () => {
    goUpload('video')
  }

  const asideClass = light
    ? 'relative z-20 flex h-dvh w-[240px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-white px-2.5 py-4 scrollbar-none'
    : 'relative z-20 flex h-dvh w-[240px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-900 bg-black px-2.5 py-4 scrollbar-none'

  return (
    <aside className={className ? `${asideClass} ${className}` : asideClass}>
      <Link
        to="/vibelystudio"
        onClick={() => onNavigate?.()}
        className={
          light
            ? 'px-2 text-lg font-black tracking-tight text-slate-900 sm:text-xl'
            : 'px-2 text-lg font-black tracking-tight text-white sm:text-xl'
        }
      >
        {t('studio.brand')}
      </Link>

      <UploadTypeFlyout
        placement="bottom"
        onPickVideo={() => goUpload('video')}
        onPickPhoto={() => goUpload('photo')}
      >
        {({ open, menuId, toggle }) => (
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={toggle}
            className="mt-5 w-full rounded-lg bg-[#fe2c55] px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#e62a4d]"
            style={{ color: '#fff' }}
          >
            {t('studio.upload')}
          </button>
        )}
      </UploadTypeFlyout>

      <NavSection title={t('studio.nav.manage')} light={light}>
        <NavLink to="/vibelystudio" icon={IoHomeOutline} label={t('studio.nav.home')} active={active === 'home'} light={light} onNavigate={onNavigate} />
        <NavLink
          to="/vibelystudio/posts"
          icon={IoVideocamOutline}
          label={t('studio.nav.posts')}
          active={postsNavActive}
          light={light}
          onNavigate={onNavigate}
        />
        <NavLink
          to="/vibelystudio/analytics"
          icon={IoBarChartOutline}
          label={t('studio.nav.analytics')}
          active={analyticsNavActive}
          light={light}
          onNavigate={onNavigate}
        />
        <NavLink
          to="/vibelystudio/comments"
          icon={IoChatboxEllipsesOutline}
          label={t('studio.nav.comments')}
          active={commentsNavActive}
          light={light}
          onNavigate={onNavigate}
        />
      </NavSection>

      <NavSection title={t('studio.nav.grow')} light={light}>
        <NavLink
          to="/vibelystudio/inspiration"
          icon={IoBulbOutline}
          label={t('studio.nav.inspiration')}
          active={inspirationNavActive}
          light={light}
          onNavigate={onNavigate}
        />
        <ToolRow icon={IoSchoolOutline} label={t('studio.nav.academy')} light={light} />
      </NavSection>

      <NavSection title={t('studio.nav.tools')} light={light}>
        <ToolRow icon={IoCashOutline} label={t('studio.nav.monetize')} dot light={light} />
        <ToolRow icon={IoMusicalNotesOutline} label={t('studio.nav.unlimitedAudio')} light={light} />
        <ToolRow icon={IoCutOutline} label={t('studio.nav.smartSplit')} dot light={light} />
      </NavSection>

      <NavSection title={t('studio.nav.other')} light={light}>
        <ToolRow icon={IoMailOutline} label={t('studio.nav.feedback')} light={light} />
      </NavSection>
    </aside>
  )
}
