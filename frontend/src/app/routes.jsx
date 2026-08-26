import React from 'react'
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { WatchRedirect } from '@/features/post/components/WatchRedirect.jsx'
import { AdminRoute, AuthenticatedHomeRedirect, UserOnlyRoute } from '@/app/guards/AdminRoute.jsx'
import { GuestAuthModal } from '@/features/auth/components/GuestAuthModal.jsx'
import { GuestAuthUiProvider, RedirectToHomeLogin } from '@/features/auth/store/GuestAuthUiContext.jsx'
import { isPendingOAuthBrowserCallback } from '@/features/auth/utils/oauthCallback.js'
import { buildStudioHomeLoginHref, buildStudioUploadLoginHref, hasLoginRedirectParam } from '@/features/auth/utils/loginRedirect.js'
import { lazyWithChunkRetry } from '@/shared/utils/lazyWithChunkRetry.js'

function lazyNamed(loader, exportName) {
  return lazyWithChunkRetry(() =>
    loader().then((module) => ({ default: module[exportName] })),
  )
}

const SignupPage = lazyNamed(() => import('@/features/auth/pages/SignupPage.jsx'), 'SignupPage')
const LoginPage = lazyNamed(() => import('@/features/auth/pages/LoginPage.jsx'), 'LoginPage')
const FeedPage = lazyNamed(() => import('@/features/feed/pages/FeedPage.jsx'), 'FeedPage')
const FollowingPage = lazyNamed(() => import('@/features/feed/pages/FollowingPage.jsx'), 'FollowingPage')
const FriendsPage = lazyNamed(() => import('@/features/feed/pages/FriendsPage.jsx'), 'FriendsPage')
const MessagesPage = lazyNamed(() => import('@/features/chat/pages/MessagesPage.jsx'), 'MessagesPage')
const UploadPage = lazyNamed(() => import('@/features/upload/pages/UploadPage.jsx'), 'UploadPage')
const PhotoComposerPage = lazyNamed(
  () => import('@/features/upload/pages/PhotoComposerPage.jsx'),
  'PhotoComposerPage',
)
const StudioHomePage = lazyNamed(() => import('@/features/studio/pages/StudioHomePage.jsx'), 'StudioHomePage')
const StudioPostsPage = lazyNamed(() => import('@/features/studio/pages/StudioPostsPage.jsx'), 'StudioPostsPage')
const StudioEditPostPage = lazyNamed(() => import('@/features/studio/pages/StudioEditPostPage.jsx'), 'StudioEditPostPage')
const StudioAnalyticsPage = lazyNamed(() => import('@/features/studio/pages/StudioAnalyticsPage.jsx'), 'StudioAnalyticsPage')
const StudioVideoAnalyticsPage = lazyNamed(() => import('@/features/studio/pages/StudioVideoAnalyticsPage.jsx'), 'StudioVideoAnalyticsPage')
const StudioPostCommentsPage = lazyNamed(() => import('@/features/studio/pages/StudioPostCommentsPage.jsx'), 'StudioPostCommentsPage')
const StudioCommentsPage = lazyNamed(() => import('@/features/studio/pages/StudioCommentsPage.jsx'), 'StudioCommentsPage')
const StudioInspirationPage = lazyNamed(() => import('@/features/studio/pages/StudioInspirationPage.jsx'), 'StudioInspirationPage')
const ProfilePage = lazyNamed(() => import('@/features/profile/pages/ProfilePage.jsx'), 'ProfilePage')
const ProfileEmbedPage = lazyNamed(() => import('@/features/profile/pages/ProfileEmbedPage.jsx'), 'ProfileEmbedPage')
const SettingsPage = lazyNamed(() => import('@/features/settings/pages/SettingsPage.jsx'), 'SettingsPage')
const ActivityVideoWatchPage = lazyNamed(() => import('@/features/post/pages/ActivityVideoWatchPage.jsx'), 'ActivityVideoWatchPage')
const PublicVideoDetailPage = lazyNamed(() => import('@/features/post/pages/PublicVideoDetailPage.jsx'), 'PublicVideoDetailPage')
const ProfileWatchVideoRoutePage = lazyNamed(() => import('@/features/profile/pages/ProfileWatchVideoRoutePage.jsx'), 'ProfileWatchVideoRoutePage')
const TermsOfServicePage = lazyNamed(() => import('@/features/legal/pages/TermsOfServicePage.jsx'), 'TermsOfServicePage')
const PrivacyPolicyPage = lazyNamed(() => import('@/features/legal/pages/PrivacyPolicyPage.jsx'), 'PrivacyPolicyPage')
const SoundPage = lazyNamed(() => import('@/features/post/pages/SoundPage.jsx'), 'SoundPage')
const HashtagPage = lazyNamed(() => import('@/features/post/pages/HashtagPage.jsx'), 'HashtagPage')
const ExplorePage = lazyNamed(() => import('@/features/explore/pages/ExplorePage.jsx'), 'ExplorePage')
const ExploreViewerPage = lazyNamed(() => import('@/features/explore/pages/ExploreViewerPage.jsx'), 'ExploreViewerPage')
const SearchResultsPage = lazyNamed(() => import('@/features/search/pages/SearchResultsPage.jsx'), 'SearchResultsPage')
const AdminUsersPage = lazyNamed(() => import('@/features/admin/pages/AdminUsersPage.jsx'), 'AdminUsersPage')
const AdminBannedUsersPage = lazyNamed(() => import('@/features/admin/pages/AdminBannedUsersPage.jsx'), 'AdminBannedUsersPage')
const AdminBanAppealsPage = lazyNamed(() => import('@/features/admin/pages/AdminBanAppealsPage.jsx'), 'AdminBanAppealsPage')
const AdminPostsPage = lazyNamed(() => import('@/features/admin/pages/AdminPostsPage.jsx'), 'AdminPostsPage')
const AdminPostDetailPage = lazyNamed(() => import('@/features/admin/pages/AdminPostDetailPage.jsx'), 'AdminPostDetailPage')
const AdminModerationPage = lazyNamed(() => import('@/features/admin/pages/AdminModerationPage.jsx'), 'AdminModerationPage')

function GuestLoginRoute() {
  const [params] = useSearchParams()
  if (hasLoginRedirectParam(`?${params.toString()}`) || isPendingOAuthBrowserCallback()) {
    return <LoginPage />
  }
  // Modal-only: GuestAuthUiProvider opens login and replaces URL to "/".
  // Avoid mounting FeedPage here (failed chunk would crash before redirect).
  return null
}

function RedirectToStudioUploadLogin() {
  return <Navigate to={buildStudioUploadLoginHref()} replace />
}

function RedirectToStudioHomeLogin() {
  return <Navigate to={buildStudioHomeLoginHref()} replace />
}

export function GuestRoutes() {
  return (
    <GuestAuthUiProvider>
    <Routes>
      <Route path="/" element={<FeedPage />} />
      <Route path="/foryou" element={<Navigate to="/" replace />} />
      <Route path="/following" element={<FollowingPage />} />
      <Route path="/friends" element={<RedirectToHomeLogin />} />
      <Route path="/messages" element={<RedirectToHomeLogin />} />
      <Route path="/feed" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<GuestLoginRoute />} />
      <Route path="/Login" element={<Navigate to="/login" replace />} />
      <Route path="/signin" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<FeedPage />} />
      <Route path="/Signup" element={<Navigate to="/signup" replace />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />
      <Route path="/legal/page/row/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/legal/page/row/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/sound" element={<SoundPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/explore/view/:publicId" element={<ExploreViewerPage />} />
      <Route path="/search" element={<SearchResultsPage />} />
      <Route path="/tag/:tag" element={<HashtagPage />} />
      <Route path="/watch/:publicId" element={<WatchRedirect />} />
      <Route path="/settings" element={<RedirectToHomeLogin />} />
      <Route path="/upload" element={<RedirectToStudioUploadLogin />} />
      <Route path="/vibelystudio" element={<RedirectToStudioHomeLogin />} />
      <Route path="/vibelystudio/home" element={<Navigate to="/vibelystudio" replace />} />
      <Route path="/vibelystudio/posts" element={<RedirectToHomeLogin />} />
      <Route path="/vibelystudio/analytics" element={<RedirectToHomeLogin />} />
      <Route path="/vibelystudio/analytics/:publicId" element={<RedirectToHomeLogin />} />
      <Route path="/vibelystudio/upload" element={<RedirectToStudioUploadLogin />} />
      <Route path="/vibelystudio/upload/post/photo" element={<RedirectToStudioUploadLogin />} />
      <Route path="/vibelystudio/upload/post/:publicId" element={<RedirectToHomeLogin />} />
      <Route path="/vibelystudio/comment/:publicId" element={<RedirectToHomeLogin />} />
      <Route path="/vibelystudio/comments" element={<RedirectToHomeLogin />} />
      <Route path="/vibelystudio/inspiration" element={<RedirectToHomeLogin />} />
      <Route path="/admin" element={<RedirectToHomeLogin />} />
      <Route path="/admin/users" element={<RedirectToHomeLogin />} />
      <Route path="/admin/posts" element={<RedirectToHomeLogin />} />
      <Route path="/admin/posts/:publicId" element={<RedirectToHomeLogin />} />
      <Route path="/admin/moderation" element={<RedirectToHomeLogin />} />
      <Route path="/activity/:username/video/:publicId" element={<ActivityVideoWatchPage />} />
      <Route path="/embed/profile/:username" element={<ProfileEmbedPage />} />
      <Route path="/:username/video/:publicId" element={<PublicVideoDetailPage />} />
      <Route path="/:username/:publicId" element={<ProfileWatchVideoRoutePage />} />
      <Route path="/profile" element={<RedirectToHomeLogin />} />
      <Route path="/:username" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <GuestAuthModal />
    </GuestAuthUiProvider>
  )
}

export function OnboardingRoutes() {
  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="*" element={<Navigate to="/signup?onboarding=oauth" replace />} />
    </Routes>
  )
}

export function AuthenticatedRoutes({ user, isAdmin }) {
  return (
    <Routes>
      {/* Trang chủ — admin redirect về /admin/users, user thường xem feed */}
      <Route
        path="/"
        element={
          isAdmin ? <Navigate to="/admin/users" replace /> : <FeedPage />
        }
      />
      <Route path="/foryou" element={<Navigate to="/" replace />} />

      {/* Các trang chỉ dành cho user thường */}
      <Route
        path="/following"
        element={<UserOnlyRoute user={user}><FollowingPage /></UserOnlyRoute>}
      />
      <Route
        path="/friends"
        element={<UserOnlyRoute user={user}><FriendsPage /></UserOnlyRoute>}
      />
      <Route
        path="/messages"
        element={<UserOnlyRoute user={user}><MessagesPage /></UserOnlyRoute>}
      />
      <Route
        path="/settings"
        element={<UserOnlyRoute user={user}><SettingsPage /></UserOnlyRoute>}
      />
      <Route path="/upload" element={<Navigate to="/vibelystudio/upload" replace />} />
      <Route
        path="/vibelystudio"
        element={<UserOnlyRoute user={user}><StudioHomePage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/home"
        element={<Navigate to="/vibelystudio" replace />}
      />
      <Route
        path="/vibelystudio/posts"
        element={<UserOnlyRoute user={user}><StudioPostsPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/upload"
        element={<UserOnlyRoute user={user}><UploadPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/upload/post/photo"
        element={<UserOnlyRoute user={user}><PhotoComposerPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/upload/post/:publicId"
        element={<UserOnlyRoute user={user}><StudioEditPostPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/analytics"
        element={<UserOnlyRoute user={user}><StudioAnalyticsPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/analytics/:publicId"
        element={<UserOnlyRoute user={user}><StudioVideoAnalyticsPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/comment/:publicId"
        element={<UserOnlyRoute user={user}><StudioPostCommentsPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/comments"
        element={<UserOnlyRoute user={user}><StudioCommentsPage /></UserOnlyRoute>}
      />
      <Route
        path="/vibelystudio/inspiration"
        element={<UserOnlyRoute user={user}><StudioInspirationPage /></UserOnlyRoute>}
      />
      <Route
        path="/explore"
        element={<UserOnlyRoute user={user}><ExplorePage /></UserOnlyRoute>}
      />
      <Route
        path="/search"
        element={<UserOnlyRoute user={user}><SearchResultsPage /></UserOnlyRoute>}
      />
      <Route
        path="/admin"
        element={
          <AdminRoute user={user}>
            <Navigate to="/admin/users" replace />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute user={user}>
            <AdminUsersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/posts"
        element={
          <AdminRoute user={user}>
            <AdminPostsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/banned-users"
        element={
          <AdminRoute user={user}>
            <AdminBannedUsersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ban-appeals"
        element={
          <AdminRoute user={user}>
            <AdminBanAppealsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/moderation"
        element={
          <AdminRoute user={user}>
            <AdminModerationPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/posts/:publicId"
        element={
          <AdminRoute user={user}>
            <AdminPostDetailPage />
          </AdminRoute>
        }
      />
      {/* Trang công khai — cả admin và user đều vào được */}
      <Route path="/feed" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/login" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/signin" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/signup" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/register" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/legal/page/row/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/legal/page/row/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/sound" element={<SoundPage />} />
      <Route path="/explore/view/:publicId" element={<ExploreViewerPage />} />
      <Route path="/tag/:tag" element={<HashtagPage />} />
      <Route path="/activity/:username/video/:publicId" element={<ActivityVideoWatchPage />} />
      <Route path="/embed/profile/:username" element={<ProfileEmbedPage />} />
      <Route path="/:username/video/:publicId" element={<PublicVideoDetailPage />} />
      <Route path="/:username/:publicId" element={<ProfileWatchVideoRoutePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/:username" element={<ProfilePage />} />
      <Route path="/watch/:publicId" element={<WatchRedirect />} />
      <Route path="*" element={<AuthenticatedHomeRedirect user={user} />} />
    </Routes>
  )
}
