import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import LoadingScreen from './components/ui/LoadingScreen'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import HomePage from './pages/HomePage'
import NovoPacientePage from './pages/NovoPacientePage'
import PacienteDetailPage from './pages/PacienteDetailPage'
import DiarioPage from './pages/DiarioPage'
import DicasPage from './pages/DicasPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

/* ── Redireciona após login baseado no perfil ── */
function RootRedirect() {
  const { profile, session, loading } = useAuth()
  console.log('[RootRedirect] loading:', loading, '| role:', profile?.role ?? 'null')
  if (loading)                        return <LoadingScreen />
  if (!session)                       return <Navigate to="/login"     replace />
  if (profile?.role === 'medico')     return <Navigate to="/dashboard" replace />
  if (profile?.role === 'pai')        return <Navigate to="/diario"    replace />
  // Sessão existe mas role não reconhecido → evita loop infinito
  if (profile && !profile.role)       return <Navigate to="/login"     replace />
  return <LoadingScreen />
}

/* ── Protege rotas: redireciona para login se não autenticado ── */
function ProtectedLayout() {
  const { session, loading } = useAuth()
  if (loading)  return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <Layout />
}

/* ── Protege rotas exclusivas do médico ── */
function SomenteMedico() {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (profile?.role !== 'medico') return <Navigate to="/" replace />
  return <Outlet />
}

/* ── Protege rotas exclusivas do pai/responsável ── */
function SomentePai() {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (profile?.role !== 'pai') return <Navigate to="/" replace />
  return <Outlet />
}

/* ── Redireciona autenticados para fora do login/cadastro ── */
function PublicOnly({ children }) {
  const { session, loading } = useAuth()
  if (loading)  return <LoadingScreen />
  if (session)  return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Públicas */}
        <Route path="/login"           element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/cadastro"        element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/esqueci-senha"   element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

        {/* Protegidas — dentro do Layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<RootRedirect />} />

          {/* Médico */}
          <Route element={<SomenteMedico />}>
            <Route path="/dashboard"                    element={<HomePage />} />
            <Route path="/dashboard/pacientes/novo"     element={<NovoPacientePage />} />
            <Route path="/dashboard/pacientes/:id"      element={<PacienteDetailPage />} />
            <Route path="/dashboard/dicas"             element={<DicasPage />} />
          </Route>

          {/* Pai / Responsável */}
          <Route element={<SomentePai />}>
            <Route path="/diario" element={<DiarioPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
