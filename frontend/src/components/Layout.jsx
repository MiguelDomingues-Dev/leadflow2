import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar, { BottomNav } from './Sidebar'
import { Toaster } from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'

export function ProtectedRoute({ adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-surface-950 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-brand-500 animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/meus-leads" replace />
  return <Outlet />
}

export function VendorRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-surface-950 flex items-center justify-center"><RefreshCw className="w-6 h-6 text-brand-500 animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bottom-nav-safe">
        <div className="p-4 md:p-7 max-w-7xl mx-auto"><Outlet /></div>
      </main>
      <BottomNav />
      <Toaster position="top-right" toastOptions={{
        style: { background:'#1e293b', color:'#f1f5f9', border:'1px solid #334155', borderRadius:'12px', fontFamily:'Inter,sans-serif', fontSize:'14px' },
        success: { iconTheme: { primary:'#3b82f6', secondary:'#060d18' } },
        error:   { iconTheme: { primary:'#ef4444', secondary:'#060d18' } },
      }} />
    </div>
  )
}
