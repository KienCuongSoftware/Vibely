import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IoPeopleOutline } from 'react-icons/io5'

const ADMIN_NAV_ITEMS = [
  {
    id: 'users',
    to: '/admin/users',
    label: 'Quản lý tài khoản',
    icon: IoPeopleOutline,
  },
]

export function AdminSidebar({ active = 'users', className = '', onNavigate }) {
  const location = useLocation()
  const asideClass =
    'relative z-20 flex h-dvh w-[260px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-900 bg-black px-3 py-4 scrollbar-none'

  return (
    <aside className={className ? `${asideClass} ${className}` : asideClass}>
      <Link
        to="/admin/users"
        onClick={() => onNavigate?.()}
        className="px-2 text-xl font-black tracking-tight text-white"
      >
        Vibely Admin
      </Link>

      <nav className="mt-6 space-y-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id || location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.id}
              to={item.to}
              onClick={() => onNavigate?.()}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isActive
                  ? 'bg-zinc-800 font-semibold text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Icon className="shrink-0 text-lg" aria-hidden />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
