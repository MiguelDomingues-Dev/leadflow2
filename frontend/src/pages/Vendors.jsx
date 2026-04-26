import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, RefreshCw, UserCheck, Save, X } from 'lucide-react'
import { getVendors, createVendor, updateVendor } from '../api/client'
import toast from 'react-hot-toast'

export function Vendors() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [name, setName]         = useState('')
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try { const r = await getVendors(); setItems(r.data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setName(''); setEditing(null); setShowForm(true) }
  const openEdit = i  => { setName(i.name); setEditing(i.id); setShowForm(true) }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      if (editing) { await updateVendor(editing, { name }); toast.success('Atualizado') }
      else { await createVendor({ name }); toast.success('Vendedor criado') }
      setShowForm(false); load()
    } catch {}
    setSaving(false)
  }

  const handleDeactivate = async (id, n) => {
    if (!window.confirm('Desativar "' + n + '"?')) return
    try { await updateVendor(id, { active: 0 }); load(); toast.success('Desativado') } catch {}
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendedores</h1>
          <p className="text-surface-500 text-sm mt-1">{items.length} cadastrado(s)</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Novo Vendedor</button>
      </div>
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editing ? 'Editar' : 'Novo'} Vendedor</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-surface-500" /></button>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do vendedor" className="input flex-1" />
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              <Save className="w-4 h-4" /> {saving ? '...' : 'Salvar'}
            </button>
          </form>
        </div>
      )}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-500">
            <UserCheck className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Nenhum vendedor cadastrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-500 border-b border-surface-800 bg-surface-950/40">
                <th className="px-5 py-4 font-medium">Vendedor</th>
                <th className="px-4 py-4 font-medium text-center">Status</th>
                <th className="px-5 py-4 font-medium text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map(v => (
                <tr key={v.id} className="table-row">
                  <td className="px-5 py-3 font-medium text-surface-100">{v.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + (v.active ? 'bg-green-500/10 text-green-400' : 'bg-surface-700 text-surface-500')}>
                      {v.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(v)} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {v.active && (
                        <button onClick={() => handleDeactivate(v.id, v.name)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
