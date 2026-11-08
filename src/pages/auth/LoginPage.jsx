import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import BrandMark from '../../components/layout/BrandMark'
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
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[1.1fr_1fr]">

      {/* Lado da marca — tela cheia no computador */}
      <aside className="hero-band relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <BrandMark />
        <div className="max-w-lg">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
            A rotina do seu filho,{' '}
            <span className="bg-[linear-gradient(transparent_62%,rgba(255,230,0,.85)_62%)] px-1">num só lugar</span>.
          </h1>
          <p className="mt-6 text-lg text-suave max-w-md">
            Registre alimentação, sono, intestino e sintomas entre as consultas. O Dr. Henrique acompanha tudo e chega à consulta já sabendo o que aconteceu.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] font-semibold">
            {['Diário de sintomas, sono e amamentação', 'Prescrições, exames e documentos', 'Orientações do médico para a sua família'].map(t => (
              <li key={t} className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-sol shrink-0" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="flex items-end gap-4">
          <img src="/medico.jpg" alt="Dr. Henrique Gomes" className="w-20 h-20 rounded-2xl object-cover object-top border border-white/15" />
          <div className="text-sm">
            <p className="font-bold text-white">Dr. Henrique Gomes</p>
            <p className="text-suave">Pediatra e Gastropediatra · CRM-DF 14.611</p>
          </div>
        </div>
      </aside>

      {/* Formulário */}
      <main className="min-h-screen lg:min-h-0 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-4">

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">

          {/* Topo com foto — só no celular */}
          <div className="relative overflow-hidden lg:hidden">
            <img
              src="/medico.jpg"
              alt="Dr. Henrique Gomes"
              className="w-full block"
            />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-noite/90 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-8 py-5 text-white text-center">
              <h1 className="text-xl font-extrabold tracking-tight drop-shadow">Ped<span className="text-sol">Diário</span></h1>
              <p className="text-suave text-sm mt-0.5 drop-shadow">Área da família · Dr. Henrique Gomes</p>
            </div>
          </div>

          <div className="px-8 py-8">
            <h2 className="text-xl font-extrabold text-noite mb-1">Entrar na conta</h2>
            <p className="text-sm text-slate-500 mb-6">Use o e-mail cadastrado no consultório.</p>

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
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
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
                <Link to="/esqueci-senha" className="text-marinho font-semibold hover:underline">
                  Esqueceu sua senha?
                </Link>
              </p>
              <p>
                Primeira vez?{' '}
                <Link to="/cadastro" className="text-marinho font-bold hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Acesso restrito a pacientes e equipe · <a href="https://meumedicopediatra.com.br" className="underline hover:text-slate-600">meumedicopediatra.com.br</a>
        </p>
      </div>
      </main>
    </div>
  )
}
