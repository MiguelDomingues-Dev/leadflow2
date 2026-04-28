import { Trophy, Target, RefreshCw, CalendarClock, Phone, TrendingUp, DollarSign } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatForDisplay, isToday, isOverdue } from '../utils/date'

const fmt = n => new Intl.NumberFormat('pt-BR').format(n ?? 0)
const pct = (a, b) => b ? (((a ?? 0) / b) * 100).toFixed(1) + '%' : '0%'

export default function CloserDashboard({ data, load, loading }) {
  if (loading || !data) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-brand-500 animate-spin" /></div>

  const { totais, funil, proximos_contatos } = data

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" /> Portal Closer
          </h1>
          <p className="text-surface-500 text-sm mt-1">Foco em fechamento e gestão de clientes quentes</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Atualizar</button>
      </div>

      {/* Meta de Vendas */}
      <div className="card p-6 bg-gradient-to-br from-green-900/20 to-surface-950 border-green-500/20">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" /> Meta de Vendas (Fechamento)
              </h2>
              <p className="text-sm text-surface-400">Progresso baseado nos leads convertidos este mês</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-2xl bg-surface-800/40 border border-surface-800 text-center">
                <p className="text-[10px] uppercase text-surface-500 mb-1">Meu Faturamento</p>
                <p className="text-xl font-bold text-green-400">R$ {fmt(totais?.user_progress || 0)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface-800/40 border border-surface-800 text-center">
                <p className="text-[10px] uppercase text-surface-500 mb-1">Minha Meta</p>
                <p className="text-xl font-bold text-surface-100">R$ {fmt(totais?.user_goal || totais?.closer_goal || 0)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-[10px] uppercase text-green-400 mb-1">Atingimento</p>
                <p className="text-xl font-bold text-surface-100">{pct(totais?.user_progress || 0, totais?.user_goal || totais?.closer_goal || 1)}</p>
              </div>
            </div>
          </div>
          <div className="w-32 h-32 relative flex items-center justify-center">
             <svg className="w-full h-full -rotate-90">
               <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-surface-800" />
               <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" 
                 strokeDasharray={2 * Math.PI * 58}
                 strokeDashoffset={2 * Math.PI * 58 * (1 - Math.min(1, (totais?.user_progress || 0) / (totais?.user_goal || totais?.closer_goal || 1)))}
                 strokeLinecap="round" className="text-green-500 transition-all duration-1000" />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <p className="text-2xl font-bold text-surface-100">{Math.round(((totais?.user_progress || 0) / (totais?.user_goal || totais?.closer_goal || 1)) * 100)}%</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos Contatos */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-surface-100 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-400" /> Sua Agenda de Follow-up
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {proximos_contatos?.length > 0 ? proximos_contatos.slice(0, 6).map(c => {
              const overdue = isOverdue(c.next_contact)
              const today = isToday(c.next_contact)
              return (
                <div key={c.id} className={`p-4 rounded-2xl border ${overdue ? 'border-red-500/20 bg-red-500/5' : today ? 'border-amber-500/20 bg-amber-500/5' : 'border-surface-800 bg-surface-800/30'}`}>
                   <p className="text-surface-100 font-bold truncate">{c.name}</p>
                   <p className="text-xs text-surface-500 font-mono flex items-center gap-1 mt-1 mb-3">
                     <Phone className="w-3 h-3" />{c.phone}
                   </p>
                   <div className="flex items-center justify-between">
                     <span className={`text-xs font-bold ${overdue ? 'text-red-400' : today ? 'text-amber-400' : 'text-surface-400'}`}>
                       {formatForDisplay(c.next_contact)}
                     </span>
                     <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-700 text-surface-300 uppercase">
                       {c.status_name}
                     </span>
                   </div>
                </div>
              )
            }) : (
              <div className="md:col-span-2 card p-8 text-center text-surface-500">
                Sem contatos agendados para os próximos dias.
              </div>
            )}
          </div>
        </div>

        {/* Mini Funil */}
        <div className="card p-6 flex flex-col">
          <h2 className="font-semibold text-surface-100 mb-6">Status do Pipeline</h2>
          <div className="flex-1 space-y-6">
            {funil.slice(2, 6).map(f => (
              <div key={f.id} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-surface-400 font-medium">{f.name}</span>
                  <span className="text-surface-200 font-bold">{f.n}</span>
                </div>
                <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: pct(f.n, totais.mes), backgroundColor: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
