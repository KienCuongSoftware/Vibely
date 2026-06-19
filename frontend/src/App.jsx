import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage.jsx'
import { SignupPage } from './pages/SignupPage.jsx'
import { FeedPage } from './pages/FeedPage.jsx'
import { FollowingPage } from './pages/FollowingPage.jsx'
import { FriendsPage } from './pages/FriendsPage.jsx'
import { MessagesPage } from './pages/MessagesPage.jsx'
import { UploadPage } from './pages/UploadPage.jsx'
import { StudioHomePage } from './pages/StudioHomePage.jsx'
import { StudioPostsPage } from './pages/StudioPostsPage.jsx'
import { StudioEditPostPage } from './pages/StudioEditPostPage.jsx'
import { StudioVideoAnalyticsPage } from './pages/StudioVideoAnalyticsPage.jsx'
import { StudioPostCommentsPage } from './pages/StudioPostCommentsPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { ActivityVideoWatchPage } from './pages/ActivityVideoWatchPage.jsx'
import { PublicVideoDetailPage } from './pages/PublicVideoDetailPage.jsx'
import { ProfileWatchVideoRoutePage } from './pages/ProfileWatchVideoRoutePage.jsx'
import { TermsOfServicePage } from './pages/TermsOfServicePage.jsx'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.jsx'
import { SoundPage } from './pages/SoundPage.jsx'
import { HashtagPage } from './pages/HashtagPage.jsx'
import { ExplorePage } from './pages/ExplorePage.jsx'
import { ExploreViewerPage } from './pages/ExploreViewerPage.jsx'
import { SearchResultsPage } from './pages/SearchResultsPage.jsx'
import { AdminUsersPage } from './pages/AdminUsersPage.jsx'
import { useAuth } from './state/useAuth'
import { WatchRedirect } from './components/watch/WatchRedirect.jsx'

function App() {
  const { token } = useAuth()
  const shellClass = 'min-h-screen bg-black text-zinc-100'

  if (!token) {
    return (
      <div className={shellClass}>
        <Routes>
          <Route path="/" element={<Navigate to="/foryou" replace />} />
          <Route path="/foryou" element={<FeedPage />} />
          <Route path="/following" element={<Navigate to="/login" replace />} />
          <Route path="/friends" element={<Navigate to="/login" replace />} />
          <Route path="/messages" element={<Navigate to="/login" replace />} />
          <Route path="/feed" element={<Navigate to="/foryou" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/legal/page/row/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/legal/page/row/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/sound" element={<SoundPage />} />
          <Route path="/explore" element={<Navigate to="/login" replace />} />
          <Route path="/explore/view/:publicId" element={<ExploreViewerPage />} />
          <Route path="/search" element={<Navigate to="/login" replace />} />
          <Route path="/tag/:tag" element={<HashtagPage />} />
          <Route path="/watch/:publicId" element={<WatchRedirect />} />
          <Route path="/upload" element={<Navigate to="/vibelystudio/upload" replace />} />
          <Route path="/vibelystudio/home" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/posts" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/upload" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/upload/post/:publicId" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/comment/:publicId" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={<Navigate to="/login" replace />} />
          <Route path="/admin/users" element={<Navigate to="/login" replace />} />
          <Route path="/activity/:username/video/:publicId" element={<ActivityVideoWatchPage />} />
          <Route path="/:username/video/:publicId" element={<PublicVideoDetailPage />} />
          <Route path="/:username/:publicId" element={<ProfileWatchVideoRoutePage />} />
          <Route path="/profile" element={<Navigate to="/login" replace />} />
          <Route path="/:username" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/foryou" replace />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <Routes>
        <Route path="/" element={<Navigate to="/foryou" replace />} />
        <Route path="/foryou" element={<FeedPage />} />
        <Route path="/following" element={<FollowingPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/feed" element={<Navigate to="/foryou" replace />} />
        <Route path="/login" element={<Navigate to="/foryou" replace />} />
        <Route path="/signin" element={<Navigate to="/foryou" replace />} />
        <Route path="/signup" element={<Navigate to="/foryou" replace />} />
        <Route path="/register" element={<Navigate to="/foryou" replace />} />
        <Route path="/upload" element={<Navigate to="/vibelystudio/upload" replace />} />
        <Route path="/vibelystudio" element={<Navigate to="/vibelystudio/home" replace />} />
        <Route path="/vibelystudio/home" element={<StudioHomePage />} />
        <Route path="/vibelystudio/posts" element={<StudioPostsPage />} />
        <Route path="/vibelystudio/upload" element={<UploadPage />} />
        <Route path="/vibelystudio/upload/post/:publicId" element={<StudioEditPostPage />} />
        <Route path="/vibelystudio/analytics/:publicId" element={<StudioVideoAnalyticsPage />} />
        <Route path="/vibelystudio/comment/:publicId" element={<StudioPostCommentsPage />} />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
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
        <Route path="*" element={<Navigate to="/foryou" replace />} />
      </Routes>
    </div>
  )
}

export default App
