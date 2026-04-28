import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, Clock, Bell, Trash2 } from 'lucide-react'
import { getReminders, updateReminderStatus, deleteReminder } from '../api/client'
import toast from 'react-hot-toast'

export default function Reminders() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReminders = async () => {
    try {
      const res = await getReminders({ status: 'pendente' })
      setReminders(res.data || [])
    } catch {
      toast.error('Erro ao buscar lembretes')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReminders()
  }, [])

  const handleMarkAsPaid = async (id) => {
    try {
      await updateReminderStatus(id, 'pago')
      toast.success('Marcado como pago!')
      fetchReminders()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lembrete?')) return
    try {
      await deleteReminder(id)
      toast.success('Removido com sucesso')
      fetchReminders()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-500" /> Lembretes de Pagamento
          </h1>
          <p className="text-surface-400 mt-1">
            Controle de saldos em haver e cobranças agendadas.
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-surface-500">Carregando...</div>
        ) : reminders.length === 0 ? (
          <div className="p-12 text-center text-surface-500 flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-3" />
            <p className="text-lg font-medium text-surface-300">Tudo limpo!</p>
            <p>Não há nenhum lembrete de pagamento pendente.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-800">
            {reminders.map(rem => {
              const isOverdue = new Date(rem.due_date) < new Date()
              return (
                <div key={rem.id} className="p-4 flex items-center justify-between hover:bg-surface-800/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl mt-1 ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-brand-500/10 text-brand-400'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-surface-200">
                        {rem.lead_name} <span className="text-sm font-normal text-surface-400 ml-2">{rem.lead_phone}</span>
                      </h3>
                      <p className="text-brand-400 font-mono font-black text-xl my-1">
                        R$ {parseFloat(rem.amount_due).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className={`flex items-center gap-1 font-semibold px-2 py-1 rounded border ${isOverdue ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-surface-800 border-surface-700 text-surface-400'}`}>
                          <Clock className="w-3.5 h-3.5" /> 
                          {new Date(rem.due_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          {isOverdue && ' (Atrasado)'}
                        </span>
                        {rem.notes && (
                          <span className="text-surface-400 italic flex items-center before:content-[''] before:w-1 before:h-1 before:bg-surface-600 before:rounded-full before:mr-2">
                            "{rem.notes}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleMarkAsPaid(rem.id)}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      title="Marcar como Pago"
                    >
                      <CheckCircle className="w-4 h-4" /> Baixar
                    </button>
                    <button 
                      onClick={() => handleDelete(rem.id)}
                      className="p-2 rounded-lg bg-surface-800 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      title="Excluir Lembrete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
