import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage.jsx'
import { SignupPage } from './pages/SignupPage.jsx'
import { FeedPage } from './pages/FeedPage.jsx'
import { UploadPage } from './pages/UploadPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { TermsOfServicePage } from './pages/TermsOfServicePage.jsx'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.jsx'
import { useAuth } from './state/useAuth'

function App() {
  const { token } = useAuth()

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-zinc-100">
        <Routes>
          <Route path="/" element={<Navigate to="/foryou" replace />} />
          <Route path="/foryou" element={<FeedPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/legal/page/row/terms-of-service/vi" element={<TermsOfServicePage />} />
          <Route path="/legal/page/row/privacy-policy/vi" element={<PrivacyPolicyPage />} />
          <Route path="/upload" element={<Navigate to="/login" replace />} />
          <Route path="/profile" element={<Navigate to="/login" replace />} />
          <Route path="/@:username" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/foryou" replace />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Routes>
        <Route path="/" element={<Navigate to="/foryou" replace />} />
        <Route path="/foryou" element={<FeedPage />} />
        <Route path="/feed" element={<Navigate to="/foryou" replace />} />
        <Route path="/login" element={<Navigate to="/foryou" replace />} />
        <Route path="/signin" element={<Navigate to="/foryou" replace />} />
        <Route path="/signup" element={<Navigate to="/foryou" replace />} />
        <Route path="/register" element={<Navigate to="/foryou" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/@:username" element={<ProfilePage />} />
        <Route path="/legal/page/row/terms-of-service/vi" element={<TermsOfServicePage />} />
        <Route path="/legal/page/row/privacy-policy/vi" element={<PrivacyPolicyPage />} />
        <Route path="*" element={<Navigate to="/foryou" replace />} />
      </Routes>
    </div>
  )
}

export default App
