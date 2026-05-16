import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, UserPlus, Stethoscope, X, LogOut, User, Lightbulb,
         ClipboardList, UtensilsCrossed, Droplets, TrendingUp, FileText,
         Milestone, Syringe, BookUser, MessageSquareQuote } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { isDoctor } from '../../lib/utils'

const DOCTOR_TABS = [
  { id: 'cadastro',  label: 'Cadastro',         icon: ClipboardList   },
  { id: 'diario',   label: 'Diário Alimentar', icon: UtensilsCrossed },
  { id: 'fezes',    label: 'Fezes',             icon: Droplets        },
  { id: 'graficos', label: 'Gráficos',          icon: TrendingUp      },
  { id: 'receitas', label: 'Receitas',          icon: FileText        },
  { id: 'dicas',    label: 'Dicas',             icon: Lightbulb       },
  { id: 'marcos',   label: 'Marcos',            icon: Milestone       },
  { id: 'vacinas',  label: 'Vacinas',           icon: Syringe         },
]

const PARENT_TABS = [
  { id: 'cadastro',  label: 'Cadastro',  icon: ClipboardList   },
  { id: 'refeicoes', label: 'Refeições', icon: UtensilsCrossed },
  { id: 'fezes',     label: 'Fezes',     icon: Droplets        },
  { id: 'receitas',  label: 'Receitas',  icon: FileText        },
  { id: 'dicas',     label: 'Dicas',     icon: Lightbulb       },
  { id: 'marcos',    label: 'Marcos',    icon: Milestone       },
  { id: 'vacinas',   label: 'Vacinas',   icon: Syringe         },
]

export default function Sidebar({ onClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile, signOut } = useAuth()
  const isMedico  = isDoctor(profile?.role)

  // Detecta contexto para exibir seções contextuais
  const patientMatch = location.pathname.match(/^\/dashboard\/pacientes\/([^/]+)$/)
  const patientId    = patientMatch?.[1] ?? null
  const isDiario     = location.pathname === '/diario'

  // Aba ativa vem do query param ?tab=...
  const activeTab = new URLSearchParams(location.search).get('tab') || 'cadastro'

  const goTab = (tabId) => {
    if (patientId) navigate(`/dashboard/pacientes/${patientId}?tab=${tabId}`)
    else if (isDiario) navigate(`/diario?tab=${tabId}`)
    onClose?.()
  }

  const contextTabs = patientId ? DOCTOR_TABS : isDiario ? PARENT_TABS : null

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Stethoscope size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">Gastropediatria</p>
            <p className="text-[10px] text-slate-500 leading-tight">Diário Clínico</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="section-header px-2">Menu</p>

        {isMedico && (
          <>
            <NavLink to="/dashboard" end onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }>
              <Home size={18} /> Painel de Pacientes
            </NavLink>

            <button
              onClick={() => { navigate('/dashboard/pacientes/novo'); onClose?.() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <UserPlus size={18} /> Novo Paciente
            </button>

            <NavLink to="/dashboard/dicas" onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }>
              <Lightbulb size={18} /> Dicas &amp; Orientações
            </NavLink>

            <NavLink to="/dashboard/depoimentos" onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }>
              <MessageSquareQuote size={18} /> Depoimentos
            </NavLink>
          </>
        )}

        {!isMedico && (
          <>
            {/* Link principal */}
            <NavLink to="/diario" end onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }>
              <Home size={18} /> Diário do Meu Filho
            </NavLink>

            {/* Sub-itens — aparecem diretamente abaixo quando está no diário */}
            {isDiario && PARENT_TABS.map(tab => {
              const Icon     = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => goTab(tab.id)}
                  className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-700 bg-blue-50'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}>
                  <Icon size={16} /> {tab.label}
                </button>
              )
            })}
          </>
        )}

        {/* ── Seções do médico (aparece dentro de um paciente) ── */}
        {patientId && (
          <>
            <div className="pt-3 pb-1">
              <div className="h-px bg-slate-100 mb-3" />
              <p className="section-header px-2">Seções do Paciente</p>
            </div>
            {DOCTOR_TABS.map(tab => {
              const Icon     = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => goTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  <Icon size={18} /> {tab.label}
                </button>
              )
            })}
          </>
        )}
      </nav>

      {/* Currículo do médico — link destacado */}
      <div className="px-3 pb-3">
        <div className="h-px bg-slate-100 mb-3" />
        <NavLink to="/curriculo" onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-teal-50 text-teal-700 border border-teal-100'
                : 'text-teal-600 hover:bg-teal-50'
            }`
          }>
          <BookUser size={18} />
          <div className="flex-1 min-w-0">
            <span>Currículo do Médico</span>
          </div>
        </NavLink>
      </div>

      {/* User info + logout */}
      <div className="border-t border-slate-100 px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <User size={16} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{profile?.full_name ?? '—'}</p>
            <p className="text-xs text-slate-400">{isMedico ? 'Médico' : 'Responsável'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  )
}
