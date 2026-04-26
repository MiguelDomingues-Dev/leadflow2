import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout, { ProtectedRoute, VendorRoute } from './components/Layout'

import Login    from './pages/Login'
import Setup    from './pages/Setup'
import Perfil   from './pages/Perfil'

// Admin pages
import Dashboard  from './pages/Dashboard'
import Leads      from './pages/Leads'
import Analytics  from './pages/Analytics'
import Platforms  from './pages/Platforms'
import Statuses   from './pages/Statuses'
import Users      from './pages/Users'
import { Vendors } from './pages/Vendors'
import { LeadForm } from './pages/LeadForm'
import Settings from './pages/Settings'
import Audit from './pages/Audit'

// Vendor pages
import MyLeads   from './pages/MyLeads'
import Agenda    from './pages/Agenda'
import FocusMode from './pages/FocusMode'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />

          {/* Admin only */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<Layout />}>
              <Route path="/"              element={<Dashboard />} />
              <Route path="/leads"         element={<Leads />} />
              <Route path="/leads/new"     element={<LeadForm />} />
              <Route path="/leads/:id/edit" element={<LeadForm />} />
              <Route path="/analytics"     element={<Analytics />} />
              <Route path="/platforms"     element={<Platforms />} />
              <Route path="/statuses"      element={<Statuses />} />
              <Route path="/vendors"       element={<Vendors />} />
              <Route path="/users"         element={<Users />} />
              <Route path="/settings"      element={<Settings />} />
              <Route path="/audit"         element={<Audit />} />
              <Route path="/perfil"        element={<Perfil />} />
            </Route>
          </Route>

          {/* Vendor only */}
          <Route element={<VendorRoute />}>
            <Route element={<Layout />}>
              <Route path="/meus-leads"  element={<MyLeads />} />
              <Route path="/novo-lead"   element={<LeadForm />} />
              <Route path="/agenda"      element={<Agenda />} />
              <Route path="/foco"        element={<FocusMode />} />
              <Route path="/perfil"      element={<Perfil />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
