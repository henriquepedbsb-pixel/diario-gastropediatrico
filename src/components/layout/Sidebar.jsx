import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Home, UserPlus, Stethoscope, X, LogOut, User,
  ClipboardList, UtensilsCrossed, Droplets, TrendingUp, FileText,
  Milestone, Syringe, BookUser, MessageSquareQuote,
  AlertTriangle, Moon, Baby, Calculator, Bell, FolderOpen,
  HelpCircle, MapPin, History, Sprout, Pill, Frown, Lightbulb,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { isDoctor } from '../../lib/utils'

/* ─── helper p/ criar cabeçalho de seção ─── */
const H = (label) => ({ type: 'header', label })

/* ════════════════════════════════════════════════════════
   MÉDICO — abas organizadas por bloco temático
════════════════════════════════════════════════════════ */
const DOCTOR_TABS = [
  H('Dados do Paciente'),
  { id: 'cadastro',       label: 'Cadastro',          icon: ClipboardList   },

  H('Alimentação'),
  { id: 'diario',         label: 'Diário Alimentar',  icon: UtensilsCrossed },
  { id: 'amamentacao',    label: 'Amamentação',       icon: Baby            },
  { id: 'introducao',     label: 'Introdução Alim.',  icon: Sprout          },

  H('Saúde & Registros'),
  { id: 'sintomas',       label: 'Sintomas',          icon: AlertTriangle   },
  { id: 'fezes',          label: 'Intestinal',        icon: Droplets        },
  { id: 'sono',           label: 'Sono',              icon: Moon            },
  { id: 'choro',          label: 'Choro / Cólica',   icon: Frown           },
  { id: 'medicamentos',   label: 'Medicamentos',      icon: Pill            },

  H('Acompanhamento Clínico'),
  { id: 'vacinas',        label: 'Vacinas',           icon: Syringe         },
  { id: 'receitas',       label: 'Prescrições',       icon: FileText        },
  { id: 'alertas',        label: 'Alertas',           icon: Bell            },
  { id: 'documentos',     label: 'Documentos',        icon: FolderOpen      },
  { id: 'graficos',       label: 'Gráficos',          icon: TrendingUp      },

  H('Ferramentas'),
  { id: 'calculadora',    label: 'Calculadoras',      icon: Calculator      },
  { id: 'timeline',       label: 'Linha do Tempo',   icon: History         },

  H('Orientações'),
  { id: 'marcos',         label: 'Marcos do Desenvolvimento', icon: Milestone },
  { id: 'dicas',          label: 'Dicas',             icon: Lightbulb       },
  { id: 'faq',            label: 'Dúvidas (FAQ)',     icon: HelpCircle      },
  { id: 'idadecorrigida', label: 'Idade Corrigida',   icon: Calculator      },
  { id: 'depoimentos',    label: 'Depoimentos',       icon: MessageSquareQuote, href: '/dashboard/depoimentos' },
]

/* ════════════════════════════════════════════════════════
   RESPONSÁVEL — abas organizadas por bloco temático
════════════════════════════════════════════════════════ */
const PARENT_TABS = [
  H('Meu Filho(a)'),
  { id: 'cadastro',       label: 'Cadastro',          icon: ClipboardList   },

  H('Alimentação'),
  { id: 'refeicoes',      label: 'Refeições',         icon: UtensilsCrossed },
  { id: 'amamentacao',    label: 'Amamentação',       icon: Baby            },
  { id: 'introducao',     label: 'Introdução Alim.',  icon: Sprout          },

  H('Saúde & Registros'),
  { id: 'sintomas',       label: 'Sintomas',          icon: AlertTriangle   },
  { id: 'fezes',          label: 'Intestinal',        icon: Droplets        },
  { id: 'sono',           label: 'Sono',              icon: Moon            },
  { id: 'choro',          label: 'Choro / Cólica',   icon: Frown           },
  { id: 'medicamentos',   label: 'Medicamentos',      icon: Pill            },

  H('Acompanhamento'),
  { id: 'vacinas',        label: 'Vacinas',           icon: Syringe         },
  { id: 'receitas',       label: 'Prescrições',       icon: FileText        },
  { id: 'alertas',        label: 'Alertas',           icon: Bell            },
  { id: 'documentos',     label: 'Documentos',        icon: FolderOpen      },

  H('Ferramentas'),
  { id: 'calculadora',    label: 'Calculadoras',      icon: Calculator      },
  { id: 'timeline',       label: 'Linha do Tempo',   icon: History         },

  H('Orientações'),
  { id: 'marcos',         label: 'Marcos do Desenvolvimento', icon: Milestone },
  { id: 'dicas',          label: 'Dicas',             icon: Lightbulb       },
  { id: 'faq',            label: 'Dúvidas (FAQ)',     icon: HelpCircle      },
  { id: 'idadecorrigida', label: 'Idade Corrigida',   icon: Calculator      },
  { id: 'depoimentos',    label: 'Depoimentos',       icon: MessageSquareQuote, href: '/depoimentos' },
]

/* ════════════════════════════════════════════════════════
   COMPONENTE
════════════════════════════════════════════════════════ */
export default function Sidebar({ onClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { profile, signOut } = useAuth()
  const isMedico  = isDoctor(profile?.role)

  const patientMatch = location.pathname.match(/^\/dashboard\/pacientes\/([^/]+)$/)
  const patientId    = patientMatch?.[1] ?? null
  const isDiario     = location.pathname === '/diario'

  const activeTab = new URLSearchParams(location.search).get('tab') || 'cadastro'

  const goTabDoctor = (tabId) => { navigate(`/dashboard/pacientes/${patientId}?tab=${tabId}`); onClose?.() }
  const goTabParent = (tabId) => { navigate(`/diario?tab=${tabId}`); onClose?.() }

  const handleLogout = async () => { await signOut(); navigate('/login', { replace: true }) }

  /* ── Renderiza cabeçalho de seção ou botão de aba ── */
  const renderItem = (item, onClickFn) => {
    if (item.type === 'header') {
      return (
        <p key={item.label}
          className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-4 pb-1">
          {item.label}
        </p>
      )
    }

    const Icon      = item.icon
    const isActive  = item.href ? location.pathname === item.href : activeTab === item.id
    const onClick   = item.href
      ? () => { navigate(item.href); onClose?.() }
      : () => onClickFn(item.id)

    return (
      <button key={item.id} onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
        }`}>
        <Icon size={17} className="shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 shrink-0">
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

      {/* ── Navegação principal ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">

        {/* Médico — menu global */}
        {isMedico && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pb-1">Menu</p>
            <NavLink to="/dashboard" end onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`}>
              <Home size={17} className="shrink-0" /> Painel de Pacientes
            </NavLink>
            <button onClick={() => { navigate('/dashboard/pacientes/novo'); onClose?.() }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              <UserPlus size={17} className="shrink-0" /> Novo Paciente
            </button>
          </div>
        )}

        {/* Responsável — menu global */}
        {!isMedico && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pb-1">Menu</p>
            <NavLink to="/diario" end onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`}>
              <Home size={17} className="shrink-0" /> Diário do Meu Filho(a)
            </NavLink>

            {/* Abas do diário — responsável */}
            {isDiario && (
              <div className="space-y-0.5 mt-1">
                <div className="my-2 h-px bg-slate-100" />
                {PARENT_TABS.map(item => renderItem(item, goTabParent))}
              </div>
            )}
          </div>
        )}

        {/* Médico — seções do paciente aberto */}
        {patientId && (
          <div className="space-y-0.5 mt-2">
            <div className="my-2 h-px bg-slate-100" />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pb-1">
              Seções do Paciente
            </p>
            {DOCTOR_TABS.map(item => renderItem(item, goTabDoctor))}
          </div>
        )}

      </nav>

      {/* ── Currículo + Clínicas ── */}
      <div className="px-3 pb-3 space-y-0.5 shrink-0">
        <div className="h-px bg-slate-100 mb-2" />
        <NavLink to="/curriculo" onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'text-teal-600 hover:bg-teal-50'
            }`}>
          <BookUser size={17} className="shrink-0" />
          <span>Currículo do Médico</span>
        </NavLink>
        <NavLink to="/clinicas" onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'text-green-600 hover:bg-green-50'
            }`}>
          <MapPin size={17} className="shrink-0" />
          <span>Clínicas de Atendimento</span>
        </NavLink>
      </div>

      {/* ── Usuário + logout ── */}
      <div className="border-t border-slate-100 px-4 py-3 space-y-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <User size={16} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{profile?.full_name ?? '—'}</p>
            <p className="text-xs text-slate-400">{isMedico ? 'Médico' : 'Responsável'}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
          <LogOut size={16} /> Sair
        </button>
      </div>

    </div>
  )
}
