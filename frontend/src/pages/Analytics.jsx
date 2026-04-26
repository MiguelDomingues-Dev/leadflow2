import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import { getDashboard } from '../api/client'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-sm">
      <p className="text-surface-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const r = await getDashboard(); setData(r.data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  )

  const por_plataforma = data?.por_plataforma || []
  const por_vendedor   = data?.por_vendedor   || []
  const serie_14d      = data?.serie_14d      || []
  const total          = data?.totais?.total  || 1

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-surface-500 text-sm mt-1">Análise detalhada dos leads</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Atualizar</button>
      </div>

      {/* Plataforma: total vs convertidos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-surface-100 mb-1">Total vs Convertidos por Plataforma</h2>
          <p className="text-surface-500 text-xs mb-5">Comparativo de captação e conversão</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={por_plataforma} barSize={22} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Legend wrapperStyle={{ fontSize:'11px' }} />
              <Bar dataKey="total"      name="Total"      fill="#d946ef" radius={[4,4,0,0]} />
              <Bar dataKey="convertidos" name="Convertidos" fill="#4ade80" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-surface-100 mb-1">Participação por Plataforma</h2>
          <p className="text-surface-500 text-xs mb-5">Fatia do total de leads</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={por_plataforma}
                cx="50%" cy="50%"
                outerRadius={90}
                paddingAngle={3}
                dataKey="total"
                nameKey="name"
              >
                {por_plataforma.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Pie>
              <Tooltip formatter={v => v + ' leads'} />
              <Legend iconSize={10} wrapperStyle={{ fontSize:'11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Série 14d */}
      <div className="card p-6">
        <h2 className="font-semibold text-surface-100 mb-1">Volume Diário — Últimos 14 dias</h2>
        <p className="text-surface-500 text-xs mb-5">Tendência de captação de leads</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={serie_14d} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="total" name="Leads" fill="#a21caf" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vendedores */}
      <div className="card p-6">
        <h2 className="font-semibold text-surface-100 mb-5">Desempenho por Vendedor</h2>
        {por_vendedor.length === 0 ? (
          <p className="text-surface-500 text-sm text-center py-8">Nenhum dado de vendedor ainda</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-500 border-b border-surface-800">
                <th className="pb-3 font-medium">Vendedor</th>
                <th className="pb-3 font-medium text-right">Total Leads</th>
                <th className="pb-3 font-medium text-right">Convertidos</th>
                <th className="pb-3 font-medium text-right">Taxa Conv.</th>
                <th className="pb-3 font-medium">% do Total</th>
              </tr>
            </thead>
            <tbody>
              {por_vendedor.map(v => {
                const taxa = v.total ? ((v.convertidos || 0) / v.total * 100).toFixed(1) : 0
                const share = ((v.total / total) * 100).toFixed(1)
                return (
                  <tr key={v.name} className="table-row">
                    <td className="py-3 font-medium text-surface-100">{v.name}</td>
                    <td className="py-3 text-right text-surface-300">{v.total}</td>
                    <td className="py-3 text-right text-green-400 font-semibold">{v.convertidos || 0}</td>
                    <td className="py-3 text-right text-brand-400 font-bold">{taxa}%</td>
                    <td className="py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-800 rounded-full">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: share + '%' }} />
                        </div>
                        <span className="text-surface-500 text-xs w-10 text-right">{share}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
