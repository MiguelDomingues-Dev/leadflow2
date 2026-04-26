import { useState } from 'react'
import { Shield, Key, Eye, EyeOff, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { changePass } from '../api/client'
import toast from 'react-hot-toast'

export default function Perfil() {
  const { user } = useAuth()
  const [form, setForm] = useState({ current_password:'', new_password:'', confirm:'' })
  const [show, setShow] = useState({})
  const [saving, setSaving] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggleShow = k => setShow(s => ({ ...s, [k]: !s[k] }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.new_password !== form.confirm) return toast.error('As senhas não coincidem')
    if (form.new_password.length < 6) return toast.error('Mínimo 6 caracteres')
    setSaving(true)
    try {
      await changePass({ current_password: form.current_password, new_password: form.new_password })
      toast.success('Senha atualizada!')
      setForm({ current_password:'', new_password:'', confirm:'' })
    } catch {}
    setSaving(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div><h1 className="text-2xl font-bold">Meu Perfil</h1><p className="text-surface-500 text-sm mt-1">Configurações da conta</p></div>

      {/* Info */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/10 border border-brand-600/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-surface-100 text-lg">{user?.name}</p>
            <p className="text-surface-500 text-sm">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={'badge ' + (user?.role === 'admin' ? 'bg-brand-600/10 text-brand-400' : 'bg-surface-700 text-surface-300')}>
            {user?.role === 'admin' ? '⚡ Administrador' : '👤 Vendedor'}
          </span>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-brand-400" />
          <h2 className="font-semibold text-surface-100">Alterar Senha</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            ['current_password', 'Senha atual'],
            ['new_password',     'Nova senha'],
            ['confirm',          'Confirmar nova senha'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <div className="relative">
                <input
                  type={show[k] ? 'text' : 'password'}
                  value={form[k]} onChange={set(k)}
                  placeholder="••••••••" className="input pr-10" required
                />
                <button type="button" onClick={() => toggleShow(k)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                  {show[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
