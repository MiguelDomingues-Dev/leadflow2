import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { login } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Toaster } from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [showPass, setShow]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { signin }            = useAuth()
  const navigate              = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ email, password })
      signin(res.data.token, res.data.user)
      navigate(res.data.user.role === 'admin' ? '/' : '/meus-leads')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4"
      style={{ backgroundImage:'radial-gradient(ellipse at 20% 20%, rgba(59,130,246,0.07) 0%, transparent 60%)' }}>
      <Toaster position="top-right" toastOptions={{ style:{ background:'#1e293b', color:'#f1f5f9', border:'1px solid #334155', borderRadius:'12px', fontSize:'14px' } }} />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-600/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-50">LeadFlow</h1>
          <p className="text-surface-500 text-sm mt-1">Entre com sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input"
                autoFocus required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-10"
                  required
                />
                <button type="button" onClick={() => setShow(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2.5 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-2.5 disabled:opacity-60 mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-surface-600 text-xs mt-6">LeadFlow v2.0 · Sistema de Rastreamento de Leads</p>
      </div>
    </div>
  )
}
