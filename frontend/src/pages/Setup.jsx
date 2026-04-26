import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { setupAdmin } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

export default function Setup() {
  const [form, setForm] = useState({ name:'Administrador', email:'admin@leadflow.com', password:'' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signin } = useAuth()
  const navigate = useNavigate()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Senha mínima de 6 caracteres')
    setLoading(true)
    try {
      const res = await setupAdmin(form)
      signin(res.data.token, { name: form.name, email: form.email, role: 'admin' })
      toast.success('Admin criado! Bem-vindo ao LeadFlow.')
      navigate('/')
    } catch {}
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4"
      style={{ backgroundImage:'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.07) 0%, transparent 60%)' }}>
      <Toaster position="top-right" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-600/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Configuração Inicial</h1>
          <p className="text-surface-500 text-sm mt-1">Crie o primeiro administrador do LeadFlow</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Nome</label><input value={form.name} onChange={set('name')} className="input" required /></div>
            <div><label className="label">E-mail</label><input type="email" value={form.email} onChange={set('email')} className="input" required /></div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" className="input pr-10" required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500"><Eye className="w-4 h-4" /></button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5 disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar Administrador'}
            </button>
          </form>
        </div>
        <p className="text-center text-surface-600 text-xs mt-4">Esta tela só aparece uma vez</p>
      </div>
    </div>
  )
}
