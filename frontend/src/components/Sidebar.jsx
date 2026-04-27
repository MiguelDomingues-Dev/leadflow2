import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, BarChart3, Megaphone, UserCheck, ChevronRight, Zap, LogOut, Settings, Shield, Tag, ClipboardList, CalendarClock, PlusCircle, User, Menu, PackageSearch, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { logout, getLeads } from '../api/client'
import toast from 'react-hot-toast'

const adminLinks = [
  { to:'/',           label:'Dashboard',       icon:LayoutDashboard },
  { to:'/leads',      label:'Todos os Leads',  icon:Users },
  { to:'/analytics',  label:'Analytics',       icon:BarChart3 },
  { to:'/audit',      label:'Auditoria',       icon:ClipboardList },
  { divider:true, label:'Configurações' },
  { to:'/settings',   label:'Geral',           icon:Settings },
  { to:'/produtos',   label:'Produtos',        icon:PackageSearch },
  { to:'/platforms',  label:'Plataformas',     icon:Megaphone },
  { to:'/statuses',   label:'Status dos Leads',icon:Tag },
  { to:'/vendors',    label:'Vendedores',      icon:UserCheck },
  { to:'/users',      label:'Usuários',        icon:Shield },
]
export default function Sidebar() {
  const loc = useLocation(); const navigate = useNavigate()
  const { user, signout, isAdmin } = useAuth()
  
  const [delayedCount, setDelayedCount] = useState(0)

  useEffect(() => {
    if (!isAdmin && user) {
      getLeads({ per_page: 500 }).then(res => {
         const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
         const hoje = new Date(); hoje.setHours(0,0,0,0)
         const atrasados = data.filter(l => {
           if (!l.next_contact) return false;
           const dt = new Date(l.next_contact + 'T12:00:00');
           return dt < hoje;
         })
         setDelayedCount(atrasados.length)
      }).catch(() => {})
    }
  }, [isAdmin, user])

  const sdrLinks = [
    { to:'/sdr-inbox',  label:'Entrada de Leads', icon:Zap },
    { to:'/sdr-novo',   label:'Novo Lead',         icon:PlusCircle },
  ]
  const closerLinks = [
    { to:'/meus-leads', label:'Leads Quentes',    icon:ClipboardList },
    { to:'/agenda',     label:'Minha Agenda',     icon:CalendarClock, badge: delayedCount },
  ]
  const billingLinks = [
    { to:'/faturamento', label:'Fila de Faturamento', icon:FileText },
  ]

  let links = []
  if (isAdmin) links = adminLinks
  else if (user?.role === 'sdr') links = sdrLinks
  else if (user?.role === 'billing') links = billingLinks
  else links = closerLinks
  const handleLogout = async () => { try { await logout() } catch {} signout(); navigate('/login'); toast.success('Até logo!') }
  const isActive = to => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)
  return (
    <aside className="hidden md:flex w-64 h-full bg-surface-900 border-r border-surface-800 flex-col flex-shrink-0">
      <div className="p-5 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/25"><Zap className="w-4 h-4 text-white" /></div>
          <div><p className="font-bold text-surface-100 text-sm leading-none">LeadFlow</p><p className="text-xs text-surface-500 mt-0.5">{isAdmin ? 'Painel Admin' : (user?.role === 'sdr' ? 'Portal SDR' : user?.role === 'billing' ? 'Faturamento' : 'Portal Vendedor')}</p></div>
        </div>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {links.map((link, i) => {
          if (link.divider) return <div key={i} className="mt-4 mb-1 px-3"><p className="text-xs font-semibold text-surface-600 uppercase tracking-widest">{link.label}</p></div>
          const active = isActive(link.to); const Icon = link.icon
          return (
            <NavLink key={link.to} to={link.to} className={'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' + (active ? 'bg-brand-600/10 text-brand-400 border border-brand-600/20' : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800')}>
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{link.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {link.badge > 0 && <span className="bg-red-500 text-white text-[10px] leading-none font-bold px-1.5 py-0.5 rounded-full">{link.badge}</span>}
                {active && <ChevronRight className="w-3 h-3 opacity-50" />}
              </div>
            </NavLink>
          )
        })}
      </nav>
      <div className="p-3 border-t border-surface-800 space-y-1">
        <NavLink to="/perfil" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all">
          <Settings className="w-4 h-4" />
          <div className="flex-1 min-w-0"><p className="text-surface-200 font-medium truncate text-xs">{user?.name}</p><p className="text-surface-500 text-xs truncate">{user?.email}</p></div>
        </NavLink>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"><LogOut className="w-4 h-4" /> Sair</button>
      </div>
    </aside>
  )
}

export function BottomNav() {
  const loc = useLocation()
  const { user, isAdmin } = useAuth()
  const [delayedCount, setDelayedCount] = useState(0)

  useEffect(() => {
    if (!isAdmin && user) {
      getLeads({ per_page: 500 }).then(res => {
         const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
         const hoje = new Date(); hoje.setHours(0,0,0,0)
         const atrasados = data.filter(l => {
           if (!l.next_contact) return false;
           const dt = new Date(l.next_contact + 'T12:00:00');
           return dt < hoje;
         })
         setDelayedCount(atrasados.length)
      }).catch(() => {})
    }
  }, [isAdmin, user])
  
  const adminNav = [
    { to: '/', icon: LayoutDashboard, label: 'Início' },
    { to: '/leads', icon: Users, label: 'Leads' },
    { to: '/leads/new', icon: PlusCircle, isFab: true },
    { to: '/analytics', icon: BarChart3, label: 'Métricas' },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ]
  
  const sdrNav = [
    { to: '/sdr-inbox', icon: Zap, label: 'Inbox' },
    { to: '/sdr-novo', icon: PlusCircle, isFab: true },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ]
  
  const vendorNav = [
    { to: '/meus-leads', icon: ClipboardList, label: 'Quentes' },
    { to: '/agenda', icon: CalendarClock, label: 'Agenda', badge: delayedCount },
    { to: '/novo-lead', icon: PlusCircle, isFab: true },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ]
  
  const billingNav = [
    { to: '/faturamento', icon: FileText, label: 'Faturamento' },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ]

  let links = []
  if (isAdmin) links = adminNav
  else if (user?.role === 'sdr') links = sdrNav
  else if (user?.role === 'billing') links = billingNav
  else links = vendorNav
  const isActive = to => to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-900/90 backdrop-blur-lg border-t border-surface-800 z-50 flex items-center justify-around px-2">
      {links.map((link, i) => {
        const active = isActive(link.to)
        const Icon = link.icon
        if (link.isFab) {
          return (
            <NavLink key={i} to={link.to} className="relative -top-5 flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30 text-white border-4 border-surface-950">
                <Icon className="w-6 h-6" />
              </div>
            </NavLink>
          )
        }
        return (
          <NavLink key={i} to={link.to} className={`relative flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${active ? 'text-brand-400' : 'text-surface-500 hover:text-surface-300'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{link.label}</span>
            {link.badge > 0 && <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-md shadow-red-500/20">{link.badge}</span>}
          </NavLink>
        )
      })}
    </div>
  )
}
