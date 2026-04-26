import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Save, ArrowLeft, Zap, CheckCircle, Link2, Copy, Check, ExternalLink } from 'lucide-react'
import { getLead, createLead, updateLead, getPlatforms, getVendors, getStatuses, generateTrackedLink } from '../api/client'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { formatForInput } from '../utils/date'

const FOLLOW_OPTIONS = [
  { value:'nao_acompanha', label:'Não acompanha' },
  { value:'menos_1_mes',   label:'Menos de 1 mês' },
  { value:'1_3_meses',     label:'1 a 3 meses' },
  { value:'3_6_meses',     label:'3 a 6 meses' },
  { value:'mais_6_meses',  label:'Mais de 6 meses' },
]

const BLANK = { name:'', phone:'', email:'', platform_id:'', vendor_id:'', specific_video:'', follow_time:'nao_acompanha', interest:'', notes:'', status_id:'', next_contact:'' }

// ── Admin form (with sidebar layout) ─────────────────────────
export function LeadForm() {
  const { id } = useParams()
  const isEdit  = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm]           = useState(BLANK)
  const [platforms, setPlatforms] = useState([])
  const [vendors, setVendors]     = useState([])
  const [statuses, setStatuses]   = useState([])
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    const load = async () => {
      const [p, v, s] = await Promise.all([getPlatforms(), getVendors(), getStatuses()])
      setPlatforms(p.data); setVendors(v.data); setStatuses(s.data)
      if (isEdit) {
        const l = await getLead(id)
        const data = l.data
        data.next_contact = formatForInput(data.next_contact)
        setForm({ ...BLANK, ...data, status_id: String(data.status_id || '') })
      }
    }
    load()
  }, [id, isEdit])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    if (!form.phone.trim()) return toast.error('Telefone é obrigatório')
    if (!form.platform_id) return toast.error('Selecione a plataforma de origem')
    setSaving(true)
    try {
      const payload = { ...form, status_id: form.status_id ? Number(form.status_id) : undefined }
      if (isEdit) { await updateLead(id, payload); toast.success('Lead atualizado!') }
      else { await createLead(payload); toast.success('Lead registrado!') }
      navigate('/leads')
    } catch {}
    setSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/leads" className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Editar Lead' : 'Novo Lead'}</h1>
          <p className="text-surface-500 text-sm">Preencha os dados do cliente</p>
        </div>
      </div>
      <FormBody form={form} set={set} setForm={setForm} platforms={platforms} vendors={vendors} statuses={statuses}
        saving={saving} onSubmit={handleSubmit} isEdit={isEdit} showVendor={true} showStatus={isEdit} leadId={id} />
    </div>
  )
}

// ── Vendor Collector (standalone, no sidebar) ─────────────────
export function Collector() {
  const [form, setForm]           = useState(BLANK)
  const [platforms, setPlatforms] = useState([])
  const [vendors, setVendors]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [sent, setSent]           = useState(false)

  useEffect(() => {
    const load = async () => {
      const [p, v] = await Promise.all([getPlatforms(), getVendors()])
      setPlatforms(p.data); setVendors(v.data)
    }
    load()
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    if (!form.phone.trim()) return toast.error('Telefone é obrigatório')
    if (!form.platform_id) return toast.error('Selecione de onde o cliente veio')
    setSaving(true)
    try {
      await createLead(form)
      setSent(true)
      setForm(BLANK)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6"
      style={{ backgroundImage:'radial-gradient(ellipse at 20% 0%, rgba(217,70,239,0.08) 0%, transparent 60%)' }}>
      <Toaster position="top-right" toastOptions={{ style:{ background:'#1e293b', color:'#f1f5f9', border:'1px solid #334155', borderRadius:'12px', fontSize:'14px' } }} />

      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Registrar Lead</h1>
          <p className="text-surface-500 text-sm mt-1">Preencha os dados do cliente</p>
        </div>

        {sent ? (
          <div className="card p-8 text-center space-y-4">
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto" />
            <h2 className="text-xl font-bold text-surface-100">Lead Registrado!</h2>
            <p className="text-surface-400">Os dados foram salvos com sucesso.</p>
            <button onClick={() => setSent(false)} className="btn-primary mx-auto">+ Registrar outro</button>
          </div>
        ) : (
          <div className="card p-6">
            <FormBody form={form} set={set} setForm={setForm} platforms={platforms} vendors={vendors} statuses={[]}
              saving={saving} onSubmit={handleSubmit} isEdit={false} showVendor={true} showStatus={false}
              submitLabel="✓ Registrar Lead" />
          </div>
        )}

        <p className="text-center text-surface-600 text-xs">LeadFlow · Formulário exclusivo para vendedores</p>
      </div>
    </div>
  )
}

// ── Shared form body ──────────────────────────────────────────
function FormBody({ form, set, setForm, platforms, vendors, statuses, saving, onSubmit, isEdit, showVendor, showStatus, submitLabel, leadId }) {
  const [generating, setGenerating] = useState(false)
  const [trackedLink, setTrackedLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerateLink = async () => {
    if (!form.specific_video) return toast.error('Insira o link do vídeo primeiro')
    setGenerating(true)
    try {
      const res = await generateTrackedLink({ lead_id: leadId, url: form.specific_video })
      // Use the current origin + the tracked path from backend
      const fullUrl = `${window.location.origin.replace('5173', '4031')}${res.data.tracked_url}`
      setTrackedLink(fullUrl)
      toast.success('Link rastreável gerado!')
    } catch {}
    setGenerating(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(trackedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Cliente */}
      <div className="card p-5 space-y-4">
        <h2 className="text-surface-100 font-semibold text-xs uppercase tracking-wider">Dados do Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome completo *</label>
            <input value={form.name} onChange={set('name')} placeholder="Nome do cliente" className="input" />
          </div>
          <div>
            <label className="label">Telefone / WhatsApp *</label>
            <input value={form.phone} onChange={set('phone')} placeholder="(11) 99999-9999" className="input" />
          </div>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" value={form.email || ''} onChange={set('email')} placeholder="email@exemplo.com" className="input" />
        </div>
      </div>

      {/* Origem */}
      <div className="card p-5 space-y-4">
        <h2 className="text-surface-100 font-semibold text-xs uppercase tracking-wider">Origem do Lead</h2>
        <div>
          <label className="label">Plataforma de origem *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {platforms.filter(p => p.active).map(p => (
              <button key={p.id} type="button"
                onClick={() => set('platform_id')({ target: { value: String(p.id) } })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${String(form.platform_id) === String(p.id) ? 'border-brand-500 bg-brand-500/10 text-brand-400' : 'border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-600'}`}>
                <span>{p.icon}</span> {p.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Vídeo específico que assistiu?</label>
          <div className="flex gap-2">
            <input value={form.specific_video || ''} onChange={set('specific_video')} placeholder="Ex: 'Como organizar estoque' ou link do vídeo" className="input" />
            {isEdit && (
              <button type="button" onClick={handleGenerateLink} disabled={generating}
                className="btn-secondary px-3" title="Gerar link rastreável">
                <Link2 className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          {trackedLink && (
            <div className="mt-2 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider mb-1">Link Rastreável Gerado</p>
                <p className="text-xs text-surface-200 truncate font-mono">{trackedLink}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <a href={trackedLink} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-brand-500/20 rounded-lg text-brand-400 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button type="button" onClick={copyToClipboard} className="p-2 hover:bg-brand-500/20 rounded-lg text-brand-400 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="label">Há quanto tempo acompanha?</label>
          <select value={form.follow_time} onChange={set('follow_time')} className="input">
            {FOLLOW_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Extra */}
      <div className="card p-5 space-y-4">
        <h2 className="text-surface-100 font-semibold text-xs uppercase tracking-wider">Informações Adicionais</h2>
        <div>
          <label className="label">Interesse / O que busca?</label>
          <input value={form.interest || ''} onChange={set('interest')} placeholder="Ex: Quer melhorar o controle de estoque..." className="input" />
        </div>
        {showVendor && (
          <div>
            <label className="label">Vendedor responsável</label>
            <select value={form.vendor_id || ''} onChange={set('vendor_id')} className="input">
              <option value="">Selecionar vendedor...</option>
              {vendors.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
        {showStatus && statuses.length > 0 && (
          <div>
            <label className="label">Status</label>
            <select value={form.status_id || ''} onChange={set('status_id')} className="input">
              <option value="">Selecionar status...</option>
              {statuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Próximo contato</label>
          <input type="date" value={form.next_contact || ''} onChange={set('next_contact')} className="input" />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea value={form.notes || ''} onChange={set('notes')} rows={3} placeholder="Anotações importantes sobre o lead..." className="input resize-none" />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : (submitLabel || (isEdit ? 'Atualizar' : 'Registrar Lead'))}
        </button>
      </div>
    </form>
  )
}
