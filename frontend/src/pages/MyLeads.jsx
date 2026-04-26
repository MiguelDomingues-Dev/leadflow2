import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, RefreshCw, ChevronRight, MessageSquare, Phone, Calendar, ArrowUpRight, ArrowLeft, Mic, Square, Trash2, Link2 } from 'lucide-react'
import { getLeads, getLead, updateLead, addActivity, getStatuses, getPlatforms, addAudioActivity, generateTrackedLink } from '../api/client'
import toast from 'react-hot-toast'
import { formatForDisplay, formatForInput } from '../utils/date'

const FOLLOW = { menos_1_mes:'< 1 mês', '1_3_meses':'1–3 meses', '3_6_meses':'3–6 meses', mais_6_meses:'> 6 meses', nao_acompanha:'Não acompanha' }
const ACT_ICONS = { note:'💬', contact:'📞', status_change:'🔄', created:'✨', audio:'🎙️' }

export default function MyLeads() {
  const loc = useLocation()
  const [leads, setLeads]       = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actText, setActText]   = useState('')
  const [actType, setActType]   = useState('note')
  const [savingAct, setSavingAct] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [viewMode, setViewMode] = useState('list')
  const [showWppTemplates, setShowWppTemplates] = useState(false)
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const mediaRecorderRef = useRef(null)
  const timerRef = useRef(null)
  
  const boardRef = useRef(null)
  const isDraggingBoard = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchQuery), 500)
    return () => clearTimeout(t)
  }, [searchQuery])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, s] = await Promise.all([
        getLeads({ search, per_page: 500 }),
        getStatuses()
      ])
      const payload = Array.isArray(l.data) ? l.data : (l.data.data || [])
      setLeads(payload); setStatuses(s.data)
      
      // Auto-open lead from Agenda
      if (loc.state?.selectedLead && !selected) {
        openDetail(loc.state.selectedLead)
        // Clear state so it doesn't reopen on refresh
        window.history.replaceState({}, document.title)
      }
    } catch {}
    setLoading(false)
  }, [search, loc.state, selected])

  useEffect(() => { load() }, [load])

  const openDetail = async (id) => {
    setSelected(id); setDetail(null); setLoadingDetail(true)
    try { 
      const r = await getLead(id); 
      const data = r.data
      // Format date to YYYY-MM-DD for the input
      data.next_contact = formatForInput(data.next_contact)
      setDetail(data); 
      setEditStatus(String(data.status_id || '')) 
    } catch {}
    setLoadingDetail(false)
  }

  const handleStatusChange = async (sid) => {
    if (!detail) return
    setEditStatus(sid)
    try {
      await updateLead(detail.id, { ...detail, status_id: sid })
      toast.success('Status atualizado')
      load()
      const r = await getLead(detail.id); setDetail(r.data)
    } catch {}
  }

  const handleNextContact = async (date) => {
    if (!detail) return
    const newDate = date || null
    try {
      await updateLead(detail.id, { ...detail, next_contact: newDate })
      toast.success('Próximo contato agendado')
      const r = await getLead(detail.id); 
      setDetail(r.data)
      load() // Refresh the list to reflect changes in Agenda/List
    } catch {}
  }

  const handleAddActivity = async () => {
    if (!detail) return
    if (actType === 'audio' && audioBlob) {
      setSavingAct(true)
      try {
        const fd = new FormData()
        fd.append('audio', audioBlob, 'audio.webm')
        await addAudioActivity(detail.id, fd)
        toast.success('Áudio registrado!')
        setAudioBlob(null)
        setActType('note')
        const r = await getLead(detail.id); setDetail(r.data)
      } catch {}
      setSavingAct(false)
      return
    }

    if (!actText.trim()) return toast.error('Digite uma observação')
    setSavingAct(true)
    try {
      await addActivity(detail.id, { type: actType, content: actText.trim() })
      setActText('')
      const r = await getLead(detail.id); setDetail(r.data)
      toast.success('Registrado!')
    } catch {}
    setSavingAct(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      const chunks = []
      mediaRecorderRef.current.ondataavailable = e => chunks.push(e.data)
      mediaRecorderRef.current.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: 'audio/webm' }))
        stream.getTracks().forEach(track => track.stop())
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (e) { toast.error('Erro ao acessar microfone') }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  const discardAudio = () => {
    setAudioBlob(null)
    setRecordingTime(0)
  }

  const getStatusObj = (id) => statuses.find(s => String(s.id) === String(id))

  const filteredLeads = leads.filter(l => !statusF || String(l.status_id) === statusF)
  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status_id] = (acc[l.status_id] || 0) + 1; return acc;
  }, {})

  const handleDragStart = (e, leadId) => e.dataTransfer.setData('leadId', leadId)
  
  const handleDrop = async (e, statusId) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    if (!leadId) return
    const lead = leads.find(l => String(l.id) === String(leadId))
    if (!lead || String(lead.status_id) === String(statusId)) return
    
    setLeads(prev => prev.map(l => String(l.id) === String(leadId) ? { ...l, status_id: statusId } : l))
    if (detail && String(detail.id) === String(leadId)) {
      setDetail(prev => ({ ...prev, status_id: statusId }))
      setEditStatus(String(statusId))
    }
    try {
      await updateLead(leadId, { ...lead, status_id: statusId })
      toast.success('Lead atualizado')
    } catch { load() }
  }

  const handleBoardDragOver = (e) => {
    e.preventDefault()
    if (!boardRef.current) return
    const board = boardRef.current
    const edgeSize = 150 // pixels from edge to trigger scroll
    const mouseX = e.clientX
    const boardRect = board.getBoundingClientRect()
    
    if (mouseX > boardRect.right - edgeSize) {
      board.scrollBy({ left: 25, behavior: 'auto' })
    } else if (mouseX < boardRect.left + edgeSize) {
      board.scrollBy({ left: -25, behavior: 'auto' })
    }
  }

  // Mouse drag-to-pan logic for Kanban board
  const handleMouseDown = (e) => {
    if (!boardRef.current) return
    isDraggingBoard.current = true
    startX.current = e.pageX - boardRef.current.offsetLeft
    scrollLeft.current = boardRef.current.scrollLeft
  }
  const handleMouseLeave = () => { isDraggingBoard.current = false }
  const handleMouseUp = () => { isDraggingBoard.current = false }
  const handleMouseMove = (e) => {
    if (!isDraggingBoard.current || !boardRef.current) return
    if (e.buttons !== 1) {
      isDraggingBoard.current = false
      return
    }
    e.preventDefault()
    const x = e.pageX - boardRef.current.offsetLeft
    const walk = (x - startX.current) * 2 // Scroll speed multiplier
    boardRef.current.scrollLeft = scrollLeft.current - walk
  }

  const whatsappUrl = (phone, text = '') => {
    const num = phone?.replace(/\D/g, '') || ''
    return `https://wa.me/55${num}${text ? '?text=' + encodeURIComponent(text) : ''}`
  }

  return (
    <div className="flex md:gap-6 h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] pb-8 md:pb-0">
      {viewMode === 'kanban' ? (
        <div className="flex flex-col w-full h-full gap-4">
          {/* Header Kanban */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Kanban de Leads</h1>
              <p className="text-surface-500 text-sm mt-0.5">{filteredLeads.length} lead(s)</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." className="input pl-9 text-sm w-48" />
              </div>
              <div className="flex bg-surface-900 rounded-lg p-1 border border-surface-800">
                <button onClick={() => setViewMode('list')} className="px-3 py-1.5 rounded-md text-sm font-medium text-surface-500 hover:text-surface-300">Lista</button>
                <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-surface-800 text-surface-100">Kanban</button>
              </div>
            </div>
          </div>
          
          {/* Board */}
          <div ref={boardRef} 
               onDragOver={handleBoardDragOver}
               onMouseDown={handleMouseDown}
               onMouseLeave={handleMouseLeave}
               onMouseUp={handleMouseUp}
               onMouseMove={handleMouseMove}
               className="flex-1 overflow-x-auto flex gap-4 pb-4 items-start cursor-grab active:cursor-grabbing custom-scrollbar">
            {statuses.map(s => {
              const colLeads = filteredLeads.filter(l => String(l.status_id) === String(s.id))
              return (
                <div key={s.id} className="flex flex-col flex-shrink-0 w-80 bg-surface-900/40 rounded-2xl border border-surface-800 max-h-full"
                  onDrop={e => handleDrop(e, s.id)} onDragOver={e => e.preventDefault()}>
                  <div className="p-4 border-b border-surface-800/50 flex items-center justify-between bg-surface-900/50 rounded-t-2xl">
                    <span className="font-semibold text-sm" style={{ color: s.color }}>{s.name}</span>
                    <span className="text-xs font-bold text-surface-400 bg-surface-800 px-2 py-0.5 rounded-full">{colLeads.length}</span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {colLeads.map(l => (
                      <div key={l.id} draggable onDragStart={e => handleDragStart(e, l.id)}
                        onClick={() => { setViewMode('list'); openDetail(l.id); }}
                        className="card p-3 cursor-grab active:cursor-grabbing border-surface-700/50 hover:border-surface-500 transition-colors bg-surface-800/30">
                        <p className="font-medium text-sm text-surface-100 truncate">{l.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {l.platform_icon && <span className="text-[10px] text-surface-400 bg-surface-900 border border-surface-700 px-2 py-0.5 rounded-md">{l.platform_icon}</span>}
                          <span className="text-[10px] text-surface-400 font-mono flex items-center gap-1"><Phone className="w-3 h-3" />{l.phone}</span>
                        </div>
                        {l.next_contact && (
                          <div className="mt-2 text-[10px] font-medium text-amber-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatForDisplay(l.next_contact)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Left — list */}
          <div className={`flex-col gap-4 w-full md:max-w-sm flex-shrink-0 h-full ${selected ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">Meus Leads</h1>
                <p className="text-surface-500 text-sm mt-0.5">{filteredLeads.length} lead(s)</p>
              </div>
              <div className="flex bg-surface-900 rounded-lg p-1 border border-surface-800">
                <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-surface-800 text-surface-100">Lista</button>
                <button onClick={() => { setViewMode('kanban'); setSelected(null); }} className="px-3 py-1.5 rounded-md text-sm font-medium text-surface-500 hover:text-surface-300">Kanban</button>
              </div>
            </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." className="input pl-9 text-sm" />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setStatusF('')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!statusF ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-700 bg-surface-800 text-surface-400'}`}>
              Todos ({leads.length})
            </button>
            {statuses.map(s => {
              const count = statusCounts[s.id] || 0
              if (count === 0 && statusF !== String(s.id)) return null
              const active = statusF === String(s.id)
              return (
                <button key={s.id} onClick={() => setStatusF(String(s.id))}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? 'border-current' : 'border-surface-700 bg-surface-800 text-surface-400'}`}
                  style={active ? { color: s.color, backgroundColor: s.color + '18', borderColor: s.color + '60' } : {}}>
                  {s.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
          {loading ? <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
          : filteredLeads.length === 0 ? <div className="text-center text-surface-500 py-12 text-sm">Nenhum lead encontrado</div>
          : filteredLeads.map(l => {
            const st = getStatusObj(l.status_id)
            const isSelected = selected === l.id
            return (
              <button key={l.id} onClick={() => openDetail(l.id)}
                className={'w-full text-left card p-4 transition-all duration-150 hover:border-surface-700 ' + (isSelected ? 'border-brand-600/40 bg-brand-600/5' : '')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-100 text-sm truncate">{l.name}</p>
                    <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} className="text-surface-400 hover:text-surface-200 text-xs mt-0.5 font-mono flex items-center gap-1 w-fit">
                      <Phone className="w-3 h-3" /> {l.phone}
                    </a>
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-600 flex-shrink-0 mt-0.5 hidden md:block" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {st && <span className="badge text-[10px] font-medium px-2 py-0.5" style={{ backgroundColor: st.color + '18', color: st.color }}>{st.name}</span>}
                  {l.platform_icon && <span className="text-[10px] font-medium text-surface-400 bg-surface-800 px-2 py-0.5 rounded-md">{l.platform_icon} {l.platform_name}</span>}
                </div>
                {l.next_contact && (
                  <div className="flex items-center gap-1 mt-2.5 text-xs text-amber-400 font-medium">
                    <Calendar className="w-3 h-3" /> 
                    {formatForDisplay(l.next_contact)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right — detail */}
      <div className={`flex-1 min-w-0 h-full overflow-y-auto pb-4 pr-1 ${selected ? 'block' : 'hidden md:block'}`}>
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-surface-600 gap-3">
            <ArrowUpRight className="w-10 h-10 opacity-30" />
            <p className="text-sm">Selecione um lead para ver os detalhes</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex justify-center py-24"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
        ) : detail ? (
          <div className="space-y-4">
            {/* Mobile Back Button */}
            <div className="md:hidden">
              <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-surface-400 hover:text-surface-100 text-sm font-medium py-2">
                <ArrowLeft className="w-4 h-4" /> Voltar para lista
              </button>
            </div>

            {/* Header */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-surface-100">{detail.name}</h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <a href={`tel:${detail.phone}`} className="text-surface-400 hover:text-surface-200 text-sm font-mono flex items-center gap-1.5 w-fit">
                      <Phone className="w-3.5 h-3.5" /> {detail.phone}
                    </a>
                    <button onClick={() => setShowWppTemplates(true)} className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-md transition-colors">
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                  {detail.email && <p className="text-surface-500 text-xs mt-1.5">{detail.email}</p>}
                </div>
                <div className="text-right">
                  <p className="text-surface-500 text-xs mb-1">Criado em</p>
                  <p className="text-surface-300 text-sm">{new Date(detail.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <p className="text-surface-500 text-xs mb-1">Plataforma</p>
                  <p className="text-surface-200 text-sm">{detail.platform_icon} {detail.platform_name || '—'}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs mb-1">Acompanha há</p>
                  <p className="text-surface-200 text-sm">{FOLLOW[detail.follow_time] || '—'}</p>
                </div>
                {detail.specific_video && (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs mb-1">Vídeo que assistiu</p>
                    <div className="flex items-center gap-2">
                      <p className="text-surface-200 text-sm flex-1">🎬 {detail.specific_video}</p>
                      <button 
                        onClick={async () => {
                          try {
                            const res = await generateTrackedLink({ lead_id: detail.id, url: detail.specific_video });
                            const fullUrl = `${window.location.origin.replace('5173', '4031')}${res.data.tracked_url}`;
                            navigator.clipboard.writeText(fullUrl);
                            toast.success('Link rastreável copiado!');
                          } catch (err) {}
                        }}
                        className="px-2 py-1 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-[10px] font-bold border border-brand-500/20 transition-all flex items-center gap-1"
                      >
                        <Link2 className="w-3 h-3" /> GERAR TRACKER
                      </button>
                    </div>
                  </div>
                )}
                {detail.interest && (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs mb-1">Interesse</p>
                    <p className="text-surface-200 text-sm">{detail.interest}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status + próximo contato */}
            <div className="card p-5 space-y-4">
              <div>
                <p className="label">Status atual</p>
                <div className="flex flex-wrap gap-2">
                  {statuses.map(s => (
                    <button key={s.id} onClick={() => handleStatusChange(String(s.id))}
                      className={'px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ' +
                        (String(s.id) === editStatus
                          ? 'border-current'
                          : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600')}
                      style={String(s.id) === editStatus ? { color: s.color, backgroundColor: s.color + '18', borderColor: s.color + '60' } : {}}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label">Próximo contato</p>
                <input type="date" 
                  value={detail.next_contact || ''}
                  onChange={e => setDetail({ ...detail, next_contact: e.target.value })}
                  onBlur={e => handleNextContact(e.target.value || null)}
                  className="input w-48" />
              </div>
            </div>

            {/* Add activity */}
            <div className="card p-5 space-y-3">
              <p className="font-semibold text-surface-100">Registrar Atividade</p>
              <div className="flex gap-2">
                {[['note','💬 Nota'], ['contact','📞 Contato'], ['audio','🎙️ Áudio'], ['status_change','🔄 Obs']].map(([v,l]) => (
                  <button key={v} onClick={() => setActType(v)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' + (actType === v ? 'border-brand-500 bg-brand-600/10 text-brand-400' : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600')}>
                    {l}
                  </button>
                ))}
              </div>
              
              {actType === 'audio' ? (
                <div className="p-4 border border-surface-700 rounded-xl bg-surface-800/30 flex flex-col items-center justify-center gap-4">
                  {!isRecording && !audioBlob ? (
                    <button onClick={startRecording} className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center hover:bg-brand-500/20 transition-colors">
                      <Mic className="w-5 h-5" />
                    </button>
                  ) : isRecording ? (
                    <div className="flex items-center gap-4 w-full">
                      <div className="flex-1 text-center font-mono text-red-400 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        00:{recordingTime.toString().padStart(2, '0')}
                      </div>
                      <button onClick={stopRecording} className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20">
                        <Square className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 w-full">
                      <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10" />
                      <div className="flex justify-end gap-2">
                        <button onClick={discardAudio} className="btn-secondary text-red-400 border-red-500/20 hover:bg-red-500/10 px-3">Descartar</button>
                        <button onClick={handleAddActivity} disabled={savingAct} className="btn-primary px-3">
                          {savingAct ? 'Salvando...' : 'Salvar Áudio'}
                        </button>
                      </div>
                    </div>
                  )}
                  {!audioBlob && <p className="text-xs text-surface-500">{isRecording ? 'Gravando áudio...' : 'Clique no microfone para gravar uma nota de áudio.'}</p>}
                </div>
              ) : (
                <>
                  <textarea value={actText} onChange={e => setActText(e.target.value)}
                    placeholder="Descreva o que aconteceu..."
                    rows={2} className="input resize-none text-sm" />
                  <div className="flex justify-end">
                    <button onClick={handleAddActivity} disabled={savingAct} className="btn-primary disabled:opacity-60 text-sm">
                      {savingAct ? 'Salvando...' : 'Registrar'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Activity timeline */}
            {detail.activities?.length > 0 && (
              <div className="card p-5">
                <p className="font-semibold text-surface-100 mb-4">Histórico</p>
                <div className="space-y-3">
                  {detail.activities.map(a => (
                    <div key={a.id} className="flex gap-3">
                      <span className="text-base flex-shrink-0 mt-0.5">{ACT_ICONS[a.type] || '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-surface-300 text-sm font-medium">{a.user_name || 'Sistema'}</span>
                          <span className="text-surface-600 text-xs">{new Date(a.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        {a.type === 'audio' ? (
                          <div className="mt-2">
                            <audio controls src={(import.meta.env.VITE_API_URL || 'http://localhost:4031/api').replace('/api', '') + '/api/uploads/' + a.content} className="h-10 max-w-[240px]" />
                          </div>
                        ) : (
                          <p className="text-surface-400 text-sm leading-relaxed">{a.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
      </>
      )}

      {showWppTemplates && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-bold text-surface-100">Enviar WhatsApp</h3>
              <p className="text-sm text-surface-400 mt-1">Escolha um template para enviar para {detail.name.split(' ')[0]}:</p>
            </div>
            <div className="space-y-2">
              {[
                { title: 'Apresentação Inicial', text: `Olá ${detail.name.split(' ')[0]}, tudo bem? Sou da LeadFlow e recebi seu contato.` },
                { title: 'Follow-up (Esfriou)', text: `Oi ${detail.name.split(' ')[0]}! Faz um tempo que conversamos. Conseguiu pensar na nossa proposta?` },
                { title: 'Apenas abrir (Vazio)', text: '' }
              ].map(t => (
                <a key={t.title} 
                  href={whatsappUrl(detail.phone, t.text)} 
                  target="_blank" rel="noreferrer"
                  onClick={() => setShowWppTemplates(false)}
                  className="block w-full text-left p-3 rounded-xl border border-surface-700 hover:border-green-500/50 hover:bg-green-500/10 transition-all group"
                >
                  <p className="font-medium text-sm text-surface-100 group-hover:text-green-400">{t.title}</p>
                  {t.text && <p className="text-xs text-surface-500 mt-1 line-clamp-1">{t.text}</p>}
                </a>
              ))}
            </div>
            <button onClick={() => setShowWppTemplates(false)} className="btn-secondary w-full">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
