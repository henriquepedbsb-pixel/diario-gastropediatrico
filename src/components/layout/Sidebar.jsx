import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, UserPlus, Stethoscope, X, LogOut, User, Lightbulb,
         ClipboardList, UtensilsCrossed, Droplets, TrendingUp, FileText,
         Milestone, Syringe, BookUser, MessageSquareQuote,
         AlertTriangle, Moon, Baby, Calculator, Bell, FolderOpen, HelpCircle, MapPin,
         BarChart2, History, Sprout, Pill, Frown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { isDoctor } from '../../lib/utils'

const DOCTOR_TABS_MAIN = [
  { id: 'cadastro',       label: 'Cadastro',          icon: ClipboardList   },
  { id: 'diario',         label: 'Diário Alimentar',  icon: UtensilsCrossed },
  { id: 'fezes',          label: 'Fezes',             icon: Droplets        },
  { id: 'graficosfezes',  label: 'Gráficos de Fezes', icon: BarChart2       },
  { id: 'graficos',       label: 'Gráficos',          icon: TrendingUp      },
  { id: 'receitas',       label: 'Prescrições',       icon: FileText        },
  { id: 'vacinas',        label: 'Vacinas',           icon: Syringe         },
  { id: 'sintomas',       label: 'Sintomas',          icon: AlertTriangle   },
  { id: 'sono',           label: 'Sono',              icon: Moon            },
  { id: 'amamentacao',    label: 'Amamentação',       icon: Baby            },
  { id: 'idadecorrigida', label: 'Idade Corrigida',   icon: Calculator      },
  { id: 'alertas',        label: 'Alertas',           icon: Bell            },
  { id: 'documentos',     label: 'Documentos',        icon: FolderOpen      },
  { id: 'medicamentos',   label: 'Medicamentos',      icon: Pill            },
  { id: 'introducao',     label: 'Introdução Alim.',  icon: Sprout          },
  { id: 'choro',          label: 'Choro / Cólica',   icon: Frown           },
  { id: 'timeline',       label: 'Linha do Tempo',   icon: History         },
  { id: 'calculadora',    label: 'Calculadoras',      icon: Calculator      },
  { id: 'faq',            label: 'Dúvidas (FAQ)',     icon: HelpCircle      },
  { id: 'depoimentos',    label: 'Depoimentos',       icon: MessageSquareQuote, href: '/dashboard/depoimentos' },
]

const PARENT_TABS_MAIN = [
  { id: 'cadastro',       label: 'Cadastro',          icon: ClipboardList   },
  { id: 'refeicoes',      label: 'Refeições',         icon: UtensilsCrossed },
  { id: 'fezes',          label: 'Fezes',             icon: Droplets        },
  { id: 'graficosfezes',  label: 'Gráficos de Fezes', icon: BarChart2       },
  { id: 'receitas',       label: 'Prescrições',       icon: FileText        },
  { id: 'vacinas',        label: 'Vacinas',           icon: Syringe         },
  { id: 'sintomas',       label: 'Sintomas',          icon: AlertTriangle   },
  { id: 'sono',           label: 'Sono',              icon: Moon            },
  { id: 'amamentacao',    label: 'Amamentação',       icon: Baby            },
  { id: 'idadecorrigida', label: 'Idade Corrigida',   icon: Calculator      },
  { id: 'alertas',        label: 'Alertas',           icon: Bell            },
  { id: 'documentos',     label: 'Documentos',        icon: FolderOpen      },
  { id: 'medicamentos',   label: 'Medicamentos',      icon: Pill            },
  { id: 'introducao',     label: 'Introdução Alim.',  icon: Sprout          },
  { id: 'choro',          label: 'Choro / Cólica',   icon: Frown           },
  { id: 'timeline',       label: 'Linha do Tempo',   icon: History         },
  { id: 'calculadora',    label: 'Calculadoras',      icon: Calculator      },
  { id: 'faq',            label: 'Dúvidas (FAQ)',     icon: HelpCircle      },
  { id: 'depoimentos',    label: 'Depoimentos',       icon: MessageSquareQuote, href: '/depoimentos' },
]

const TABS_INSTRUCOES = [
  { id: 'marcos', label: 'Marcos do Desenvolvimento', icon: Milestone },
  { id: 'dicas',  label: 'Dicas',                     icon: Lightbulb },
]

export default function Sidebar({ onClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile, signOut } = useAuth()
  const isMedico  = isDoctor(profile?.role)

  const patientMatch = location.pathname.match(/^\/dashboard\/pacientes\/([^/]+)$/)
  const patientId    = patientMatch?.[1] ?? null
  const isDiario     = location.pathname === '/diario'

  const activeTab = new URLSearchParams(location.search).get('tab') || 'cadastro'

  const goTabDoctor = (tabId) => {
    navigate(`/dashboard/pacientes/${patientId}?tab=${tabId}`)
    onClose?.()
  }

  const goTabParent = (tabId) => {
    navigate(`/diario?tab=${tabId}`)
    onClose?.()
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const renderTab = (tab, onClickFn, indented = false) => {
    const Icon     = tab.icon
    const isActive = tab.href
      ? location.pathname === tab.href
      : activeTab === tab.id
    const handleClick = tab.href
      ? () => { navigate(tab.href); onClose?.() }
      : () => onClickFn(tab.id)
    return (
      <button key={tab.id} onClick={handleClick}
        className={`w-full flex items-center gap-3 ${indented ? 'pl-9 pr-3 py-2' : 'px-3 py-2.5'} rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700'
            : indented
            ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`}>
        <Icon size={indented ? 16 : 18} /> {tab.label}
      </button>
    )
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

          </>
        )}

        {!isMedico && (
          <>
            <NavLink to="/diario" end onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }>
              <Home size={18} /> Diário do Meu Filho(a)
            </NavLink>


            {/* Sub-itens do diário */}
            {isDiario && (
              <>
                {PARENT_TABS_MAIN.map(tab => renderTab(tab, goTabParent, true))}

                {/* Instruções Gerais */}
                <div className="pt-2 pb-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                    Instruções Gerais
                  </p>
                </div>
                {TABS_INSTRUCOES.map(tab => renderTab(tab, goTabParent, true))}
              </>
            )}
          </>
        )}

        {/* ── Seções do médico (dentro de um paciente) ── */}
        {patientId && (
          <>
            <div className="pt-3 pb-1">
              <div className="h-px bg-slate-100 mb-3" />
              <p className="section-header px-2">Seções do Paciente</p>
            </div>

            {DOCTOR_TABS_MAIN.map(tab => renderTab(tab, goTabDoctor))}

            {/* Instruções Gerais */}
            <div className="pt-2 pb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                Instruções Gerais
              </p>
            </div>
            {TABS_INSTRUCOES.map(tab => renderTab(tab, goTabDoctor))}
          </>
        )}
      </nav>

      {/* Currículo + Clínicas */}
      <div className="px-3 pb-3 space-y-1">
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
          <span>Currículo do Médico</span>
        </NavLink>
        <NavLink to="/clinicas" onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'text-green-600 hover:bg-green-50'
            }`
          }>
          <MapPin size={18} />
          <span>Clínicas de Atendimento</span>
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
