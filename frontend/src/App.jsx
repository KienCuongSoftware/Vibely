import React from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage.jsx'
import { SignupPage } from './pages/SignupPage.jsx'
import { FeedPage } from './pages/FeedPage.jsx'
import { UploadPage } from './pages/UploadPage.jsx'
import { StudioHomePage } from './pages/StudioHomePage.jsx'
import { StudioPostsPage } from './pages/StudioPostsPage.jsx'
import { StudioEditPostPage } from './pages/StudioEditPostPage.jsx'
import { StudioVideoAnalyticsPage } from './pages/StudioVideoAnalyticsPage.jsx'
import { StudioPostCommentsPage } from './pages/StudioPostCommentsPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { VideoWatchPage } from './pages/VideoWatchPage.jsx'
import { TermsOfServicePage } from './pages/TermsOfServicePage.jsx'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.jsx'
import { SoundPage } from './pages/SoundPage.jsx'
import { useAuth } from './state/useAuth'

function WatchRedirect() {
  const { videoId } = useParams()
  const id = String(videoId ?? '').trim()
  if (!/^\d+$/.test(id)) {
    return <Navigate to="/foryou" replace />
  }
  return <Navigate to={`/foryou?v=${encodeURIComponent(id)}`} replace />
}

function App() {
  const { token } = useAuth()
  const shellClass = 'min-h-screen bg-black text-zinc-100'

  if (!token) {
    return (
      <div className={shellClass}>
        <Routes>
          <Route path="/" element={<Navigate to="/foryou" replace />} />
          <Route path="/foryou" element={<FeedPage />} />
          <Route path="/feed" element={<Navigate to="/foryou" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/legal/page/row/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/legal/page/row/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/sound" element={<SoundPage />} />
          <Route path="/watch/:videoId" element={<WatchRedirect />} />
          <Route path="/upload" element={<Navigate to="/vibelystudio/upload" replace />} />
          <Route path="/vibelystudio/home" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/posts" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/upload" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/upload/post/:videoId" element={<Navigate to="/login" replace />} />
          <Route path="/vibelystudio/comment/:videoId" element={<Navigate to="/login" replace />} />
          <Route path="/:username/video/:videoId" element={<VideoWatchPage />} />
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
        <Route path="/vibelystudio/upload/post/:videoId" element={<StudioEditPostPage />} />
        <Route path="/vibelystudio/analytics/:videoId" element={<StudioVideoAnalyticsPage />} />
        <Route path="/vibelystudio/comment/:videoId" element={<StudioPostCommentsPage />} />
        <Route path="/:username/video/:videoId" element={<VideoWatchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/:username" element={<ProfilePage />} />
        <Route path="/legal/page/row/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/legal/page/row/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/sound" element={<SoundPage />} />
        <Route path="/watch/:videoId" element={<WatchRedirect />} />
        <Route path="*" element={<Navigate to="/foryou" replace />} />
      </Routes>
    </div>
  )
}

export default App
