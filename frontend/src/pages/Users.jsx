import { useState, useEffect } from 'react'
import { Plus, Shield, UserCheck, Edit2, Trash2, RefreshCw, Save, X, Eye, EyeOff } from 'lucide-react'
import { getUsers, createUser, updateUser, deleteUser } from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const BLANK = { name:'', email:'', password:'', role:'vendor', active:1 }

export default function Users() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(BLANK)
  const [saving, setSaving]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { user: me }          = useAuth()

  const load = async () => { setLoading(true); try { const r = await getUsers(); setUsers(r.data) } catch {} setLoading(false) }
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm(BLANK); setEditing(null); setShowForm(true) }
  const openEdit = u  => { setForm({ name:u.name, email:u.email, password:'', role:u.role, active:u.active }); setEditing(u.id); setShowForm(true) }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.email) return toast.error('Nome e e-mail obrigatórios')
    if (!editing && form.password.length < 6) return toast.error('Senha mínima de 6 caracteres')
    setSaving(true)
    try {
      const data = { ...form }
      if (editing && !data.password) delete data.password
      if (editing) { await updateUser(editing, data); toast.success('Usuário atualizado') }
      else { await createUser(data); toast.success('Usuário criado') }
      setShowForm(false); load()
    } catch {} setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (id === me.id) return toast.error('Você não pode excluir sua própria conta')
    if (!window.confirm(`Desativar "${name}"?`)) return
    try { await deleteUser(id); load(); toast.success('Usuário desativado') } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Usuários</h1><p className="text-surface-500 text-sm mt-1">{users.length} usuário(s) cadastrado(s)</p></div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Novo Usuário</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">{editing ? 'Editar' : 'Novo'} Usuário</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-surface-500" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Nome *</label><input value={form.name} onChange={set('name')} placeholder="Nome completo" className="input" /></div>
            <div><label className="label">E-mail *</label><input type="email" value={form.email} onChange={set('email')} placeholder="email@empresa.com" className="input" /></div>
            <div>
              <label className="label">{editing ? 'Nova senha (deixe vazio para não alterar)' : 'Senha *'}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" className="input pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Perfil</label>
              <div className="flex gap-3">
                {['admin','vendor'].map(r => (
                  <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role:r }))}
                    className={'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ' +
                      (form.role === r ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600')}>
                    {r === 'admin' ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    {r === 'admin' ? 'Admin' : 'Vendedor'}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar Usuário')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-500 border-b border-surface-800 bg-surface-950/40">
                <th className="px-5 py-4 font-medium">Usuário</th>
                <th className="px-4 py-4 font-medium">E-mail</th>
                <th className="px-4 py-4 font-medium">Perfil</th>
                <th className="px-4 py-4 font-medium">Último acesso</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="px-5 py-3 font-medium text-surface-100">{u.name}{u.id === me.id && <span className="ml-2 text-xs text-brand-400">(você)</span>}</td>
                  <td className="px-4 py-3 text-surface-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={'badge ' + (u.role === 'admin' ? 'bg-brand-600/10 text-brand-400' : 'bg-surface-700 text-surface-300')}>
                      {u.role === 'admin' ? '⚡ Admin' : '👤 Vendedor'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-500 text-xs">{u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={'badge ' + (u.active ? 'bg-green-500/10 text-green-400' : 'bg-surface-700 text-surface-500')}>{u.active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                      {u.id !== me.id && <button onClick={() => handleDelete(u.id, u.name)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
