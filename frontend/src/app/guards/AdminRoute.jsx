import React from 'react'
import { Navigate } from 'react-router-dom'
import { userNeedsOnboarding } from '@/features/auth/utils/onboarding.js'
import { FOR_YOU_PATH } from '@/shared/config/routes.js'

export function AuthenticatedHomeRedirect({ user }) {
  if (!user) return null
  if (userNeedsOnboarding(user)) {
    return <Navigate to="/signup?onboarding=oauth" replace />
  }
  const destination = String(user.role ?? '').toUpperCase() === 'ADMIN' ? '/admin' : FOR_YOU_PATH
  return <Navigate to={destination} replace />
}

export function AdminRoute({ user, children }) {
  if (!user) return null
  if (String(user.role ?? '').toUpperCase() !== 'ADMIN') {
    return <Navigate to={FOR_YOU_PATH} replace />
  }
  return children
}
