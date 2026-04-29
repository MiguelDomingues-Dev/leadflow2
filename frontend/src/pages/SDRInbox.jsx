import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, RefreshCw, Phone, Zap, MessageSquare, X, CheckCircle, ChevronRight, Plus, ArrowLeft, Mic, Square, Trash2, ShoppingCart } from 'lucide-react'
import { getLeads, getLead, getVendors, getStatuses, qualifyLead, addActivity, updateLead, addAudioActivity } from '../api/client'
import CloseSaleModal from '../components/CloseSaleModal'
import { formatForDisplay, formatForInput } from '../utils/date'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const PLATFORMS = { 1: '▶ YouTube', 2: '📸 Instagram', 3: '📘 Facebook', 4: '🎬 Kwai' }

function LeadCard({ lead, onOpen, isSelected }) {
  const since = lead.created_at
    ? (() => {
        const diff = Date.now() - new Date(lead.created_at).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 60) return `${m}min atrás`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}h atrás`
        return `${Math.floor(h / 24)}d atrás`
      })()
    : ''

  return (
    <button
      onClick={() => onOpen(lead.id)}
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 group ${
        isSelected
          ? 'border-brand-500/50 bg-brand-500/5'
          : 'border-surface-800 bg-surface-900/50 hover:border-surface-700 hover:bg-surface-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-surface-100 truncate">{lead.name}</p>
          <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
             className="text-xs text-surface-400 font-mono flex items-center gap-1 mt-1 w-fit hover:text-green-400 transition-colors">
            <Phone className="w-3 h-3" /> {lead.phone}
          </a>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-[10px] text-surface-600">{since}</span>
          <div className="mt-1">
            {lead.platform_icon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-surface-400">
                {lead.platform_icon} {lead.platform_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {lead.specific_video && (
        <p className="text-[10px] text-surface-500 mt-2 truncate">🎬 {lead.specific_video}</p>
      )}

      {/* Status pill */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: (lead.status_color || '#64748b') + '20', color: lead.status_color || '#94a3b8' }}>
          {lead.status_name || 'Novo'}
        </span>
        <ChevronRight className="w-4 h-4 text-surface-700 group-hover:text-surface-400 transition-colors" />
      </div>
    </button>
  )
}

function QualifyDrawer({ lead, vendors, onClose, onQualified, onOpenSale }) {
  const [note, setNote] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [saving, setSaving] = useState(false)
  const noteRef = useRef(null)

  // Audio recording
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { noteRef.current?.focus() }, [])
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current) } }, [])

  const closer_vendors = vendors.filter(v => v.role === 'vendor' && v.active)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        setAudioBlob(new Blob(chunks, { type: 'audio/webm' }))
        clearInterval(timerRef.current)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      toast.error('Não foi possível acessar o microfone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const discardAudio = () => { setAudioBlob(null); setRecordingTime(0) }

  const formatTime = sec => {
    const m = Math.floor(sec / 60); const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleQualify = async () => {
    setSaving(true)
    try {
      await qualifyLead(lead.id, { vendor_id: vendorId || null, note })

      // Upload audio if exists
      if (audioBlob) {
        const fd = new FormData()
        fd.append('audio', audioBlob, 'audio.webm')
        await addAudioActivity(lead.id, fd)
      }

      toast.success('🔥 Lead qualificado e enviado!')
      onQualified()
    } catch {}
    setSaving(false)
  }

  const whatsapp = `https://wa.me/55${lead.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${lead.name.split(' ')[0]}, tudo bem?`)}`

  // Existing audio activities from the lead
  const audioActivities = (lead.activities || []).filter(a => a.type === 'audio')
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:4031/api').replace('/api', '')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-surface-800 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-surface-100 text-lg">{lead.name}</h2>
          <a href={`tel:${lead.phone}`} className="text-sm text-surface-400 font-mono flex items-center gap-1.5 mt-0.5 hover:text-green-400">
            <Phone className="w-3.5 h-3.5" /> {lead.phone}
          </a>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Info rápida */}
      <div className="p-5 border-b border-surface-800 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-surface-600 mb-0.5">Plataforma</p>
          <p className="text-surface-300">{lead.platform_icon} {lead.platform_name || '—'}</p>
        </div>
        <div>
          <p className="text-surface-600 mb-0.5">Acompanha</p>
          <p className="text-surface-300">
            {{ nao_acompanha: 'Não acompanha', menos_1_mes: '< 1 mês', '1_3_meses': '1–3 meses', '3_6_meses': '3–6 meses', mais_6_meses: '> 6 meses' }[lead.follow_time] || '—'}
          </p>
        </div>
        {lead.specific_video && (
          <div className="col-span-2">
            <p className="text-surface-600 mb-0.5">Vídeo</p>
            <p className="text-surface-300 truncate">🎬 {lead.specific_video}</p>
          </div>
        )}
        {lead.interest && (
          <div className="col-span-2">
            <p className="text-surface-600 mb-0.5">Interesse</p>
            <p className="text-surface-300">{lead.interest}</p>
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="p-5 border-b border-surface-800 flex gap-2">
        <a href={whatsapp} target="_blank" rel="noreferrer"
           className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold hover:bg-green-500/20 transition-all">
          <MessageSquare className="w-4 h-4" /> WhatsApp
        </a>
        <a href={`tel:${lead.phone}`}
           className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold hover:bg-blue-500/20 transition-all">
          <Phone className="w-4 h-4" /> Ligar
        </a>
      </div>

      {/* Qualificação */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide block mb-2">
            Enviar para Closer (opcional)
          </label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="input text-sm">
            <option value="">Sem atribuição específica</option>
            {closer_vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide block mb-2">
            Nota de triagem (opcional)
          </label>
          <textarea
            ref={noteRef}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: Cliente muito interessado, perguntou sobre preço..."
            rows={3}
            className="input resize-none text-sm"
          />
        </div>

        {/* Audio recorder */}
        <div className="border border-surface-800 rounded-xl p-4 bg-surface-900/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Nota de voz
            </p>
            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {formatTime(recordingTime)}
              </span>
            )}
          </div>

          {!audioBlob ? (
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button type="button" onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
                  <Mic className="w-3.5 h-3.5" /> Gravar Áudio
                </button>
              ) : (
                <button type="button" onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold animate-pulse">
                  <Square className="w-3.5 h-3.5" /> Parar
                </button>
              )}
              <p className="text-[10px] text-surface-600">
                {isRecording ? 'Gravando...' : 'O Closer irá ouvir este áudio'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10" />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-green-400 font-semibold">✓ Pronto para envio</p>
                <button type="button" onClick={discardAudio}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="w-3 h-3" /> Descartar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing audio notes from previous activities */}
        {audioActivities.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Áudios existentes</p>
            {audioActivities.map(a => (
              <audio key={a.id} controls src={`${apiBase}/api/uploads/${a.content}`} className="w-full h-10" />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-5 border-t border-surface-800 space-y-2">
        <button
          onClick={onOpenSale}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-base transition-all shadow-lg shadow-green-600/30 mb-2"
        >
          <ShoppingCart className="w-5 h-5" />
          REALIZAR VENDA (DIRETO)
        </button>

        <button
          onClick={handleQualify}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-base transition-all shadow-lg shadow-brand-600/30 disabled:opacity-60"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          {saving ? 'Enviando...' : (audioBlob ? '🎙️ QUALIFICAR + ÁUDIO' : '🔥 QUALIFICAR E ENVIAR')}
        </button>
        <button onClick={onClose} className="w-full py-2 rounded-xl text-surface-400 hover:text-surface-200 text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}


export default function SDRInbox() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [vendors, setVendors] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showCloseSale, setShowCloseSale] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, v, s] = await Promise.all([
        getLeads({ search, per_page: 200 }),
        getVendors(),
        getStatuses()
      ])
      const data = Array.isArray(l.data) ? l.data : (l.data?.data || [])
      setLeads(data)
      setVendors(v.data || [])
      setStatuses(s.data || [])
    } catch {}
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const openLead = async (id) => {
    if (selectedId === id) { setSelectedId(null); setSelectedLead(null); return }
    setSelectedId(id)
    setLoadingDetail(true)
    try {
      const r = await getLead(id)
      setSelectedLead(r.data)
    } catch {}
    setLoadingDetail(false)
  }

  const handleQualified = async () => {
    setSelectedId(null)
    setSelectedLead(null)
    await load()
  }

  const filtered = leads.filter(l => {
    const matchStatus = !statusFilter || String(l.status_id) === statusFilter
    // Oculta leads que já foram enviados para um Closer (vendor_id preenchido)
    // mas permite vê-los se estiver pesquisando ou filtrando por um status específico
    if (!statusFilter && !search && l.vendor_id) return false
    return matchStatus
  })
  const counts = leads.reduce((a, l) => { a[l.status_id] = (a[l.status_id] || 0) + 1; return a }, {})

  const newLeads = leads.filter(l => l.status_id === 1 || l.status_name === 'Novo').length
  const qualifiedToday = leads.filter(l => l.status_name === 'Qualificado').length

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 md:-m-7 overflow-hidden">
      {/* LEFT PANEL — Inbox */}
      <div className={`flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-shrink-0 border-r border-surface-800 bg-surface-950`}>
        {/* Header */}
        <div className="p-5 border-b border-surface-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-surface-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-400" /> Entrada de Leads
              </h1>
              <p className="text-xs text-surface-500 mt-0.5">{filtered.length} leads · {newLeads} novos · {qualifiedToday} qualificados</p>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => navigate('/sdr-novo')} className="w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-700 flex items-center justify-center text-white transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="input pl-9 text-sm"
            />
          </div>
        </div>

        {/* Status filters */}
        <div className="px-5 py-3 border-b border-surface-800 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => setStatusFilter('')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!statusFilter ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-700 text-surface-500 hover:border-surface-600'}`}>
            Todos
          </button>
          {statuses.map(s => {
            if (!counts[s.id]) return null
            const active = statusFilter === String(s.id)
            return (
              <button key={s.id} onClick={() => setStatusFilter(String(s.id))}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all`}
                style={active ? { color: s.color, backgroundColor: s.color + '18', borderColor: s.color + '60' } : { borderColor: '#334155', color: '#64748b' }}>
                {s.name} ({counts[s.id]})
              </button>
            )
          })}
        </div>

        {/* Lead list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 text-brand-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-surface-500">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Sem leads no momento</p>
            </div>
          ) : filtered.map(l => (
            <LeadCard key={l.id} lead={l} onOpen={openLead} isSelected={selectedId === l.id} />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — Quick qualify drawer */}
      <div className={`flex-1 h-full bg-surface-950 ${selectedId ? 'block' : 'hidden md:flex md:items-center md:justify-center'}`}>
        {!selectedId ? (
          <div className="text-center text-surface-600">
            <Zap className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-lg text-surface-500">Selecione um lead</p>
            <p className="text-sm mt-1">Toque em um lead para qualificar rapidamente</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : selectedLead ? (
          <QualifyDrawer
            lead={selectedLead}
            vendors={vendors}
            onClose={() => { setSelectedId(null); setSelectedLead(null) }}
            onQualified={handleQualified}
            onOpenSale={() => setShowCloseSale(true)}
          />
        ) : null}
      </div>

      {showCloseSale && selectedLead && (
        <CloseSaleModal 
          lead={selectedLead} 
          onClose={() => setShowCloseSale(false)} 
          onSuccess={() => {
            setShowCloseSale(false)
            handleQualified()
          }} 
        />
      )}
    </div>
  )
}
