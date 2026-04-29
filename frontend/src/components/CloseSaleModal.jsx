import { useState, useEffect } from 'react'
import { CheckCircle, X, ShoppingCart, User, Plus, Trash2, Zap, CreditCard } from 'lucide-react'
import { getProducts, createSale } from '../api/client'
import toast from 'react-hot-toast'
import { maskCPF, maskCEP } from '../utils/masks'

export default function CloseSaleModal({ lead, onClose, onSuccess }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Sale details
  const [items, setItems] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  
  // Billing info
  const [billing, setBilling] = useState({
    full_name: lead.name || '',
    cpf: '', address: '', city: '', state: '', zipcode: ''
  })
  
  // Search
  const [productSearch, setProductSearch] = useState('')
  const [showProductList, setShowProductList] = useState(false)
  
  // Payment info
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [installments, setInstallments] = useState(1)
  const [overallDiscount, setOverallDiscount] = useState('')
  const [shippingCost, setShippingCost] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderNotes, setReminderNotes] = useState('')
  const [observations, setObservations] = useState('')

  useEffect(() => {
    getProducts().then(res => {
      setProducts((res.data || []).filter(p => p.active))
      setLoading(false)
    })
  }, [])

  const handleAddItem = (prod) => {
    if (!prod) return
    setItems(prev => [...prev, { product_id: prod.id, product_name: prod.name, unit_price: prod.price, quantity: 1, discount: 0, is_freebie: false }])
    setProductSearch('')
    setShowProductList(false)
  }

  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateQty = (idx, q) => {
    const qty = Math.floor(parseInt(q) || 1)
    if (qty < 1) return
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item))
  }

  const handleUpdateItemDiscount = (idx, disc) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, discount: parseFloat(disc) || 0 } : item))
  }

  const handleToggleFreebie = (idx) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, is_freebie: !item.is_freebie } : item))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (items.length === 0) return toast.error('Adicione pelo menos 1 produto')
    if (!billing.cpf || !billing.address) return toast.error('Preencha CPF e Endereço para faturamento')
    
    setSaving(true)
    try {
      await createSale({
        lead_id: lead.id,
        items,
        billing_info: billing,
        payment_method: paymentMethod,
        installments: parseInt(installments) || 1,
        discount: parseFloat(overallDiscount) || 0,
        shipping_cost: parseFloat(shippingCost) || 0,
        amount_paid: parseFloat(amountPaid) || 0,
        reminder_date: reminderDate,
        reminder_notes: reminderNotes,
        observations
      })
      toast.success('Venda concluída e enviada ao faturamento!')
      onSuccess()
    } catch {
      toast.error('Erro ao salvar venda')
    }
    setSaving(false)
  }

  const total = items.reduce((acc, item) => acc + (item.is_freebie ? 0 : parseFloat(item.unit_price) * item.quantity), 0)
  const totalItemDiscounts = items.reduce((acc, item) => acc + (item.is_freebie ? 0 : parseFloat(item.discount || 0)), 0)
  const finalTotal = Math.max(0, total - totalItemDiscounts - (parseFloat(overallDiscount) || 0) + (parseFloat(shippingCost) || 0))
  const remainingBalance = Math.max(0, finalTotal - (parseFloat(amountPaid) || 0))

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-surface-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-brand-500" /> Fechar Venda
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">Cliente: <span className="font-bold text-surface-200">{lead.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-surface-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Sessão 1: Produtos */}
          <div>
            <h3 className="text-sm font-bold text-surface-300 uppercase tracking-wide flex items-center gap-2 mb-3">
              <ShoppingCart className="w-4 h-4 text-surface-500" /> Produtos Vendidos
            </h3>
            
            <div className="relative mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowProductList(true) }}
                    onFocus={() => setShowProductList(true)}
                    placeholder="🔍 Digite o nome do produto para buscar..."
                    className="input w-full"
                  />
                  {showProductList && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-surface-800 border border-surface-700 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                      {(() => {
                        const filtered = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        if (filtered.length === 0) return <div className="p-4 text-center text-surface-500 text-sm italic">Nenhum produto encontrado</div>
                        return filtered.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAddItem(p)}
                            className="w-full text-left px-4 py-3 hover:bg-surface-700 border-b border-surface-700 last:border-0 transition-colors"
                          >
                            <p className="font-bold text-surface-100">{p.name}</p>
                            <p className="text-xs text-brand-400 font-mono">R$ {parseFloat(p.price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                          </button>
                        ))
                      })()}
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setShowProductList(!showProductList)}
                  className="btn-secondary whitespace-nowrap"
                >
                  Ver Lista
                </button>
              </div>
              {showProductList && (
                <div className="fixed inset-0 z-40" onClick={() => setShowProductList(false)} />
              )}
            </div>

            {items.length > 0 ? (
              <>
              <div className="border border-surface-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-800/50 text-surface-400">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3 w-28 text-center">Qtd</th>
                      <th className="px-4 py-3 text-right w-32">Preço Un.</th>
                      <th className="px-4 py-3 text-right w-36">Desc. R$</th>
                      <th className="px-4 py-3 text-center w-20">Brinde</th>
                      <th className="px-4 py-3 text-right w-40">Total</th>
                      <th className="px-4 py-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {items.map((item, idx) => {
                      const itemTotal = item.is_freebie ? 0 : Math.max(0, (item.unit_price * item.quantity) - (item.discount || 0))
                      return (
                      <tr key={idx} className={item.is_freebie ? "bg-brand-500/5" : ""}>
                        <td className="px-4 py-3 font-medium text-surface-200">
                          {item.product_name}
                          {item.is_freebie && <span className="ml-2 text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded uppercase font-bold">Brinde</span>}
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" min="1" step="1" value={item.quantity} 
                            onChange={e => handleUpdateQty(idx, e.target.value)}
                            className="input !py-1 px-2 h-8 w-20 text-center"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-surface-400">
                          {parseFloat(item.unit_price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" min="0" step="0.01" value={item.discount || ''} 
                            onChange={e => handleUpdateItemDiscount(idx, e.target.value)}
                            disabled={item.is_freebie}
                            className="input !py-1 px-2 h-8 w-28 text-right disabled:opacity-30"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={item.is_freebie} 
                            onChange={() => handleToggleFreebie(idx)}
                            className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-brand-500 focus:ring-brand-500/20"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-400">
                          R$ {itemTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              {/* Resumo Financeiro da Tabela */}
              <div className="mt-4 flex flex-col items-end space-y-2 px-2">
                <div className="flex justify-between w-full max-w-xs text-sm">
                  <span className="text-surface-400 uppercase font-bold tracking-wider">Subtotal:</span>
                  <span className="text-surface-200 font-mono font-bold">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                
                {parseFloat(overallDiscount) > 0 && (
                  <div className="flex justify-between w-full max-w-xs text-sm">
                    <span className="text-red-400 uppercase font-bold tracking-wider italic">Desconto Geral:</span>
                    <span className="text-red-400 font-mono font-bold">- R$ {parseFloat(overallDiscount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                )}
                
                {parseFloat(shippingCost) > 0 && (
                  <div className="flex justify-between w-full max-w-xs text-sm">
                    <span className="text-blue-400 uppercase font-bold tracking-wider">Frete:</span>
                    <span className="text-blue-400 font-mono font-bold">+ R$ {parseFloat(shippingCost).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                )}

                <div className="flex justify-between w-full max-w-xs pt-2 border-t border-surface-700">
                  <span className="text-surface-100 uppercase font-black tracking-widest text-base">Valor Final:</span>
                  <span className="text-emerald-400 font-mono font-black text-2xl tracking-tighter">
                    R$ {finalTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </span>
                </div>
              </div>
              </>
            ) : (
              <div className="text-center py-6 border border-dashed border-surface-700 rounded-xl text-surface-500 text-sm">
                Nenhum produto adicionado à venda.
              </div>
            )}
          </div>

          {/* Sessão 1.5: Pagamento e Negociação */}
          <div>
            <h3 className="text-sm font-bold text-surface-300 uppercase tracking-wide flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-surface-500" /> Pagamento e Negociação
            </h3>
            <div className="card p-4 bg-surface-900 border border-surface-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="label">Forma de Pagamento *</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="transfer">Transferência Bancária</option>
                  </select>
                </div>
                
                {paymentMethod === 'credit_card' && (
                  <div>
                    <label className="label">Parcelas</label>
                    <select value={installments} onChange={e => setInstallments(e.target.value)} className="input">
                      {[...Array(12)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}x</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label">Desconto Extra (Geral R$)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={overallDiscount} 
                    onChange={e => setOverallDiscount(e.target.value)} 
                    placeholder="0.00" 
                    className="input font-mono w-full"
                  />
                </div>

                <div>
                  <label className="label">Valor do Frete (R$)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={shippingCost} 
                    onChange={e => setShippingCost(e.target.value)} 
                    placeholder="0.00" 
                    className="input font-mono border-blue-500/20 focus:border-blue-500/50 bg-blue-500/5"
                  />
                </div>
                
                <div className="md:col-span-4 border-t border-surface-800 pt-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label text-emerald-400 font-bold">Valor Pago Hoje (R$)</label>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={amountPaid} 
                        onChange={e => setAmountPaid(e.target.value)} 
                        placeholder={finalTotal.toFixed(2)} 
                        className="input font-mono border-emerald-500/30 focus:border-emerald-500/50 bg-emerald-500/5"
                      />
                    </div>
                    <div>
                      <label className="label text-brand-400 font-bold">Em Haver (R$)</label>
                      <div className="input font-mono bg-surface-950 text-brand-400 flex items-center">
                        R$ {remainingBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                    </div>
                  </div>
                </div>

                {remainingBalance > 0 && (
                  <div className="md:col-span-3 bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl space-y-4">
                    <h4 className="text-brand-400 font-bold text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Agendar Cobrança (Lembrete)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label text-brand-300">Data de Vencimento/Cobrança</label>
                        <input 
                          type="datetime-local" 
                          value={reminderDate}
                          onChange={e => setReminderDate(e.target.value)}
                          className="input border-brand-500/30"
                        />
                      </div>
                      <div>
                        <label className="label text-brand-300">Anotações do Lembrete</label>
                        <input 
                          type="text" 
                          value={reminderNotes}
                          onChange={e => setReminderNotes(e.target.value)}
                          placeholder="Ex: Cobrar segunda parcela..."
                          className="input border-brand-500/30"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="label">Observações sobre a Venda</label>
                <textarea 
                  value={observations} 
                  onChange={e => setObservations(e.target.value)} 
                  rows={2} 
                  className="input resize-none" 
                  placeholder="Ex: Cliente quer que a nota seja emitida em nome da empresa X..." 
                />
              </div>
            </div>
          </div>

          {/* Sessão 2: Dados Sensíveis (Faturamento) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-surface-300 uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4 text-surface-500" /> Dados para Faturamento
              </h3>
              <span className="text-[10px] text-brand-400 font-bold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                CRIPTOGRAFADO END-TO-END
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nome Completo do Cliente *</label>
                <input 
                  value={billing.full_name} 
                  onChange={e => setBilling({...billing, full_name: e.target.value})}
                  className="input" 
                  placeholder="Nome completo para nota fiscal"
                />
              </div>
              <div>
                <label className="label">CPF do Cliente *</label>
                <input 
                  value={billing.cpf} 
                  onChange={e => setBilling({...billing, cpf: maskCPF(e.target.value)})}
                  className="input font-mono" 
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="label">CEP</label>
                <input 
                  value={billing.zipcode} 
                  onChange={e => setBilling({...billing, zipcode: maskCEP(e.target.value)})}
                  className="input font-mono" 
                  placeholder="00000-000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Endereço Completo de Entrega *</label>
                <input 
                  value={billing.address} 
                  onChange={e => setBilling({...billing, address: e.target.value})}
                  className="input" 
                  placeholder="Rua, Número, Complemento, Bairro"
                />
              </div>
              <div>
                <label className="label">Cidade *</label>
                <input 
                  value={billing.city} 
                  onChange={e => setBilling({...billing, city: e.target.value})}
                  className="input" 
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div>
                <label className="label">Estado (UF) *</label>
                <input 
                  value={billing.state} 
                  onChange={e => setBilling({...billing, state: e.target.value})}
                  className="input" 
                  placeholder="Ex: SP"
                />
              </div>
            </div>
            <p className="text-[10px] text-surface-500 mt-2">
              * Estes dados serão criptografados antes de salvar no banco e ficarão visíveis apenas para o setor de Faturamento para emissão da NF.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-800 flex gap-3 shrink-0 bg-surface-900">
          <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3">
            Cancelar Venda
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || items.length === 0} 
            className="flex-1 btn-primary bg-brand-600 hover:bg-brand-500 py-3 text-white disabled:opacity-50"
          >
            {saving ? <CheckCircle className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Confirmar e Enviar ao Faturamento
          </button>
        </div>

      </div>
    </div>
  )
}
