import { useState, useEffect } from 'react'
import { getAuditLogs } from '../api/client'
import { Shield, Clock, User, Info, RefreshCw } from 'lucide-react'

const ACTION_MAP = {
  login: 'Início de Sessão',
  create_lead: 'Novo Lead Criado',
  update_lead: 'Lead Atualizado',
  delete_lead: 'Lead Excluído',
  bulk_transfer: 'Transferência em Massa',
  bulk_delete: 'Exclusão em Massa',
  update_settings: 'Configurações Alteradas',
  webhook_lead_received: 'Lead via Webhook'
}

export default function Audit() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await getAuditLogs()
      setLogs(r.data)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Log de Auditoria</h1>
          <p className="text-sm text-surface-500 mt-1">Histórico imutável de todas as ações administrativas do sistema</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-surface-800 rounded-lg transition-colors text-surface-400">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
           <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-brand-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-500 border-b border-surface-800 bg-surface-950/40">
                  <th className="px-6 py-4 font-medium">Ação</th>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Data/Hora</th>
                  <th className="px-6 py-4 font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-surface-800/50 hover:bg-surface-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${log.action.includes('delete') ? 'bg-red-500/10 text-red-400' : 'bg-brand-500/10 text-brand-400'}`}>
                          <Shield className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-surface-100">{ACTION_MAP[log.action] || log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-surface-300">
                        <User className="w-4 h-4 text-surface-500" />
                        {log.user_name || 'Sistema / Webhook'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-surface-500">
                        <Clock className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-surface-400 italic">
                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate max-w-xs">{log.details || '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
