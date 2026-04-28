import { useState, useEffect } from 'react'
import { getVendors, getVendorHistory } from '../api/client'
import { Users, History, TrendingUp, DollarSign, Clock, Search, ArrowRight, UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminVendorHistory() {
  const [vendors, setVendors] = useState([])
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getVendors().then(res => setVendors(res.data || []))
  }, [])

  useEffect(() => {
    if (selectedVendorId) {
      setLoading(true)
      getVendorHistory(selectedVendorId)
        .then(res => setHistory(res.data))
        .catch(() => toast.error('Erro ao buscar histórico'))
        .finally(() => setLoading(false))
    } else {
      setHistory(null)
    }
  }, [selectedVendorId])

  const formatCurrency = (val) => {
    return parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
            <History className="w-6 h-6 text-brand-500" /> Histórico dos Vendedores
          </h1>
          <p className="text-surface-400 mt-1">
            Veja o desempenho, leads e negociações de cada membro da equipe.
          </p>
        </div>
      </div>

      {/* Seletor de Vendedor */}
      <div className="card p-5">
        <label className="label">Selecione o Vendedor / SDR</label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-surface-500">
              <Users className="w-4 h-4" />
            </div>
            <select 
              value={selectedVendorId} 
              onChange={e => setSelectedVendorId(e.target.value)}
              className="input pl-10"
            >
              <option value="">-- Escolha um vendedor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-surface-500">Carregando dados...</div>
      ) : history ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          
          {/* Métricas do Vendedor */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 bg-brand-500/5 border-brand-500/20">
              <div className="flex items-center gap-3 text-brand-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Leads Totais</span>
              </div>
              <p className="text-2xl font-black text-surface-100">
                {history.metrics.leads_as_sdr + history.metrics.leads_as_closer}
              </p>
              <p className="text-[10px] text-surface-500 mt-1">
                {history.metrics.leads_as_sdr} SDR / {history.metrics.leads_as_closer} Closer
              </p>
            </div>

            <div className="card p-4 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-3 text-emerald-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Conversões</span>
              </div>
              <p className="text-2xl font-black text-surface-100">
                {history.metrics.total_sales_count}
              </p>
              <p className="text-[10px] text-surface-500 mt-1">
                Taxa: {((history.metrics.total_sales_count / (history.metrics.leads_as_closer || 1)) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="card p-4 bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-3 text-blue-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Total Vendido</span>
              </div>
              <p className="text-xl font-black text-surface-100">
                {formatCurrency(history.metrics.total_revenue)}
              </p>
              <p className="text-[10px] text-surface-500 mt-1">
                Valor bruto negociado
              </p>
            </div>

            <div className="card p-4 bg-amber-500/5 border-amber-500/20">
              <div className="flex items-center gap-3 text-amber-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Em Haver</span>
              </div>
              <p className="text-xl font-black text-surface-100">
                {formatCurrency(history.metrics.total_pending)}
              </p>
              <p className="text-[10px] text-surface-500 mt-1">
                Recebido: {formatCurrency(history.metrics.total_received)}
              </p>
            </div>
          </div>

          {/* Lista de Vendas Recentes */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-800 bg-surface-800/30">
              <h3 className="font-bold text-surface-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-surface-500" /> Vendas e Negociações
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-800/50 text-surface-400">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 text-right">Valor Negociado</th>
                    <th className="px-4 py-3 text-right">Pago</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {history.sales.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-surface-500">Nenhuma venda registrada.</td>
                    </tr>
                  ) : (
                    history.sales.map(s => (
                      <tr key={s.id} className="hover:bg-surface-800/20 transition-colors">
                        <td className="px-4 py-4 text-surface-400 font-mono">
                          {new Date(s.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-surface-200">{s.lead_name}</p>
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-surface-300">
                          {formatCurrency(s.final_amount)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-emerald-400">
                          {formatCurrency(s.amount_paid)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-amber-400">
                          {formatCurrency(s.remaining_balance)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'enviado' ? 'bg-green-500/10 text-green-400' :
                            s.status === 'faturado' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {s.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="card p-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-surface-800 flex items-center justify-center text-surface-600">
            <Search className="w-10 h-10" />
          </div>
          <div className="max-w-xs">
            <h3 className="text-surface-200 font-bold">Nenhum vendedor selecionado</h3>
            <p className="text-surface-500 text-sm mt-1">Escolha um membro da equipe acima para carregar o histórico de atividades e vendas.</p>
          </div>
        </div>
      )}
    </div>
  )
}
