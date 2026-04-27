import { Users, TrendingUp, Target, RefreshCw, CheckCircle, Zap, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const fmt = n => new Intl.NumberFormat('pt-BR').format(n ?? 0)
const pct = (a, b) => b ? (((a ?? 0) / b) * 100).toFixed(1) + '%' : '0%'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-sm">
      <p className="text-surface-400 mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {fmt(p.value)}</p>)}
    </div>
  )
}

export default function SDRDashboard({ data, load, loading }) {
  if (loading || !data) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-brand-500 animate-spin" /></div>

  const { totais, funil, por_plataforma, serie_14d } = data

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand-400" /> Portal SDR
          </h1>
          <p className="text-surface-500 text-sm mt-1">Foco em captação e qualificação de leads</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Atualizar</button>
      </div>

      {/* Meta de Qualificação */}
      <div className="card p-6 bg-gradient-to-br from-brand-900/20 to-surface-950 border-brand-500/20">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-400" /> Meta de Leads Qualificados
              </h2>
              <p className="text-sm text-surface-400">Objetivo: transformar leads novos em leads quentes</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-2xl bg-surface-800/40 border border-surface-800 text-center">
                <p className="text-[10px] uppercase text-surface-500 mb-1">Qualificados</p>
                <p className="text-xl font-bold text-brand-400">{fmt(totais?.mes_qualificados)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface-800/40 border border-surface-800 text-center">
                <p className="text-[10px] uppercase text-surface-500 mb-1">Meta</p>
                <p className="text-xl font-bold text-surface-100">{fmt(totais?.sdr_goal)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-center">
                <p className="text-[10px] uppercase text-brand-400 mb-1">Taxa</p>
                <p className="text-xl font-bold text-surface-100">{pct(totais?.mes_qualificados, totais?.mes)}</p>
              </div>
            </div>
          </div>
          <div className="w-32 h-32 relative flex items-center justify-center">
             <svg className="w-full h-full -rotate-90">
               <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-surface-800" />
               <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" 
                 strokeDasharray={2 * Math.PI * 58}
                 strokeDashoffset={2 * Math.PI * 58 * (1 - Math.min(1, (totais?.mes_qualificados || 0) / (totais?.sdr_goal || 1)))}
                 strokeLinecap="round" className="text-brand-500 transition-all duration-1000" />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <p className="text-2xl font-bold text-surface-100">{Math.round(((totais?.mes_qualificados || 0) / (totais?.sdr_goal || 1)) * 100)}%</p>
             </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Leads Totais', value: fmt(totais?.total), icon: Users, color:'text-brand-400 bg-brand-500/10' },
          { label:'Leads Hoje', value: fmt(totais?.hoje), icon: TrendingUp, color:'text-blue-400 bg-blue-500/10' },
          { label:'Qualificados', value: fmt(totais?.mes_qualificados), icon: CheckCircle, color:'text-green-400 bg-green-500/10' },
          { label:'Eficiência', value: pct(totais?.mes_qualificados, totais?.mes), icon: Zap, color:'text-amber-400 bg-amber-500/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon className="w-5 h-5" /></div>
            <p className="text-xs text-surface-500 font-semibold uppercase">{label}</p>
            <p className="text-2xl font-bold text-surface-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 14d */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-100 mb-5">Captação Diária</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={serie_14d}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="total" name="Leads" fill="#d946ef" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Qualificação por Plataforma */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-100 mb-5">Eficiência por Plataforma</h2>
          <div className="space-y-4">
            {por_plataforma.slice(0, 5).map(p => (
              <div key={p.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-surface-300 flex items-center gap-1.5">{p.icon} {p.name}</span>
                  <span className="text-brand-400">{pct(p.qualificados, p.total)} qualificados</span>
                </div>
                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: pct(p.qualificados, p.total), backgroundColor: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
