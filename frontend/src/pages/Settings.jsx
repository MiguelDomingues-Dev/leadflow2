import { useState, useEffect } from 'react'
import { Save, Target, ShieldCheck, RefreshCw } from 'lucide-react'
import { getSettings, updateSettings } from '../api/client'
import toast from 'react-hot-toast'

export default function Settings() {
  const [settings, setSettings] = useState({ sales_goal: '50' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await getSettings()
      setSettings(prev => ({ ...prev, ...r.data }))
    } catch {}
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateSettings(settings)
      toast.success('Configurações salvas!')
    } catch {}
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-brand-500" /></div>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-100">Configurações</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metas */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-surface-100">Metas de Vendas</h2>
              <p className="text-xs text-surface-500">Defina os objetivos globais da equipe</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="label">Meta de Conversões Mensal</p>
              <input type="number" value={settings.sales_goal} 
                onChange={e => setSettings({ ...settings, sales_goal: e.target.value })}
                className="input" placeholder="Ex: 50" />
              <p className="text-[10px] text-surface-600 mt-1.5 leading-relaxed">
                Essa meta será usada para calcular o termômetro de progresso no Dashboard do Administrador.
              </p>
            </div>
          </div>
        </div>

        {/* Segurança */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-surface-100">Segurança & Sistema</h2>
              <p className="text-xs text-surface-500">Configurações globais de proteção</p>
            </div>
          </div>

          <div className="space-y-4 opacity-50 cursor-not-allowed">
            <div>
              <p className="label">Expiração de Sessão (horas)</p>
              <input type="number" disabled value="24" className="input" />
            </div>
            <div>
              <p className="label">Tentativas de Login</p>
              <input type="number" disabled value="5" className="input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
