import { useState, useEffect } from 'react'
import { getLeads, getStatuses } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Phone, MessageSquare, ChevronRight, RefreshCw, ArrowLeft, Target } from 'lucide-react'

export default function FocusMode() {
  const [leads, setLeads] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const navigate = useNavigate()
  
  useEffect(() => {
    const load = async () => {
      try {
        const [l, s] = await Promise.all([getLeads({ per_page: 500 }), getStatuses()])
        const hoje = new Date(); hoje.setHours(0,0,0,0)
        
        const data = Array.isArray(l.data) ? l.data : (l.data.data || [])
        const pending = data
          .filter(lead => {
             if (!lead.next_contact) return false;
             const dt = new Date(lead.next_contact + 'T12:00:00');
             return dt <= hoje;
          })
          .sort((a,b) => new Date(a.next_contact) - new Date(b.next_contact))
          
        setLeads(pending)
        setStatuses(s.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

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

  const handleNext = () => setCurrentIndex(prev => prev + 1)
  
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
        
        <div className="bg-surface-900 rounded-xl p-5 text-sm space-y-3 border border-surface-800/50 shadow-inner">
          <div className="flex justify-between items-center">
             <span className="text-surface-500">Agendado para</span>
             <span className="font-bold text-amber-400">{new Date(lead.next_contact + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-surface-500">Origem</span>
             <span className="text-surface-200">{lead.platform_icon} {lead.platform_name || '—'}</span>
          </div>
          {lead.interest && (
             <div className="pt-3 mt-3 border-t border-surface-800/50">
               <span className="text-surface-500 block mb-1">Interesse</span>
               <span className="text-surface-200 leading-relaxed">{lead.interest}</span>
             </div>
          )}
        </div>

        <div className="pt-2">
          <button onClick={() => navigate('/meus-leads', { state: { selectedLead: lead.id } })} className="btn-secondary w-full mb-3 text-sm font-medium h-11">
             Ver Histórico Completo
          </button>
          <button onClick={handleNext} className="btn-primary w-full h-14 text-base font-bold shadow-lg shadow-brand-500/20">
             Próximo Lead <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
