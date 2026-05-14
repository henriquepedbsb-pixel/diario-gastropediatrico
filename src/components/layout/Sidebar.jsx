import { NavLink, useNavigate } from 'react-router-dom'
import { Home, UserPlus, Stethoscope, X, LogOut, User, Lightbulb } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { isDoctor } from '../../lib/utils'

export default function Sidebar({ onClose }) {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const isMedico = isDoctor(profile?.role)

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
          </>
        )}

        {!isMedico && (
          <NavLink to="/diario" end onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }>
            <Home size={18} /> Diário do Meu Filho
          </NavLink>
        )}
      </nav>

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
