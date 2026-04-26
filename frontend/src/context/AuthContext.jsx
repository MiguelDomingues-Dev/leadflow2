import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/client'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('lf_user') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('lf_token')
    if (!token) { setLoading(false); return }
    getMe()
      .then(r => { setUser(r.data); localStorage.setItem('lf_user', JSON.stringify(r.data)) })
      .catch(() => { localStorage.removeItem('lf_token'); localStorage.removeItem('lf_user'); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const signin = (token, userData) => {
    localStorage.setItem('lf_token', token)
    localStorage.setItem('lf_user', JSON.stringify(userData))
    setUser(userData)
  }

  const signout = () => {
    localStorage.removeItem('lf_token')
    localStorage.removeItem('lf_user')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, signin, signout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
