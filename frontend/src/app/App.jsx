import React, { Suspense } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { DefaultSeo } from '@/shared/seo/Seo.jsx'
import { userNeedsOnboarding } from '@/features/auth/utils/onboarding.js'
import { StudioUploadDraftCleanup } from '@/features/studio/components/StudioUploadDraftCleanup.jsx'
import {
  AuthenticatedRoutes,
  GuestRoutes,
  OnboardingRoutes,
} from '@/app/routes.jsx'

function App() {
  const { token, user, authReady } = useAuth()
  const shellClass = 'vibely-chrome min-h-screen bg-black text-zinc-100'
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'
  const needsOnboarding = userNeedsOnboarding(user)

  if (!authReady) {
    return (
      <div className={shellClass}>
        <DefaultSeo />
        <div className="min-h-screen bg-black" aria-busy="true" aria-label="Đang tải" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className={shellClass}>
        <DefaultSeo />
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          <GuestRoutes />
        </Suspense>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <DefaultSeo />
      <StudioUploadDraftCleanup />
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        {needsOnboarding ? (
          <OnboardingRoutes />
        ) : (
          <AuthenticatedRoutes user={user} isAdmin={isAdmin} />
        )}
      </Suspense>
    </div>
  )
}

export default App
