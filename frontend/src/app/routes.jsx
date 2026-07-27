import React, { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { WatchRedirect } from '@/features/post/components/WatchRedirect.jsx'
import { AdminRoute, AuthenticatedHomeRedirect } from '@/app/guards/AdminRoute.jsx'

function lazyNamed(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })))
}

const LoginPage = lazyNamed(() => import('@/features/auth/pages/LoginPage.jsx'), 'LoginPage')
const SignupPage = lazyNamed(() => import('@/features/auth/pages/SignupPage.jsx'), 'SignupPage')
const FeedPage = lazyNamed(() => import('@/features/feed/pages/FeedPage.jsx'), 'FeedPage')
const FollowingPage = lazyNamed(() => import('@/features/feed/pages/FollowingPage.jsx'), 'FollowingPage')
const FriendsPage = lazyNamed(() => import('@/features/feed/pages/FriendsPage.jsx'), 'FriendsPage')
const MessagesPage = lazyNamed(() => import('@/features/chat/pages/MessagesPage.jsx'), 'MessagesPage')
const UploadPage = lazyNamed(() => import('@/features/upload/pages/UploadPage.jsx'), 'UploadPage')
const StudioHomePage = lazyNamed(() => import('@/features/studio/pages/StudioHomePage.jsx'), 'StudioHomePage')
const StudioPostsPage = lazyNamed(() => import('@/features/studio/pages/StudioPostsPage.jsx'), 'StudioPostsPage')
const StudioEditPostPage = lazyNamed(() => import('@/features/studio/pages/StudioEditPostPage.jsx'), 'StudioEditPostPage')
const StudioVideoAnalyticsPage = lazyNamed(() => import('@/features/studio/pages/StudioVideoAnalyticsPage.jsx'), 'StudioVideoAnalyticsPage')
const StudioPostCommentsPage = lazyNamed(() => import('@/features/studio/pages/StudioPostCommentsPage.jsx'), 'StudioPostCommentsPage')
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

export function GuestRoutes() {
  return (
    <Routes>
      <Route path="/" element={<FeedPage />} />
      <Route path="/foryou" element={<Navigate to="/" replace />} />
      <Route path="/following" element={<Navigate to="/login" replace />} />
      <Route path="/friends" element={<Navigate to="/login" replace />} />
      <Route path="/messages" element={<Navigate to="/login" replace />} />
      <Route path="/feed" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/Login" element={<Navigate to="/login" replace />} />
      <Route path="/signin" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/Signup" element={<Navigate to="/signup" replace />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />
      <Route path="/legal/page/row/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/legal/page/row/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/sound" element={<SoundPage />} />
      <Route path="/explore" element={<Navigate to="/login" replace />} />
      <Route path="/explore/view/:publicId" element={<ExploreViewerPage />} />
      <Route path="/search" element={<Navigate to="/login" replace />} />
      <Route path="/tag/:tag" element={<HashtagPage />} />
      <Route path="/watch/:publicId" element={<WatchRedirect />} />
      <Route path="/settings" element={<Navigate to="/login" replace />} />
      <Route path="/upload" element={<Navigate to="/vibelystudio/upload" replace />} />
      <Route path="/vibelystudio/home" element={<Navigate to="/login" replace />} />
      <Route path="/vibelystudio/posts" element={<Navigate to="/login" replace />} />
      <Route path="/vibelystudio/upload" element={<Navigate to="/login" replace />} />
      <Route path="/vibelystudio/upload/post/:publicId" element={<Navigate to="/login" replace />} />
      <Route path="/vibelystudio/comment/:publicId" element={<Navigate to="/login" replace />} />
      <Route path="/admin" element={<Navigate to="/login" replace />} />
      <Route path="/admin/users" element={<Navigate to="/login" replace />} />
      <Route path="/admin/posts" element={<Navigate to="/login" replace />} />
      <Route path="/admin/posts/:publicId" element={<Navigate to="/login" replace />} />
      <Route path="/admin/moderation" element={<Navigate to="/login" replace />} />
      <Route path="/activity/:username/video/:publicId" element={<ActivityVideoWatchPage />} />
      <Route path="/embed/profile/:username" element={<ProfileEmbedPage />} />
      <Route path="/:username/video/:publicId" element={<PublicVideoDetailPage />} />
      <Route path="/:username/:publicId" element={<ProfileWatchVideoRoutePage />} />
      <Route path="/profile" element={<Navigate to="/login" replace />} />
      <Route path="/:username" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
      <Route
        path="/"
        element={isAdmin ? <Navigate to="/admin" replace /> : <FeedPage />}
      />
      <Route
        path="/foryou"
        element={isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace />}
      />
      <Route path="/following" element={<FollowingPage />} />
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/feed" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/login" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/signin" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/signup" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/register" element={<AuthenticatedHomeRedirect user={user} />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/upload" element={<Navigate to="/vibelystudio/upload" replace />} />
      <Route path="/vibelystudio" element={<Navigate to="/vibelystudio/home" replace />} />
      <Route path="/vibelystudio/home" element={<StudioHomePage />} />
      <Route path="/vibelystudio/posts" element={<StudioPostsPage />} />
      <Route path="/vibelystudio/upload" element={<UploadPage />} />
      <Route path="/vibelystudio/upload/post/:publicId" element={<StudioEditPostPage />} />
      <Route path="/vibelystudio/analytics/:publicId" element={<StudioVideoAnalyticsPage />} />
      <Route path="/vibelystudio/comment/:publicId" element={<StudioPostCommentsPage />} />
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
      <Route path="/legal/page/row/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/legal/page/row/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/sound" element={<SoundPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/explore/view/:publicId" element={<ExploreViewerPage />} />
      <Route path="/search" element={<SearchResultsPage />} />
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
