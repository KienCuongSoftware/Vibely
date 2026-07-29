import React from 'react'
import { Navigate } from 'react-router-dom'
import { userNeedsOnboarding } from '@/features/auth/utils/onboarding.js'
import { FOR_YOU_PATH } from '@/shared/config/routes.js'

const ADMIN_HOME = '/admin/users'

function isAdminUser(user) {
  return String(user?.role ?? '').toUpperCase() === 'ADMIN'
}

export function AuthenticatedHomeRedirect({ user }) {
  if (!user) return null
  if (userNeedsOnboarding(user)) {
    return <Navigate to="/signup?onboarding=oauth" replace />
  }
  const destination = isAdminUser(user) ? ADMIN_HOME : FOR_YOU_PATH
  return <Navigate to={destination} replace />
}

/** Chỉ admin mới vào được — user thường bị redirect về trang Đề xuất. */
export function AdminRoute({ user, children }) {
  if (!user) return null
  if (!isAdminUser(user)) {
    return <Navigate to={FOR_YOU_PATH} replace />
  }
  return children
}

/** Chỉ user thường mới vào được — admin bị redirect về trang quản trị. */
export function UserOnlyRoute({ user, children }) {
  if (!user) return null
  if (isAdminUser(user)) {
    return <Navigate to={ADMIN_HOME} replace />
  }
  return children
}
