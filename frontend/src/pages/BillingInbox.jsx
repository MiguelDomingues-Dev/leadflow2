import { useState, useEffect, useRef } from 'react'
import { FileText, CheckCircle, Search, RefreshCw, Send, Package, User, X, CreditCard, Paperclip, Trash2, Upload } from 'lucide-react'
import { getSales, getSaleDetails, updateSaleStatus, addSaleAttachment, deleteSaleAttachment } from '../api/client'
import { formatForDisplay } from '../utils/date'
import toast from 'react-hot-toast'

export default function BillingInbox() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pendente_faturamento')
  const [selectedSale, setSelectedSale] = useState(null)
  const [saleDetails, setSaleDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [uploadingAtt, setUploadingAtt] = useState(false)
  const fileInputRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getSales({ status: filter })
      setSales(res.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const openSale = async (s) => {
    setSelectedSale(s)
    setLoadingDetails(true)
    try {
      const res = await getSaleDetails(s.id)
      setSaleDetails(res.data)
    } catch {}
    setLoadingDetails(false)
  }

  const handleUpdateStatus = async (status) => {
    if (!selectedSale) return
    try {
      await updateSaleStatus(selectedSale.id, status)
      toast.success('Status da venda atualizado!')
      setSelectedSale(null)
      setSaleDetails(null)
      load()
    } catch {}
  }

  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedSale) return
    setUploadingAtt(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await addSaleAttachment(selectedSale.id, fd)
      toast.success('Anexo enviado!')
      openSale(selectedSale) // Refresh details
    } catch {}
    setUploadingAtt(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteAttachment = async (attId) => {
    if (!selectedSale) return
    if (!window.confirm('Excluir este anexo?')) return
    try {
      await deleteSaleAttachment(selectedSale.id, attId)
      toast.success('Anexo excluído')
      openSale(selectedSale) // Refresh details
    } catch {}
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 md:-m-7 overflow-hidden">
      {/* LEFT PANEL */}
      <div className={`flex flex-col ${selectedSale ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-shrink-0 border-r border-surface-800 bg-surface-950`}>
        <div className="p-5 border-b border-surface-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-surface-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Faturamento
              </h1>
              <p className="text-xs text-surface-500 mt-0.5">{sales.length} vendas nesta fila</p>
            </div>
            <button onClick={load} className="w-8 h-8 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-400 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setFilter('pendente_faturamento')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'pendente_faturamento' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-surface-800 text-surface-500 border border-surface-700'}`}>
              Pendentes
            </button>
            <button onClick={() => setFilter('faturado')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'faturado' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-surface-800 text-surface-500 border border-surface-700'}`}>
              Faturados
            </button>
            <button onClick={() => setFilter('enviado')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'enviado' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-surface-800 text-surface-500 border border-surface-700'}`}>
              Enviados
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin" /></div>
          ) : sales.length === 0 ? (
            <div className="text-center py-16 text-surface-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma venda aqui.</p>
            </div>
          ) : sales.map(s => (
            <button
              key={s.id}
              onClick={() => openSale(s)}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 group ${
                selectedSale?.id === s.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-surface-800 bg-surface-900/50 hover:border-surface-700 hover:bg-surface-800/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-surface-100 truncate">{s.lead_name}</p>
                  <p className="text-[10px] text-surface-500 mt-1">Closer: {s.vendor_name || 'Desconhecido'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-green-400 font-bold">R$ {parseFloat(s.total_amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  <p className="text-[10px] text-surface-600 mt-1">{formatForDisplay(s.created_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={`flex-1 h-full bg-surface-950 ${selectedSale ? 'block' : 'hidden md:flex md:items-center md:justify-center'}`}>
        {!selectedSale ? (
          <div className="text-center text-surface-600">
            <Package className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-lg text-surface-500">Selecione uma Venda</p>
            <p className="text-sm mt-1">Veja os dados do cliente para emitir a NF.</p>
          </div>
        ) : loadingDetails ? (
          <div className="flex justify-center h-full items-center"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin" /></div>
        ) : saleDetails ? (
          <div className="flex flex-col h-full">
            <div className="p-5 border-b border-surface-800 flex items-center justify-between bg-surface-900">
              <div>
                <p className="text-xs text-surface-500 font-bold tracking-wider uppercase mb-1">Detalhes da Venda #{saleDetails.id}</p>
                <h2 className="text-2xl font-black text-surface-100">R$ {parseFloat(saleDetails.total_amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
              </div>
              <button onClick={() => setSelectedSale(null)} className="md:hidden p-2 rounded-lg bg-surface-800 text-surface-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Cliente Sensível */}
              <div className="card p-5 border border-blue-500/20 bg-blue-500/5">
                <h3 className="font-bold text-blue-400 flex items-center gap-2 mb-4">
                  <User className="w-4 h-4" /> Dados de Faturamento (Descriptografados)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">Nome do Cliente</p>
                    <p className="font-bold text-surface-200">{saleDetails.lead_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">CPF</p>
                    <p className="font-mono text-surface-200 font-bold">{saleDetails.billing_info?.cpf || 'Não informado'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">Endereço Completo</p>
                    <p className="text-surface-300">
                      {saleDetails.billing_info?.address || 'Sem endereço'}, {saleDetails.billing_info?.city || 'Sem cidade'} - {saleDetails.billing_info?.state || 'Sem estado'}
                      <br/>
                      <span className="font-mono text-surface-400 text-xs mt-1 inline-block">CEP: {saleDetails.billing_info?.zipcode}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">Telefone / WhatsApp</p>
                    <p className="font-mono text-surface-300">{saleDetails.lead_phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">E-mail</p>
                    <p className="text-surface-300">{saleDetails.lead_email || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Itens Comprados */}
              <div>
                <h3 className="font-bold text-surface-300 mb-3 text-sm">Itens Vendidos</h3>
                <div className="space-y-2">
                  {saleDetails.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50 border border-surface-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300">
                          {item.quantity}x
                        </div>
                        <p className="font-bold text-surface-200">{item.product_name}</p>
                      </div>
                      <p className="font-mono text-surface-300 font-bold">R$ {parseFloat(item.total_price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações de Pagamento */}
              <div className="mt-6 pt-6 border-t border-surface-800">
                <h3 className="font-bold text-surface-300 mb-4 flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-surface-500" /> Pagamento e Negociação
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">Forma</p>
                    <p className="font-bold text-surface-200">
                      {saleDetails.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                       saleDetails.payment_method === 'boleto' ? 'Boleto' : 
                       saleDetails.payment_method === 'transfer' ? 'Transferência' : 'PIX'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">Parcelas</p>
                    <p className="font-bold text-surface-200">{saleDetails.installments}x</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">Desconto</p>
                    <p className="font-bold text-red-400">R$ {parseFloat(saleDetails.discount || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-surface-500">Valor Final</p>
                    <p className="font-mono text-emerald-400 font-bold text-lg">R$ {parseFloat(saleDetails.final_amount || saleDetails.total_amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
                {saleDetails.observations && (
                  <div className="mt-4 p-4 rounded-xl bg-surface-900 border border-surface-800">
                    <p className="text-[10px] uppercase tracking-wide text-surface-500 mb-1">Observações do Vendedor</p>
                    <p className="text-sm text-surface-300 italic">{saleDetails.observations}</p>
                  </div>
                )}
              </div>

              {/* Anexos */}
              <div className="mt-6 pt-6 border-t border-surface-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-surface-300 flex items-center gap-2 text-sm">
                    <Paperclip className="w-4 h-4 text-surface-500" /> Anexos e Comprovantes
                  </h3>
                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleUploadAttachment} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAtt} className="btn-secondary text-xs px-3 py-1.5 h-auto">
                      {uploadingAtt ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Anexar Arquivo
                    </button>
                  </div>
                </div>
                
                {(!saleDetails.attachments || saleDetails.attachments.length === 0) ? (
                  <div className="text-center py-6 bg-surface-900/50 rounded-xl border border-surface-800 border-dashed">
                    <p className="text-surface-500 text-sm">Nenhum anexo salvo para esta venda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {saleDetails.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-surface-900 border border-surface-700 rounded-xl">
                        <a href={(import.meta.env.VITE_API_URL || 'http://localhost:4031/api').replace('/api', '') + '/api/uploads/' + att.file_path} target="_blank" rel="noreferrer" className="flex items-center gap-2 flex-1 min-w-0 hover:text-brand-400 transition-colors">
                          <FileText className="w-5 h-5 text-surface-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-surface-200 truncate">{att.file_name}</p>
                            <p className="text-xs text-surface-500 mt-0.5">{new Date(att.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </a>
                        <button onClick={() => handleDeleteAttachment(att.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="p-5 border-t border-surface-800 flex gap-3">
              {saleDetails.status === 'pendente_faturamento' && (
                <button onClick={() => handleUpdateStatus('faturado')} className="flex-1 btn-primary bg-orange-600 hover:bg-orange-700 shadow-orange-600/20 py-3">
                  <FileText className="w-4 h-4" /> Marcar como Faturado (NF Emitida)
                </button>
              )}
              {saleDetails.status === 'faturado' && (
                <button onClick={() => handleUpdateStatus('enviado')} className="flex-1 btn-primary bg-green-600 hover:bg-green-700 shadow-green-600/20 py-3">
                  <Send className="w-4 h-4" /> Marcar como Enviado (Despachado)
                </button>
              )}
              {saleDetails.status === 'enviado' && (
                <div className="flex-1 py-3 text-center rounded-xl bg-surface-800 border border-surface-700 text-surface-400 font-bold flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Venda Totalmente Concluída
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
