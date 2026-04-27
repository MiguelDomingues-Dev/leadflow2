import { useState, useEffect } from 'react'
import { CalendarClock, RefreshCw, Phone, ChevronRight } from 'lucide-react'
import { getLeads, getStatuses } from '../api/client'
import toast from 'react-hot-toast'
import { formatForDisplay, isToday, isOverdue } from '../utils/date'
import { useNavigate } from 'react-router-dom'

export default function Agenda() {
  const [leads, setLeads]       = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [l, s] = await Promise.all([getLeads({ per_page: 1000 }), getStatuses()])
        const hoje = new Date(); hoje.setHours(0,0,0,0)
        const comAgenda = l.data
          .filter(lead => lead.next_contact)
          .sort((a,b) => new Date(a.next_contact) - new Date(b.next_contact))
        setLeads(comAgenda); setStatuses(s.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const getStatusObj = id => statuses.find(s => String(s.id) === String(id))

  const sections = [
    { label:'⚠️ Atrasados', items: leads.filter(l => isOverdue(l.next_contact)), color:'text-red-400' },
    { label:'📅 Hoje',       items: leads.filter(l => isToday(l.next_contact)),     color:'text-amber-400' },
    { label:'📆 Próximos',   items: leads.filter(l => !isOverdue(l.next_contact) && !isToday(l.next_contact)), color:'text-surface-300' },
  ]

  const pendingLeads = sections[0].items.length + sections[1].items.length

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Próximos Contatos</h1>
          <p className="text-surface-500 text-sm mt-1">Agenda de follow-up dos seus leads</p>
        </div>
        <button onClick={() => navigate('/foco')} className="btn-primary py-3 px-6 shadow-xl shadow-brand-500/30 group">
          <span className="flex items-center gap-2 text-base font-black">
            <span className={`w-2.5 h-2.5 rounded-full ${pendingLeads > 0 ? 'bg-white animate-pulse' : 'bg-surface-400'}`} />
            ENTRAR NO MODO WAR ROOM ({pendingLeads})
          </span>
        </button>
      </div>

      {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-5 h-5 text-brand-500 animate-spin" /></div>
      : leads.length === 0 ? (
        <div className="card p-12 flex flex-col items-center text-surface-500 gap-3">
          <CalendarClock className="w-12 h-12 opacity-30" />
          <p className="text-sm">Nenhum contato agendado</p>
          <p className="text-xs text-surface-600">Defina uma data de próximo contato nos seus leads</p>
        </div>
      ) : (
        sections.map(sec => sec.items.length === 0 ? null : (
          <div key={sec.label}>
            <p className={`text-sm font-semibold mb-3 ${sec.color}`}>{sec.label} ({sec.items.length})</p>
            <div className="space-y-2">
              {sec.items.map(l => {
                const st = getStatusObj(l.status_id)
                return (
                  <div key={l.id} onClick={(e) => {
                      if (e.target.closest('a')) return;
                      navigate('/meus-leads', { state: { selectedLead: l.id } })
                    }}
                    className="w-full card p-4 text-left hover:border-surface-700 transition-all flex flex-col md:flex-row md:items-center gap-3 md:gap-4 cursor-pointer relative">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-surface-100 text-sm truncate">{l.name}</p>
                        <p className={`md:hidden text-xs font-semibold ${isOverdue(l.next_contact) ? 'text-red-400' : isToday(l.next_contact) ? 'text-amber-400' : 'text-surface-300'}`}>
                          {formatForDisplay(l.next_contact)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <a href={`tel:${l.phone}`} className="text-surface-400 hover:text-surface-200 text-xs font-mono flex items-center gap-1 w-fit transition-colors">
                          <Phone className="w-3.5 h-3.5" /> {l.phone}
                        </a>
                        {st && <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ color: st.color, backgroundColor: st.color + '18' }}>{st.name}</span>}
                      </div>
                    </div>
                    <div className="hidden md:block text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${isOverdue(l.next_contact) ? 'text-red-400' : isToday(l.next_contact) ? 'text-amber-400' : 'text-surface-300'}`}>
                        {formatForDisplay(l.next_contact)}
                      </p>
                      <p className="text-surface-500 text-[10px] mt-0.5">{l.platform_icon} {l.platform_name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-surface-600 flex-shrink-0 absolute right-4 top-1/2 -translate-y-1/2 md:static md:translate-y-0" />
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
