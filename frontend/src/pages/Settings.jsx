import { useState, useEffect } from 'react'
import { Save, Target, ShieldCheck, RefreshCw, Zap, Users } from 'lucide-react'
import { getSettings, updateSettings } from '../api/client'
import toast from 'react-hot-toast'

export default function Settings() {
  const [settings, setSettings] = useState({ sdr_goal: '100', closer_goal: '30' })
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
        {/* Meta SDR */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-surface-100">Meta do SDR</h2>
              <p className="text-xs text-surface-500">Leads qualificados por mês</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="label">Meta de Qualificações Mensal</p>
              <input type="number" value={settings.sdr_goal} 
                onChange={e => setSettings({ ...settings, sdr_goal: e.target.value })}
                className="input" placeholder="Ex: 100" />
              <p className="text-[10px] text-surface-600 mt-1.5 leading-relaxed">
                Quantidade de leads que o SDR deve qualificar e enviar para os Closers por mês.
              </p>
            </div>
          </div>
        </div>

        {/* Meta Closer */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-surface-100">Meta do Closer</h2>
              <p className="text-xs text-surface-500">Conversões por mês</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="label">Meta de Conversões Mensal</p>
              <input type="number" value={settings.closer_goal} 
                onChange={e => setSettings({ ...settings, closer_goal: e.target.value })}
                className="input" placeholder="Ex: 30" />
              <p className="text-[10px] text-surface-600 mt-1.5 leading-relaxed">
                Quantidade de leads que o Closer deve converter (fechar venda) por mês.
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

        {/* Webhook Info */}
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-surface-100">Integração Webhook</h2>
              <p className="text-xs text-surface-500">URL para captura automática de leads</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="label">URL do Webhook</p>
              <div className="input bg-surface-800/50 text-surface-400 text-xs font-mono break-all select-all cursor-text">
                {window.location.origin.replace(/:\d+$/, ':4031')}/api/leads/webhook?token=MEUTOKENSECRETO123
              </div>
              <p className="text-[10px] text-surface-600 mt-1.5 leading-relaxed">
                Envie um POST com JSON contendo: <code className="text-surface-400">name</code>, <code className="text-surface-400">phone</code>, e opcionalmente <code className="text-surface-400">platform_id</code>, <code className="text-surface-400">email</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
