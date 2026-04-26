import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Phone, MessageSquare, ChevronRight, RefreshCw, ArrowLeft, Target, Clock, Save, Link2 } from 'lucide-react'
import { getLeads, getStatuses, updateLead, addActivity } from '../api/client'
import toast from 'react-hot-toast'
import { formatForDisplay, isToday, isOverdue, parseSafe } from '../utils/date'

export default function FocusMode() {
  const [leads, setLeads] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [seconds, setSeconds] = useState(0)
  const navigate = useNavigate()

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [currentIndex])

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }
  
  useEffect(() => {
    const load = async () => {
      try {
        const [l, s] = await Promise.all([getLeads({ per_page: 500 }), getStatuses()])
        const hoje = new Date(); hoje.setHours(0,0,0,0)
        
        const data = Array.isArray(l.data) ? l.data : (l.data.data || [])
        const pending = data
          .filter(lead => {
             if (!lead.next_contact) return false;
             return isToday(lead.next_contact) || isOverdue(lead.next_contact);
          })
          .sort((a,b) => parseSafe(a.next_contact) - parseSafe(b.next_contact))
          
        setLeads(pending)
        setStatuses(s.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (leads[currentIndex]) {
      setSelectedStatus(leads[currentIndex].status_id)
      setNote('')
      setSeconds(0)
    }
  }, [currentIndex, leads])

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>

  if (leads.length === 0 || currentIndex >= leads.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-surface-100">Missão Cumprida!</h1>
        <p className="text-surface-400 max-w-sm">Você finalizou todos os seus contatos atrasados e programados para hoje.</p>
        <button onClick={() => navigate('/agenda')} className="btn-secondary mt-4">
          <ArrowLeft className="w-4 h-4" /> Voltar para Agenda
        </button>
      </div>
    )
  }

  const lead = leads[currentIndex]
  const st = statuses.find(s => String(s.id) === String(lead.status_id))

  const handleSaveAndNext = async () => {
    setSaving(true)
    try {
      // 1. Add activity if there's a note
      if (note.trim()) {
        await addActivity(lead.id, { content: note, type: 'note' })
      }
      
      // 2. Update status if changed
      if (String(selectedStatus) !== String(lead.status_id)) {
        await updateLead(lead.id, { ...lead, status_id: selectedStatus })
      }

      toast.success('Progresso salvo!')
      setCurrentIndex(prev => prev + 1)
    } catch (err) {
      toast.error('Erro ao salvar progresso')
    }
    setSaving(false)
  }
  
  const whatsappUrl = (phone, text = '') => {
    const num = phone?.replace(/\D/g, '') || ''
    return `https://wa.me/55${num}${text ? '?text=' + encodeURIComponent(text) : ''}`
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-12">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/agenda')} className="text-surface-500 hover:text-surface-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 bg-brand-500/10 text-brand-400 px-3 py-1.5 rounded-full text-sm font-bold border border-brand-500/20">
          <Target className="w-4 h-4" /> Missão do Dia: {currentIndex + 1} de {leads.length}
        </div>
        <div className="w-5" />
      </div>

      <div className="card p-6 md:p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-black text-surface-100">{lead.name}</h2>
          <div className="flex justify-center mt-3">
             {st && <span className="badge font-medium px-3 py-1 text-sm" style={{ backgroundColor: st.color + '18', color: st.color }}>{st.name}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <a href={`tel:${lead.phone}`} className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-surface-700 bg-surface-800 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-surface-100 group">
            <Phone className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm">Ligar</span>
          </a>
          <a href={whatsappUrl(lead.phone, `Olá ${lead.name.split(' ')[0]}, tudo bem?`)} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-surface-700 bg-surface-800 hover:border-green-500/50 hover:bg-green-500/10 transition-all text-surface-100 group">
            <MessageSquare className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-sm">WhatsApp</span>
          </a>
        </div>
        
        <div className="bg-surface-950/50 rounded-2xl p-5 border border-surface-800 space-y-4 shadow-inner">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" /> Tempo em atendimento: <span className="text-brand-400 font-mono">{formatTime(seconds)}</span>
            </h3>
          </div>
          
          <div className="space-y-3">
            <label className="text-xs font-semibold text-surface-400">Alterar Status</label>
            <div className="flex flex-wrap gap-2">
              {statuses.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                    String(selectedStatus) === String(s.id) 
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400' 
                    : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-surface-400">Anotações Rápidas</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="O que foi conversado? Próximos passos..."
              className="input bg-surface-800 border-surface-700 text-sm min-h-[100px] resize-none focus:ring-brand-500/20"
            />
          </div>

          {lead.specific_video && (
            <div className="pt-2">
               <button 
                onClick={async () => {
                  try {
                    const { generateTrackedLink } = await import('../api/client');
                    const res = await generateTrackedLink({ lead_id: lead.id, url: lead.specific_video });
                    const fullUrl = `${window.location.origin.replace('5173', '4031')}${res.data.tracked_url}`;
                    navigator.clipboard.writeText(fullUrl);
                    toast.success('Link rastreável copiado!');
                  } catch (err) {
                    toast.error('Erro ao gerar link');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-500/30 bg-brand-500/5 text-brand-400 text-xs font-bold hover:bg-brand-500/10 transition-all"
               >
                 <Link2 className="w-3.5 h-3.5" /> GERAR E COPIAR LINK RASTREÁVEL
               </button>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button 
            onClick={handleSaveAndNext} 
            disabled={saving}
            className="btn-primary w-full h-16 text-lg font-black shadow-2xl shadow-brand-500/30 group disabled:opacity-70"
          >
            {saving ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <>
                SALVAR E PRÓXIMO <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          <button onClick={() => setCurrentIndex(prev => prev + 1)} className="w-full text-surface-500 hover:text-surface-300 text-xs font-medium py-4 transition-colors">
             Pular este lead por enquanto
          </button>
        </div>
      </div>
    </div>
  )
}
