import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './state/useAuth'
import { WatchRedirect } from './components/watch/WatchRedirect.jsx'
import { DefaultSeo } from './seo/Seo.jsx'
import { userNeedsOnboarding } from './utils/onboarding.js'

function lazyNamed(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })))
}

const LoginPage = lazyNamed(() => import('./pages/LoginPage.jsx'), 'LoginPage')
const SignupPage = lazyNamed(() => import('./pages/SignupPage.jsx'), 'SignupPage')
const FeedPage = lazyNamed(() => import('./pages/FeedPage.jsx'), 'FeedPage')
const FollowingPage = lazyNamed(() => import('./pages/FollowingPage.jsx'), 'FollowingPage')
const FriendsPage = lazyNamed(() => import('./pages/FriendsPage.jsx'), 'FriendsPage')
const MessagesPage = lazyNamed(() => import('./pages/MessagesPage.jsx'), 'MessagesPage')
const UploadPage = lazyNamed(() => import('./pages/UploadPage.jsx'), 'UploadPage')
const StudioHomePage = lazyNamed(() => import('./pages/StudioHomePage.jsx'), 'StudioHomePage')
const StudioPostsPage = lazyNamed(() => import('./pages/StudioPostsPage.jsx'), 'StudioPostsPage')
const StudioEditPostPage = lazyNamed(() => import('./pages/StudioEditPostPage.jsx'), 'StudioEditPostPage')
const StudioVideoAnalyticsPage = lazyNamed(() => import('./pages/StudioVideoAnalyticsPage.jsx'), 'StudioVideoAnalyticsPage')
const StudioPostCommentsPage = lazyNamed(() => import('./pages/StudioPostCommentsPage.jsx'), 'StudioPostCommentsPage')
const ProfilePage = lazyNamed(() => import('./pages/ProfilePage.jsx'), 'ProfilePage')
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage.jsx'), 'SettingsPage')
const ActivityVideoWatchPage = lazyNamed(() => import('./pages/ActivityVideoWatchPage.jsx'), 'ActivityVideoWatchPage')
const PublicVideoDetailPage = lazyNamed(() => import('./pages/PublicVideoDetailPage.jsx'), 'PublicVideoDetailPage')
const ProfileWatchVideoRoutePage = lazyNamed(() => import('./pages/ProfileWatchVideoRoutePage.jsx'), 'ProfileWatchVideoRoutePage')
const TermsOfServicePage = lazyNamed(() => import('./pages/TermsOfServicePage.jsx'), 'TermsOfServicePage')
const PrivacyPolicyPage = lazyNamed(() => import('./pages/PrivacyPolicyPage.jsx'), 'PrivacyPolicyPage')
const SoundPage = lazyNamed(() => import('./pages/SoundPage.jsx'), 'SoundPage')
const HashtagPage = lazyNamed(() => import('./pages/HashtagPage.jsx'), 'HashtagPage')
const ExplorePage = lazyNamed(() => import('./pages/ExplorePage.jsx'), 'ExplorePage')
const ExploreViewerPage = lazyNamed(() => import('./pages/ExploreViewerPage.jsx'), 'ExploreViewerPage')
const SearchResultsPage = lazyNamed(() => import('./pages/SearchResultsPage.jsx'), 'SearchResultsPage')
const AdminUsersPage = lazyNamed(() => import('./pages/AdminUsersPage.jsx'), 'AdminUsersPage')
const AdminPostsPage = lazyNamed(() => import('./pages/AdminPostsPage.jsx'), 'AdminPostsPage')
const AdminPostDetailPage = lazyNamed(() => import('./pages/AdminPostDetailPage.jsx'), 'AdminPostDetailPage')

function AuthenticatedHomeRedirect({ user }) {
  if (!user) return null
  if (userNeedsOnboarding(user)) {
    return <Navigate to="/signup?onboarding=oauth" replace />
  }
  const destination = String(user.role ?? '').toUpperCase() === 'ADMIN' ? '/admin' : '/foryou'
  return <Navigate to={destination} replace />
}

function AdminRoute({ user, children }) {
  if (!user) return null
  if (String(user.role ?? '').toUpperCase() !== 'ADMIN') {
    return <Navigate to="/foryou" replace />
  }
  return children
}

function App() {
  const { token, user, authReady } = useAuth()
  const shellClass = 'min-h-screen bg-black text-zinc-100'
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
          <Routes>
          <Route path="/" element={<Navigate to="/foryou" replace />} />
          <Route path="/foryou" element={<FeedPage />} />
          <Route path="/following" element={<Navigate to="/login" replace />} />
          <Route path="/friends" element={<Navigate to="/login" replace />} />
          <Route path="/messages" element={<Navigate to="/login" replace />} />
          <Route path="/feed" element={<Navigate to="/foryou" replace />} />
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
          <Route path="/activity/:username/video/:publicId" element={<ActivityVideoWatchPage />} />
          <Route path="/:username/video/:publicId" element={<PublicVideoDetailPage />} />
          <Route path="/:username/:publicId" element={<ProfileWatchVideoRoutePage />} />
          <Route path="/profile" element={<Navigate to="/login" replace />} />
          <Route path="/:username" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/foryou" replace />} />
          </Routes>
        </Suspense>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <DefaultSeo />
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        {needsOnboarding ? (
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="*" element={<Navigate to="/signup?onboarding=oauth" replace />} />
          </Routes>
        ) : (
        <Routes>
        <Route path="/" element={<AuthenticatedHomeRedirect user={user} />} />
        <Route path="/foryou" element={isAdmin ? <Navigate to="/admin" replace /> : <FeedPage />} />
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
        <Route path="/:username/video/:publicId" element={<PublicVideoDetailPage />} />
        <Route path="/:username/:publicId" element={<ProfileWatchVideoRoutePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/:username" element={<ProfilePage />} />
        <Route path="/watch/:publicId" element={<WatchRedirect />} />
        <Route path="*" element={<AuthenticatedHomeRedirect user={user} />} />
        </Routes>
        )}
      </Suspense>
    </div>
  )
}

export default App
