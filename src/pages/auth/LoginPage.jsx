import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Stethoscope, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    setErro('')
    try {
      console.log('[Login] tentando signIn:', email)
      await signIn(email, password)
      console.log('[Login] signIn OK → navegando para /')
      navigate('/', { replace: true })   // RootRedirect decide a rota final
    } catch (err) {
      console.error('[Login] signIn erro:', err.message)
      setErro('E-mail ou senha incorretos. Verifique e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

          {/* Topo — foto inteira como pano de fundo */}
          <div className="relative overflow-hidden">
            {/* Foto sem corte — ocupa a largura toda e altura natural */}
            <img
              src="/medico.jpg"
              alt="Dr. Henrique Gomes"
              className="w-full block"
            />
            {/* Overlay gradiente só na base para o texto */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-blue-900/85 to-transparent" />
            {/* Texto sobre a foto */}
            <div className="absolute bottom-0 left-0 right-0 px-8 py-5 text-white text-center">
              <h1 className="text-xl font-bold tracking-tight drop-shadow">Dr. Henrique Gomes</h1>
              <p className="text-blue-100 text-sm mt-0.5 drop-shadow">Gastropediatria · Diário Clínico</p>
            </div>
          </div>

          {/* Formulário */}
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Entrar na conta</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* E-mail */}
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="input"
                  {...register('email', {
                    required: 'Informe o e-mail',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'E-mail inválido' },
                  })}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              {/* Senha */}
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input pr-11"
                    {...register('password', { required: 'Informe a senha' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {/* Erro geral */}
              {erro && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  <span className="shrink-0 mt-0.5">⚠️</span> {erro}
                </div>
              )}

              {/* Botão */}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Entrando…</>
                  : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-center text-sm text-slate-500">
              <p>
                <Link to="/esqueci-senha" className="text-blue-600 hover:underline">
                  Esqueceu sua senha?
                </Link>
              </p>
              <p>
                Primeira vez?{' '}
                <Link to="/cadastro" className="text-blue-600 font-semibold hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Sistema clínico privado · Acesso restrito
        </p>
      </div>
    </div>
  )
}
