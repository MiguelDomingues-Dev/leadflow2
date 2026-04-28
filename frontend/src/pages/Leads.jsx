import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, Trash2, Edit2, RefreshCw, Users, Download, MessageCircle, ChevronLeft, ChevronRight, X, Phone, Mail } from 'lucide-react'
import { getLeads, getPlatforms, getVendors, getStatuses, deleteLead, updateLead, bulkActionLeads, getPipelines } from '../api/client'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const FOLLOW = { menos_1_mes:'< 1 mês', '1_3_meses':'1–3 meses', '3_6_meses':'3–6 meses', mais_6_meses:'> 6 meses', nao_acompanha:'Não acompanha' }
const PER_PAGE = 20

function whatsappUrl(phone) {
  const digits = phone.replace(/\D/g, '')
  const num = digits.startsWith('55') ? digits : '55' + digits
  return `https://wa.me/${num}`
}

// Badge colorido de status
function StatusBadge({ name, color }) {
  if (!name) return <span className="text-surface-500 text-xs">—</span>
  const bg = color ? color + '20' : '#64748b20'
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: bg, color: color || '#94a3b8' }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#94a3b8' }} />
      {name}
    </span>
  )
}

// Dropdown de status in-table
function StatusDropdown({ lead, statuses, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (sid) => {
    setOpen(false)
    await onStatusChange(lead.id, sid)
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="cursor-pointer hover:opacity-80 transition-opacity">
        <StatusBadge name={lead.status_name} color={lead.status_color} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-surface-800 border border-surface-700 rounded-xl shadow-xl min-w-44 py-1 overflow-hidden">
          {statuses.map(s => (
            <button key={s.id} onClick={() => handleSelect(s.id)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-700 transition-colors flex items-center gap-2 ${String(s.id) === String(lead.status_id) ? 'bg-surface-700/60' : ''}`}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Leads() {
  const [leads, setLeads]         = useState([])
  const [platforms, setPlatforms] = useState([])
  const [vendors, setVendors]     = useState([])
  const [statuses, setStatuses]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [platF, setPlatF]         = useState('')
  const [statusF, setStatusF]     = useState('')
  const [sdrF, setSdrF]           = useState('')
  const [vendorF, setVendorF]     = useState('')
  const [periodF, setPeriodF]     = useState('')
  const [pipelineId, setPipelineId] = useState('')
  const [pipelines, setPipelines] = useState([])
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      let pipes = pipelines
      if (pipes.length === 0) {
        const pReq = await getPipelines()
        pipes = pReq.data.data || pReq.data || []
        setPipelines(pipes)
        if (pipes.length > 0 && !pipelineId) {
          setPipelineId(String(pipes.find(p => p.is_default)?.id || pipes[0].id))
          return
        }
      }

      if (!pipelineId && pipes.length === 0) {
        setLoading(false)
        return
      }

      const [l, plat, v, s] = await Promise.all([
        getLeads({ search, pipeline_id: pipelineId, platform_id: platF, status_id: statusF, sdr_id: sdrF, vendor_id: vendorF, period: periodF, page: p, per_page: PER_PAGE }),
        getPlatforms(), getVendors(), getStatuses()
      ])
      // Backend may return { data, total } or just an array
      const payload = l.data
      if (Array.isArray(payload)) {
        setLeads(payload)
        setTotal(payload.length < PER_PAGE ? ((p - 1) * PER_PAGE + payload.length) : (p * PER_PAGE + 1))
      } else {
        setLeads(payload.data || [])
        setTotal(payload.total || 0)
      }
      
      const pipelineStatuses = s.data.filter(st => String(st.pipeline_id) === String(pipelineId))
      setPlatforms(plat.data); setVendors(v.data); setStatuses(pipelineStatuses)
    } catch {}
    setLoading(false)
  }, [search, platF, statusF, sdrF, vendorF, periodF, page, pipelineId, pipelines])

  useEffect(() => { setPage(1); load(1) }, [search, platF, statusF, sdrF, vendorF, periodF, pipelineId]) // eslint-disable-line
  useEffect(() => { load(page) }, [page]) // eslint-disable-line

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Excluir lead "${name}"?`)) return
    try { await deleteLead(id); toast.success('Lead excluído'); load(page) } catch {}
  }

  const handleStatusChange = async (leadId, newStatusId) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    try {
      await updateLead(leadId, { ...lead, status_id: newStatusId })
      toast.success('Status atualizado')
      load(page)
    } catch {}
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const all = await getLeads({ search, pipeline_id: pipelineId, platform_id: platF, status_id: statusF, period: periodF, per_page: 9999 })
      const rows = Array.isArray(all.data) ? all.data : (all.data.data || [])
      const header = ['ID','Nome','Telefone','Email','Plataforma','Vendedor','Status','Tempo Acompanha','Próx. Contato','Criado em']
      const lines = rows.map(l => [
        l.id, `"${l.name}"`, l.phone, l.email || '',
        l.platform_name || '', l.vendor_name || '',
        l.status_name || '', FOLLOW[l.follow_time] || '',
        l.next_contact || '',
        new Date(l.created_at).toLocaleDateString('pt-BR')
      ].join(';'))
      const csv = [header.join(';'), ...lines].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`
      a.click(); URL.revokeObjectURL(url)
      toast.success(`${rows.length} leads exportados!`)
    } catch { toast.error('Erro ao exportar') }
    setExporting(false)
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(leads.map(l => l.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBulkAction = async (action, vendorId = null) => {
    if (!window.confirm(`Executar ${action === 'delete' ? 'exclusão' : 'transferência'} em ${selectedIds.length} leads?`)) return
    try {
      await bulkActionLeads({ ids: selectedIds, action, vendor_id: vendorId })
      toast.success('Ação realizada com sucesso')
      setSelectedIds([])
      load(page)
    } catch {}
  }

  return (
    <div className="relative space-y-6">
      {/* Bulk Actions Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-brand-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 border-r border-white/20 pr-6">
            <span className="font-bold text-lg">{selectedIds.length}</span>
            <span className="text-sm opacity-90">selecionados</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
               <button className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
                 <Users className="w-4 h-4" /> Transferir
               </button>
               <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block bg-surface-800 border border-surface-700 rounded-xl shadow-xl min-w-44 py-1 max-h-48 overflow-y-auto">
                 {vendors.map(v => (
                   <button key={v.id} onClick={() => handleBulkAction('transfer', v.id)}
                     className="w-full text-left px-3 py-2 text-xs hover:bg-surface-700 text-surface-200 border-b border-surface-700/50 last:border-0">
                     {v.name}
                   </button>
                 ))}
               </div>
            </div>

            <button onClick={() => handleBulkAction('delete')} className="flex items-center gap-2 hover:bg-red-500/20 text-red-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
            
            <button onClick={() => setSelectedIds([])} className="ml-2 p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Leads</h1>
          <p className="text-surface-500 text-sm mt-1">{total} lead(s) encontrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} disabled={exporting} className="btn-secondary">
            <Download className="w-4 h-4" />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <Link to="/leads/new" className="btn-primary"><Plus className="w-4 h-4" /> Novo Lead</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..." className="input pl-10" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} className="input w-auto min-w-40 font-bold border-brand-500 bg-brand-500/10 text-brand-400">
          {pipelines.map(p => <option key={p.id} value={p.id} className="bg-surface-900 text-surface-200">{p.name}</option>)}
        </select>
        <select value={platF} onChange={e => setPlatF(e.target.value)} className="input w-auto min-w-40">
          <option value="">Todas as plataformas</option>
          {platforms.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="input w-auto min-w-40">
          <option value="">Todos os status</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={sdrF} onChange={e => setSdrF(e.target.value)} className="input w-auto min-w-40">
          <option value="">Todos os SDRs</option>
          {vendors.filter(v => v.role === 'sdr').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={vendorF} onChange={e => setVendorF(e.target.value)} className="input w-auto min-w-40">
          <option value="">Todos os Vendedores</option>
          {vendors.filter(v => v.role === 'vendor').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={periodF} onChange={e => setPeriodF(e.target.value)} className="input w-auto min-w-36">
          <option value="">Todos os períodos</option>
          <option value="today">Hoje</option>
          <option value="week">Últimos 7 dias</option>
          <option value="month">Últimos 30 dias</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-surface-500">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Nenhum lead encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-500 border-b border-surface-800 bg-surface-950/40">
                  <th className="px-5 py-4 font-medium w-10">
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === leads.length && leads.length > 0} className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900" />
                  </th>
                  <th className="px-5 py-4 font-medium">Cliente</th>
                  <th className="px-4 py-4 font-medium">Contato</th>
                  <th className="px-4 py-4 font-medium">Plataforma</th>
                  <th className="px-4 py-4 font-medium">SDR</th>
                  <th className="px-4 py-4 font-medium">Vendedor</th>
                  <th className="px-4 py-4 font-medium">Acompanha</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Data</th>
                  <th className="px-5 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className={`table-row ${selectedIds.includes(l.id) ? 'bg-brand-500/5' : ''}`}>
                    <td className="px-5 py-3">
                      <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => handleSelectOne(l.id)} className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-900" />
                    </td>
                    {/* Cliente */}
                    <td className="px-5 py-3">
                      <p className="font-medium text-surface-100">{l.name}</p>
                      {l.specific_video && <p className="text-surface-500 text-xs truncate max-w-44">🎬 {l.specific_video}</p>}
                    </td>

                    {/* Contato: telefone + email */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-surface-300 text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3 text-surface-500" />{l.phone}
                        </span>
                        {l.email && (
                          <span className="text-surface-500 text-xs flex items-center gap-1 truncate max-w-44">
                            <Mail className="w-3 h-3 flex-shrink-0" />{l.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Plataforma */}
                    <td className="px-4 py-3">
                      {l.platform_name
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-800" style={{ color: l.platform_color }}>
                            {l.platform_icon} {l.platform_name}
                          </span>
                        : <span className="text-surface-500 text-xs">—</span>}
                    </td>

                    {/* SDR */}
                    <td className="px-4 py-3 text-surface-400 text-xs">{l.sdr_name || '—'}</td>

                    {/* Vendedor */}
                    <td className="px-4 py-3 text-surface-400 text-xs">{l.vendor_name || '—'}</td>

                    {/* Acompanha */}
                    <td className="px-4 py-3 text-surface-400 text-xs">{FOLLOW[l.follow_time] || '—'}</td>

                    {/* Status — dropdown dinâmico clicável */}
                    <td className="px-4 py-3">
                      <StatusDropdown lead={l} statuses={statuses} onStatusChange={handleStatusChange} />
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3 text-surface-500 text-xs">
                      {new Date(l.created_at).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* WhatsApp */}
                        <a href={whatsappUrl(l.phone)} target="_blank" rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/20 flex items-center justify-center text-green-400 transition-all"
                          title="Abrir WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        {/* Editar */}
                        <Link to={`/leads/${l.id}/edit`}
                          className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-100 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        {/* Excluir */}
                        <button onClick={() => handleDelete(l.id, l.name)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col divide-y divide-surface-800">
            {leads.map(l => (
              <div key={l.id} className="p-4 flex flex-col gap-3 hover:bg-surface-800/30 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-100 truncate">{l.name}</p>
                    <div className="flex flex-col gap-1 mt-1.5">
                      <span className="font-mono text-surface-400 text-xs flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-surface-500" />{l.phone}
                      </span>
                      {l.email && (
                        <span className="text-surface-400 text-xs flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />{l.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusDropdown lead={l} statuses={statuses} onStatusChange={handleStatusChange} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                  {l.platform_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-surface-800/50 border border-surface-700/50" style={{ color: l.platform_color }}>
                      {l.platform_icon} {l.platform_name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-surface-800/50 border border-surface-700/50 text-surface-400">
                    🔄 {l.sdr_name || 'Sem SDR'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-surface-800/50 border border-surface-700/50 text-surface-400">
                    👤 {l.vendor_name || 'Sem vendedor'}
                  </span>
                  {l.next_contact && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-surface-800/50 border border-surface-700/50 text-surface-400">
                      📅 {new Date(l.next_contact + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-surface-800/50">
                  <span className="text-xs text-surface-500">
                    {new Date(l.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-2">
                    <a href={whatsappUrl(l.phone)} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/20 flex items-center justify-center text-green-400 transition-all">
                      <MessageCircle className="w-4 h-4" />
                    </a>

                    <Link to={`/leads/${l.id}/edit`}
                      className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleDelete(l.id, l.name)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-surface-500 text-sm">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed px-3">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${p === page ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-400 hover:bg-surface-700'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed px-3">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
