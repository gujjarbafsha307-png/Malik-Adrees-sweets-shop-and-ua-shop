import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useLanguage } from './context/LanguageContext'
import AuthPage from './pages/AuthPage'
import OwnerDashboard from './pages/OwnerDashboard'
import Storefront from './pages/Storefront'
import RoleSelection from './components/RoleSelection'
import WelcomeScreen from './components/WelcomeScreen'

function ProtectedRoute({ role, children }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="route-loading">Opening your shop…</div>
  if (!session) return <Navigate to={role === 'owner' ? '/auth/owner' : '/auth/customer'} replace />
  if (profile?.role !== role) return <Navigate to="/" replace />
  return children
}

function Application() {
  const [welcome, setWelcome] = useState(true)
  const { language, setLanguage } = useLanguage()

  if (welcome) return <AnimatePresence mode="wait"><WelcomeScreen key="welcome" onContinue={() => setWelcome(false)} /></AnimatePresence>
  return <>
    <label className="welcome-language"><span className="sr-only">Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">EN</option><option value="ur">اردو</option><option value="ar">العربية</option></select></label>
    <Routes>
      <Route path="/" element={<RoleSelection />} />
      <Route path="/choose" element={<RoleSelection />} />
      <Route path="/auth/owner" element={<AuthPage role="owner" />} />
      <Route path="/auth/customer" element={<AuthPage role="customer" />} />
      <Route path="/register" element={<AuthPage role="customer" register />} />
      <Route path="/shop" element={<Storefront />} />
      <Route path="/checkout" element={<ProtectedRoute role="customer"><Storefront page="checkout" /></ProtectedRoute>} />
      <Route path="/my-orders" element={<ProtectedRoute role="customer"><Storefront page="orders" /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute role="customer"><Storefront page="account" /></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute role="customer"><Storefront page="complaint" /></ProtectedRoute>} />
      <Route path="/policies" element={<Storefront page="policies" />} />
      <Route path="/contact" element={<Storefront page="contact" />} />
      <Route path="/owner/*" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
}

export default Application
