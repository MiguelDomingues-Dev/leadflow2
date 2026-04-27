import { useState, useEffect } from 'react'
import { PackageSearch, Plus, Search, Edit2, Trash2, Check, X, RefreshCw } from 'lucide-react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/client'
import toast from 'react-hot-toast'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', active: 1 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await getProducts()
      setProducts(res.data || [])
    } catch {}
    setLoading(false)
  }

  const handleOpenNew = () => {
    setEditingProduct(null)
    setForm({ name: '', price: '', active: 1 })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    setEditingProduct(p)
    setForm({ name: p.name, price: p.price, active: p.active })
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    if (!form.price) return toast.error('Preço é obrigatório')
    
    setSaving(true)
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, form)
        toast.success('Produto atualizado!')
      } else {
        await createProduct(form)
        toast.success('Produto criado!')
      }
      setIsModalOpen(false)
      load()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir este produto?')) return
    try {
      await deleteProduct(id)
      toast.success('Produto excluído')
      load()
    } catch {}
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-brand-400" /> Catálogo de Produtos
          </h1>
          <p className="text-surface-400 text-sm mt-1">Gerencie os produtos para as vendas</p>
        </div>
        <button onClick={handleOpenNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-surface-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto..." className="input pl-9" 
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-brand-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-surface-500">Nenhum produto encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-800/50 text-surface-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Nome do Produto</th>
                  <th className="px-6 py-4">Preço (R$)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-surface-200">{p.name}</td>
                    <td className="px-6 py-4 text-surface-300 font-mono">
                      R$ {parseFloat(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {p.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold">
                          <Check className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-700/50 text-surface-400 text-xs font-bold">
                          <X className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(p)} className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-brand-400 hover:bg-surface-700 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg bg-surface-800 text-surface-400 hover:text-red-400 hover:bg-surface-700 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-surface-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-surface-100">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-surface-500 hover:text-surface-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <form id="productForm" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">Nome do Produto *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" autoFocus />
                </div>
                <div>
                  <label className="label">Preço (R$) *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="input" placeholder="0.00" />
                </div>
                {editingProduct && (
                  <div>
                    <label className="label">Status</label>
                    <select value={form.active} onChange={e => setForm({...form, active: parseInt(e.target.value)})} className="input">
                      <option value={1}>Ativo</option>
                      <option value={0}>Inativo</option>
                    </select>
                  </div>
                )}
              </form>
            </div>
            
            <div className="p-5 border-t border-surface-800 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary py-2.5">Cancelar</button>
              <button type="submit" form="productForm" disabled={saving} className="flex-1 btn-primary py-2.5">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
