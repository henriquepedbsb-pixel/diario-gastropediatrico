import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Home, UserPlus, X, LogOut, User,
  ClipboardList, UtensilsCrossed, Droplets, TrendingUp, FileText,
  Milestone, Syringe, BookUser, MessageSquareQuote,
  AlertTriangle, Moon, Baby, Calculator, Bell, FolderOpen,
  HelpCircle, MapPin, History, Sprout, Pill, Frown, Lightbulb, LayoutDashboard,
  FileSearch, Lock, NotebookPen,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import BrandMark from './BrandMark'
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
  { id: 'diariofamilia',  label: 'Diário da Família', icon: NotebookPen     },
  { id: 'sintomas',       label: 'Sintomas',          icon: AlertTriangle   },
  { id: 'fezes',          label: 'Intestinal',        icon: Droplets        },
  { id: 'sono',           label: 'Sono',              icon: Moon            },
  { id: 'choro',          label: 'Choro / Cólica',   icon: Frown           },
  { id: 'medicamentos',   label: 'Medicamentos',      icon: Pill            },
  { id: 'exames',         label: 'Exames',            icon: FileSearch      },

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
  { id: 'resumo',         label: 'Visão Geral',       icon: LayoutDashboard },
  { id: 'meudiario',      label: 'Meu Diário',        icon: NotebookPen     },
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

  const activeTab = new URLSearchParams(location.search).get('tab') || 'resumo'

  const goTabDoctor = (tabId) => { navigate(`/dashboard/pacientes/${patientId}?tab=${tabId}`); onClose?.() }
  const goTabParent = (tabId) => { navigate(`/diario?tab=${tabId}`); onClose?.() }

  const handleLogout = async () => { await signOut(); navigate('/login', { replace: true }) }

  /* ── Renderiza cabeçalho de seção ou botão de aba ── */
  const renderItem = (item, onClickFn) => {
    if (item.type === 'header') {
      return (
        <p key={item.label}
          className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 pt-4 pb-1">
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
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          isActive ? 'bg-sol text-noite font-semibold' : 'text-suave hover:bg-white/5 hover:text-white'
        }`}>
        <Icon size={17} className="shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo ── */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
        <BrandMark />
        {onClose && (
          <button onClick={onClose} aria-label="Fechar menu" className="lg:hidden p-1 text-suave hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Navegação principal ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">

        {/* Médico — menu global */}
        {isMedico && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 pb-1">Menu</p>
            <NavLink to="/dashboard" end onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-sol text-noite font-semibold' : 'text-suave hover:bg-white/5 hover:text-white'
                }`}>
              <Home size={17} className="shrink-0" /> Painel de Pacientes
            </NavLink>
            <button onClick={() => { navigate('/dashboard/pacientes/novo'); onClose?.() }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-suave hover:bg-white/5 hover:text-white transition-colors">
              <UserPlus size={17} className="shrink-0" /> Novo Paciente
            </button>
            <NavLink to="/dashboard/relatorio" onClick={onClose}
  className={({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
      isActive ? 'bg-sol text-noite font-semibold' : 'text-suave hover:bg-white/5 hover:text-white'
    }`}>
  <FileText size={17} className="shrink-0" /> Relatório Pré-Consulta
</NavLink>
            <NavLink to="/dashboard/exames" onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-sol text-noite font-semibold' : 'text-suave hover:bg-white/5 hover:text-white'
                }`}>
              <FileSearch size={17} className="shrink-0" /> Exames
            </NavLink>
            <NavLink to="/dashboard/diario-privativo" onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-sol text-noite font-semibold' : 'text-suave hover:bg-white/5 hover:text-white'
                }`}>
              <Lock size={17} className="shrink-0" /> Diário Privativo
            </NavLink>
          </div>
        )}

        {/* Responsável — menu global */}
        {!isMedico && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 pb-1">Menu</p>
            <NavLink to="/diario" end onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive && !isDiario ? 'bg-sol text-noite font-semibold'
                  : isActive ? 'text-white font-semibold hover:bg-white/5'
                  : 'text-suave hover:bg-white/5 hover:text-white'
                }`}>
              <Home size={17} className="shrink-0" /> Diário do Meu Filho(a)
            </NavLink>

            {/* Abas do diário — responsável */}
            {isDiario && (
              <div className="space-y-0.5 mt-1">
                <div className="my-2 h-px bg-white/10" />
                {PARENT_TABS.map(item => renderItem(item, goTabParent))}
              </div>
            )}
          </div>
        )}

        {/* Médico — seções do paciente aberto */}
        {patientId && (
          <div className="space-y-0.5 mt-2">
            <div className="my-2 h-px bg-white/10" />
            {DOCTOR_TABS.map(item => renderItem(item, goTabDoctor))}
          </div>
        )}

      </nav>

      {/* ── Currículo + Clínicas ── */}
      <div className="px-3 pb-3 space-y-0.5 shrink-0">
        <div className="h-px bg-white/10 mb-2" />
        <NavLink to="/curriculo" onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-sol text-noite font-semibold' : 'text-suave hover:bg-white/5 hover:text-white'
            }`}>
          <BookUser size={17} className="shrink-0" />
          <span>Currículo do Médico</span>
        </NavLink>
        <NavLink to="/clinicas" onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-sol text-noite font-semibold' : 'text-suave hover:bg-white/5 hover:text-white'
            }`}>
          <MapPin size={17} className="shrink-0" />
          <span>Clínicas de Atendimento</span>
        </NavLink>
      </div>

      {/* ── Usuário + logout ── */}
      <div className="border-t border-white/10 px-4 py-3 space-y-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center shrink-0">
            <User size={16} className="text-sol" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{profile?.full_name ?? '—'}</p>
            <p className="text-xs text-suave">{isMedico ? 'Médico' : 'Responsável'}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-300 hover:bg-white/5 hover:text-red-200 transition-colors font-medium">
          <LogOut size={16} /> Sair
        </button>
      </div>

    </div>
  )
}
