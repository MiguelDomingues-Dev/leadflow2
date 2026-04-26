import { useState, useEffect } from 'react'
import { Users, TrendingUp, Target, RefreshCw, Trophy, Video, CalendarClock, Phone, AlertCircle } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getDashboard, getTopVideos } from '../api/client'
import { Link as RouterLink } from 'react-router-dom'

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

const FOLLOW_LABELS = { menos_1_mes:'< 1 mês', '1_3_meses':'1–3 meses', '3_6_meses':'3–6 meses', mais_6_meses:'> 6 meses', nao_acompanha:'Não acompanha' }

export default function Dashboard() {
  const [data, setData]       = useState(null)
  const [videos, setVideos]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [d, v] = await Promise.all([getDashboard(), getTopVideos()])
      setData(d.data); setVideos(v.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-brand-500 animate-spin" /></div>

  const { totais, funil, por_plataforma, por_vendedor, serie_14d, follow_time, proximos_contatos } = data || {}

  const funilData = (funil || []).map(f => ({
    label: f.name,
    n: f.n ?? 0,
    color: f.color || '#64748b',
  }))

  const convertido = (funil || []).find(f => f.is_final === 1 && (f.color === '#22c55e' || f.color === '#4ade80'))
  const convertidoN = convertido?.n ?? 0

  const followData = (follow_time || []).map(f => ({
    name: FOLLOW_LABELS[f.follow_time] || f.follow_time,
    value: f.n
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
          <p className="text-surface-500 text-sm mt-1">Visão geral de todos os leads</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Atualizar</button>
      </div>

      {/* SLA Alert for Admin */}
      {totais?.esquecidos > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
               <AlertCircle className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-red-400 font-bold text-base md:text-lg">{totais.esquecidos} Lead(s) Esquecido(s)!</h3>
               <p className="text-red-400/80 text-xs md:text-sm">Estão com status "Novo" aguardando o primeiro contato há mais de 48 horas.</p>
             </div>
          </div>
          <RouterLink to="/leads" className="btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm py-2">Resgatar leads críticos</RouterLink>
        </div>
      )}

      {/* Meta do Mês */}
      <div className="card p-6 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-surface-900 to-surface-950 border-brand-500/10">
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-400" />
              Meta de Conversão do Mês
            </h2>
            <p className="text-sm text-surface-400">Progresso baseado nos leads convertidos nos últimos 30 dias</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-2xl bg-surface-800/40 border border-surface-800">
              <p className="text-[10px] uppercase tracking-wider text-surface-500 mb-1 font-semibold text-center">Alcançado</p>
              <p className="text-xl font-bold text-brand-400 text-center">{fmt(totais?.mes_convertidos || 0)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-surface-800/40 border border-surface-800">
              <p className="text-[10px] uppercase tracking-wider text-surface-500 mb-1 font-semibold text-center">Meta</p>
              <p className="text-xl font-bold text-surface-100 text-center">{fmt(totais?.goal || 50)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <p className="text-[10px] uppercase tracking-wider text-brand-400 mb-1 font-semibold text-center">Faltam</p>
              <p className="text-xl font-bold text-surface-100 text-center">{fmt(Math.max(0, (totais?.goal || 50) - (totais?.mes_convertidos || 0)))}</p>
            </div>
          </div>
        </div>

        <div className="w-40 h-40 relative flex items-center justify-center">
           <svg className="w-full h-full -rotate-90">
             <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="10" className="text-surface-800" />
             <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="10" 
               strokeDasharray={2 * Math.PI * 70}
               strokeDashoffset={2 * Math.PI * 70 * (1 - Math.min(1, (totais?.mes_convertidos || 0) / (totais?.goal || 50)))}
               strokeLinecap="round" className="text-brand-500 transition-all duration-1000" />
           </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center">
             <p className="text-3xl font-bold text-surface-100">{Math.round(((totais?.mes_convertidos || 0) / (totais?.goal || 1)) * 100)}%</p>
             <p className="text-[10px] text-surface-500 uppercase font-semibold">Concluído</p>
           </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label:'Total de Leads', value: fmt(totais?.total), icon: Users, sub:'Todos os registros', color:'text-brand-400 bg-brand-500/10' },
          { label:'Leads Hoje', value: fmt(totais?.hoje), icon: TrendingUp, sub:'Registrados hoje', color:'text-blue-400 bg-blue-500/10' },
          { label:'Últimos 7 dias', value: fmt(totais?.semana), icon: Target, sub:'Esta semana', color:'text-amber-400 bg-amber-500/10' },
          { label:'Convertidos', value: fmt(convertidoN), icon: Trophy, sub: pct(convertidoN, totais?.total)+' de conversão', color:'text-green-400 bg-green-500/10' },
        ].map(({ label, value, icon: Icon, sub, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <p className="text-surface-400 text-sm">{label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-surface-100">{value}</p>
            <p className="text-xs text-surface-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Funil */}
      <div className="card p-6">
        <h2 className="font-semibold text-surface-100 mb-5">Funil de Conversão</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {funilData.map((f, i) => (
            <div key={f.label} className="text-center">
              <div className="relative mb-3">
                <div className="h-2 rounded-full bg-surface-800">
                  <div className="h-full rounded-full transition-all" style={{ width: pct(f.n, totais?.total), backgroundColor: f.color }} />
                </div>
                {i < funilData.length - 1 && <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-surface-600 text-xs hidden md:block">→</div>}
              </div>
              <p className="text-2xl font-bold" style={{ color: f.color }}>{fmt(f.n)}</p>
              <p className="text-xs text-surface-500">{f.label}</p>
              <p className="text-xs text-surface-600">{pct(f.n, totais?.total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Linha 14d */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-100 mb-1">Leads — Últimos 14 dias</h2>
          <p className="text-surface-500 text-xs mb-5">Volume diário de captação</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={serie_14d || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="total" name="Leads" stroke="#d946ef" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Por plataforma */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-100 mb-1">Leads por Plataforma</h2>
          <p className="text-surface-500 text-xs mb-5">Origem dos leads captados</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={por_plataforma || []} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="total" name="Total" radius={[6,6,0,0]}>
                {(por_plataforma || []).map((p, i) => <Cell key={i} fill={p.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taxa conversão por plataforma */}
      <div className="card p-6">
        <h2 className="font-semibold text-surface-100 mb-5">Taxa de Conversão por Plataforma</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-500 border-b border-surface-800">
                <th className="pb-3 font-medium">Plataforma</th>
                <th className="pb-3 font-medium text-right">Leads</th>
                <th className="pb-3 font-medium text-right">Convertidos</th>
                <th className="pb-3 font-medium text-right">Taxa</th>
                <th className="pb-3 font-medium">Barra</th>
              </tr>
            </thead>
            <tbody>
              {(por_plataforma || []).map(p => (
                <tr key={p.name} className="table-row">
                  <td className="py-3 flex items-center gap-2">
                    <span>{p.icon}</span>
                    <span className="font-medium text-surface-100">{p.name}</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  </td>
                  <td className="py-3 text-right text-surface-300">{fmt(p.total)}</td>
                  <td className="py-3 text-right text-green-400">{fmt(p.convertidos)}</td>
                  <td className="py-3 text-right font-bold" style={{ color: p.color }}>{p.taxa}%</td>
                  <td className="py-3 w-32">
                    <div className="h-1.5 bg-surface-800 rounded-full">
                      <div className="h-full rounded-full" style={{ width: p.taxa+'%', backgroundColor: p.color }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row: vendedores + tempo de acompanhamento + vídeos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pódio de Vendedores */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-surface-100">Ranking de Vendas</h2>
          </div>
          <div className="space-y-4">
            {(por_vendedor || []).length === 0
              ? <p className="text-surface-500 text-sm text-center py-4">Sem dados</p>
              : [...por_vendedor].sort((a,b) => (b.convertidos || 0) - (a.convertidos || 0)).map((v, i) => {
              const rankColor = i === 0 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' : i === 1 ? 'text-slate-300 bg-slate-300/10 border-slate-300/30' : i === 2 ? 'text-amber-600 bg-amber-600/10 border-amber-600/30' : 'text-surface-400 bg-surface-800 border-surface-700';
              return (
                <div key={v.name} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border ${rankColor}`}>
                    {i + 1}º
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-surface-100 text-sm truncate">{v.name}</p>
                    <p className="text-xs text-surface-500">{fmt(v.total)} leads recebidos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-green-400 text-lg leading-none">{fmt(v.convertidos || 0)}</p>
                    <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider mt-0.5">Vendas</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tempo de acompanhamento */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-100 mb-4">Tempo de Acompanhamento</h2>
          {followData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={followData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                  {followData.map((_, i) => <Cell key={i} fill={['#d946ef','#a21caf','#60a5fa','#4ade80','#fbbf24'][i % 5]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize:'11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-surface-500 text-sm text-center py-8">Sem dados</p>}
        </div>

        {/* Top vídeos */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-4 h-4 text-brand-400" />
            <h2 className="font-semibold text-surface-100">Vídeos Mais Citados</h2>
          </div>
          {videos.length === 0
            ? <p className="text-surface-500 text-sm text-center py-8">Nenhum vídeo citado ainda</p>
            : <div className="space-y-2">
              {videos.slice(0,8).map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-surface-600 text-xs w-4">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-300 text-xs truncate">{v.specific_video}</p>
                    <p className="text-surface-500 text-xs" style={{ color: v.color }}>{v.platform_name}</p>
                  </div>
                  <span className="text-brand-400 text-xs font-semibold">{v.n}x</span>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Próximos Contatos */}
      {(proximos_contatos || []).length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-surface-100">Próximos Contatos Agendados</h2>
            </div>
            <RouterLink to="/leads" className="text-brand-400 text-xs hover:text-brand-300 transition-colors">Ver todos →</RouterLink>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(proximos_contatos || []).slice(0, 6).map(c => {
              const date = new Date(c.next_contact + 'T12:00:00')
              const today = new Date(); today.setHours(0,0,0,0)
              const isOverdue = date < today
              const isToday = date.toDateString() === today.toDateString()
              return (
                <div key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isOverdue ? 'border-red-500/20 bg-red-500/5' : isToday ? 'border-amber-500/20 bg-amber-500/5' : 'border-surface-800 bg-surface-800/30'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-500/10' : isToday ? 'bg-amber-500/10' : 'bg-surface-700'}`}>
                    {isOverdue ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CalendarClock className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-100 text-sm font-medium truncate">{c.name}</p>
                    <p className="text-surface-500 text-xs font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />{c.phone}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-xs font-semibold ${isOverdue ? 'text-red-400' : isToday ? 'text-amber-400' : 'text-surface-400'}`}>
                        {isOverdue ? '⚠️ Atrasado · ' : isToday ? '📅 Hoje · ' : ''}
                        {date.toLocaleDateString('pt-BR')}
                      </span>
                      {c.status_name && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: (c.status_color || '#64748b') + '20', color: c.status_color || '#94a3b8' }}>
                          {c.status_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
