import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, ArrowLeft, Phone, CheckCircle, RefreshCw, Mic, Square, Trash2 } from 'lucide-react'
import { createLead, getPlatforms, addAudioActivity } from '../api/client'
import toast from 'react-hot-toast'
import { maskPhone } from '../utils/masks'

export default function SDRLeadForm() {
  const navigate = useNavigate()
  const [platforms, setPlatforms] = useState([])
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', platform_id: '', notes: '' })

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    getPlatforms().then(r => setPlatforms(r.data || []))
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

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

  const discardAudio = () => {
    setAudioBlob(null)
    setRecordingTime(0)
  }

  const formatTime = sec => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    if (!form.phone.trim()) return toast.error('Telefone é obrigatório')
    if (!form.platform_id) return toast.error('Selecione a plataforma')
    setSaving(true)
    try {
      const res = await createLead(form)
      const newLeadId = res.data?.id

      // Upload audio if exists
      if (audioBlob && newLeadId) {
        const fd = new FormData()
        fd.append('audio', audioBlob, 'audio.webm')
        await addAudioActivity(newLeadId, fd)
      }

      setSent(true)
    } catch {}
    setSaving(false)
  }

  const reset = () => {
    setForm({ name: '', phone: '', platform_id: '', notes: '' })
    setAudioBlob(null)
    setRecordingTime(0)
    setSent(false)
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-black text-surface-100">Lead Registrado!</h1>
        <p className="text-surface-400">
          {audioBlob ? 'Lead + áudio salvos na fila de triagem.' : 'O lead entrou na sua fila de triagem.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary text-base py-3 px-6">
            <Zap className="w-4 h-4" /> Registrar Outro
          </button>
          <button onClick={() => navigate('/sdr-inbox')} className="btn-secondary text-base py-3 px-6">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Inbox
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sdr-inbox')} className="w-9 h-9 rounded-xl bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Novo Lead</h1>
          <p className="text-surface-500 text-sm">Cadastro rápido para triagem</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="label">Nome do cliente *</label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Nome completo"
              className="input text-lg"
              autoFocus
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Telefone / WhatsApp *
            </label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({...f, phone: maskPhone(e.target.value)}))}
              placeholder="(11) 99999-9999"
              className="input text-lg font-mono"
              type="tel"
            />
          </div>

          {/* Plataforma — botões grandes para toque rápido */}
          <div>
            <label className="label">De onde veio? *</label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.filter(p => p.active).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set('platform_id')({ target: { value: String(p.id) } })}
                  className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border text-sm font-bold transition-all ${
                    String(form.platform_id) === String(p.id)
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400 shadow-lg shadow-brand-500/10'
                      : 'border-surface-700 bg-surface-800/50 text-surface-300 hover:border-surface-600'
                  }`}
                >
                  <span className="text-lg">{p.icon}</span> {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nota rápida + Áudio */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Nota rápida (opcional)</label>
            <span className="text-[10px] text-surface-600">Texto ou áudio</span>
          </div>

          <textarea
            value={form.notes}
            onChange={set('notes')}
            placeholder="Ex: Perguntou sobre preço, está comparando..."
            rows={2}
            className="input resize-none text-sm"
          />

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
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all"
                  >
                    <Mic className="w-4 h-4" /> Gravar Áudio
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold animate-pulse"
                  >
                    <Square className="w-4 h-4" /> Parar Gravação
                  </button>
                )}
                <p className="text-[10px] text-surface-600">
                  {isRecording ? 'Gravando... clique para parar' : 'O Closer irá ouvir o áudio ao receber o lead'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10" />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-green-400 font-semibold">✓ Áudio pronto para envio</p>
                  <button
                    type="button"
                    onClick={discardAudio}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Descartar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-lg transition-all shadow-lg shadow-brand-600/30 disabled:opacity-60"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          {saving ? 'Salvando...' : (audioBlob ? '🎙️ Registrar Lead + Áudio' : 'Registrar Lead')}
        </button>
      </form>
    </div>
  )
}
