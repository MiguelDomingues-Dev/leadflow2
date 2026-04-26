import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, RefreshCw, Save, X, Megaphone } from 'lucide-react'
import { getPlatforms, createPlatform, updatePlatform, deletePlatform } from '../api/client'
import toast from 'react-hot-toast'

const PRESETS = [
  { name:'YouTube',   color:'#ff0000', icon:'▶' },
  { name:'Instagram', color:'#e1306c', icon:'📷' },
  { name:'Kwai',      color:'#ff6900', icon:'🎬' },
  { name:'TikTok',    color:'#010101', icon:'🎵' },
  { name:'Facebook',  color:'#1877f2', icon:'👍' },
  { name:'Indicação', color:'#22c55e', icon:'🤝' },
  { name:'Outros',    color:'#6b7280', icon:'🔗' },
]

export default function Platforms() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm] = useState({ name:'', color:'#d946ef', icon:'📱' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const r = await getPlatforms(); setItems(r.data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm({ name:'', color:'#d946ef', icon:'📱' }); setEditing(null); setShowForm(true) }
  const openEdit = i  => { setForm({ name:i.name, color:i.color, icon:i.icon, active:i.active }); setEditing(i.id); setShowForm(true) }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handlePreset = p => setForm(f => ({ ...f, name:p.name, color:p.color, icon:p.icon }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      if (editing) { await updatePlatform(editing, form); toast.success('Plataforma atualizada') }
      else { await createPlatform(form); toast.success('Plataforma criada') }
      setShowForm(false); load()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Excluir "${name}"?`)) return
    try { await deletePlatform(id); load(); toast.success('Excluída') } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plataformas</h1>
          <p className="text-surface-500 text-sm mt-1">Gerencie as origens dos leads</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Nova Plataforma</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">{editing ? 'Editar' : 'Nova'} Plataforma</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-surface-500" /></button>
          </div>

          {/* Presets */}
          <div className="mb-4">
            <p className="label">Atalhos rápidos</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.name} type="button" onClick={() => handlePreset(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-700 bg-surface-800 text-sm hover:border-surface-600 transition-all">
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="label">Nome *</label>
              <input value={form.name} onChange={set('name')} placeholder="YouTube, Instagram..." className="input" />
            </div>
            <div>
              <label className="label">Ícone</label>
              <input value={form.icon} onChange={set('icon')} placeholder="▶ 📷 🎬" className="input" maxLength={4} />
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={set('color')} className="h-10 w-12 rounded-lg border border-surface-700 bg-surface-800 cursor-pointer p-1" />
                <input value={form.color} onChange={set('color')} placeholder="#ff0000" className="input flex-1" maxLength={7} />
              </div>
            </div>
            <div className="md:col-span-3 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-16"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-surface-500">
            <Megaphone className="w-10 h-10 mb-3 opacity-40" />
            <p>Nenhuma plataforma cadastrada</p>
          </div>
        ) : items.map(p => (
          <div key={p.id} className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: p.color+'22', border:`1px solid ${p.color}44` }}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-surface-100">{p.name}</p>
              <p className="text-xs text-surface-500 font-mono">{p.color}</p>
              <div className="w-16 h-1.5 rounded-full mt-1" style={{ backgroundColor: p.color }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-all">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(p.id, p.name)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
