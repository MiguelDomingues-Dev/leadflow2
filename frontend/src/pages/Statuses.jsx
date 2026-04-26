import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, RefreshCw, Save, X, Tag } from 'lucide-react'
import { getStatuses, createStatus, updateStatus, deleteStatus } from '../api/client'
import toast from 'react-hot-toast'

const BLANK = { name:'', color:'#3b82f6', sort_order:99, is_default:false, is_final:false }
const PRESETS = [
  { name:'Novo',        color:'#3b82f6' },
  { name:'Em Contato',  color:'#f59e0b' },
  { name:'Qualificado', color:'#8b5cf6' },
  { name:'Proposta',    color:'#06b6d4' },
  { name:'Convertido',  color:'#22c55e' },
  { name:'Perdido',     color:'#ef4444' },
  { name:'Aguardando',  color:'#94a3b8' },
]

export default function Statuses() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(BLANK)
  const [saving, setSaving]   = useState(false)

  const load = async () => { setLoading(true); try { const r = await getStatuses(); setItems(r.data) } catch {} setLoading(false) }
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm({ ...BLANK, sort_order: items.length + 1 }); setEditing(null); setShowForm(true) }
  const openEdit = s  => { setForm({ name:s.name, color:s.color, sort_order:s.sort_order, is_default:!!s.is_default, is_final:!!s.is_final }); setEditing(s.id); setShowForm(true) }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setCheck = k => e => setForm(f => ({ ...f, [k]: e.target.checked }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      if (editing) { await updateStatus(editing, form); toast.success('Status atualizado') }
      else { await createStatus(form); toast.success('Status criado') }
      setShowForm(false); load()
    } catch {} setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Desativar status "${name}"?`)) return
    try { await deleteStatus(id); load(); toast.success('Desativado') } catch {}
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Status dos Leads</h1><p className="text-surface-500 text-sm mt-1">Personalize o funil de acompanhamento</p></div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Novo Status</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editing ? 'Editar' : 'Novo'} Status</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-surface-500" /></button>
          </div>

          <div className="mb-4">
            <p className="label">Atalhos rápidos</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.name} type="button"
                  onClick={() => setForm(f => ({ ...f, name:p.name, color:p.color }))}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-700 bg-surface-800 text-sm hover:border-surface-600 transition-all">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Nome *</label><input value={form.name} onChange={set('name')} placeholder="Ex: Em Negociação" className="input" /></div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2">
                <input type="color" value={form.color} onChange={set('color')} className="h-10 w-12 rounded-xl border border-surface-700 bg-surface-800 cursor-pointer p-1" />
                <input value={form.color} onChange={set('color')} placeholder="#3b82f6" className="input flex-1" maxLength={7} />
              </div>
            </div>
            <div><label className="label">Ordem de exibição</label><input type="number" value={form.sort_order} onChange={set('sort_order')} className="input" /></div>
            <div className="flex flex-col gap-3 justify-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_default} onChange={setCheck('is_default')} className="w-4 h-4 accent-brand-500" />
                <div><p className="text-surface-200 text-sm font-medium">Status padrão</p><p className="text-surface-500 text-xs">Atribuído automaticamente a novos leads</p></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_final} onChange={setCheck('is_final')} className="w-4 h-4 accent-brand-500" />
                <div><p className="text-surface-200 text-sm font-medium">Status final</p><p className="text-surface-500 text-xs">Marca o fim do ciclo (convertido/perdido)</p></div>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
        : items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-surface-500"><Tag className="w-10 h-10 mb-3 opacity-30" /><p className="text-sm">Nenhum status criado</p></div>
        ) : (
          <div className="divide-y divide-surface-800">
            {items.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-800/30 transition-colors">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-100">{s.name}</span>
                    {s.is_default ? <span className="badge bg-brand-600/10 text-brand-400 text-xs">Padrão</span> : null}
                    {s.is_final   ? <span className="badge bg-surface-700 text-surface-400 text-xs">Final</span> : null}
                  </div>
                  <p className="text-xs text-surface-500 font-mono mt-0.5">{s.color} · Ordem: {s.sort_order}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-600/10 flex items-center justify-center flex-shrink-0"><Tag className="w-4 h-4 text-brand-400" /></div>
        <div className="text-sm text-surface-400 leading-relaxed">
          <p className="font-medium text-surface-300 mb-1">Como funciona o funil</p>
          O <strong className="text-surface-200">status padrão</strong> é atribuído automaticamente quando um lead é criado. O <strong className="text-surface-200">status final</strong> indica o fim do ciclo — o dashboard usa esses marcadores para calcular as taxas de conversão.
        </div>
      </div>
    </div>
  )
}
