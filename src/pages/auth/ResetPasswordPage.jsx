import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Stethoscope, Loader2, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const navigate  = useNavigate()
  const [pronto,   setPronto]   = useState(false)   // sessão de recovery ativa
  const [loading,  setLoading]  = useState(false)
  const [concluido,setConcluido]= useState(false)
  const [erro,     setErro]     = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  /* ── Aguarda o evento PASSWORD_RECOVERY do Supabase ── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPronto(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const onSubmit = async ({ password }) => {
    setLoading(true)
    setErro('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setConcluido(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setErro(err.message ?? 'Erro ao redefinir a senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

          {/* Topo */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Stethoscope size={30} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Diário Gastropediátrico</h1>
            <p className="text-blue-200 text-sm mt-1">Dr. Henrique Gomes</p>
          </div>

          <div className="px-8 py-8">

            {concluido ? (
              /* ── Senha alterada ── */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Senha redefinida!</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Sua senha foi alterada com sucesso. Redirecionando para o login…
                  </p>
                </div>
                <Loader2 size={20} className="animate-spin text-blue-500 mx-auto" />
              </div>

            ) : !pronto ? (
              /* ── Aguardando token de recovery ── */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert size={32} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Link inválido ou expirado</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Acesse esta página através do link enviado ao seu e-mail. Links expiram em 24 horas.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/esqueci-senha')}
                  className="btn-primary w-full py-2.5"
                >
                  Solicitar novo link
                </button>
              </div>

            ) : (
              /* ── Formulário nova senha ── */
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">Criar nova senha</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Escolha uma senha segura com pelo menos 6 caracteres.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                  {/* Nova senha */}
                  <div>
                    <label className="label">Nova senha</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="input pr-11"
                        {...register('password', {
                          required: 'Informe a nova senha',
                          minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                        })}
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirmar senha */}
                  <div>
                    <label className="label">Confirmar senha</label>
                    <div className="relative">
                      <input
                        type={showPwd2 ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="input pr-11"
                        {...register('confirm', {
                          required: 'Confirme a senha',
                          validate: v => v === watch('password') || 'As senhas não coincidem',
                        })}
                      />
                      <button type="button" onClick={() => setShowPwd2(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPwd2 ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.confirm && (
                      <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>
                    )}
                  </div>

                  {erro && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                      <span className="shrink-0">⚠️</span> {erro}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                    {loading
                      ? <><Loader2 size={18} className="animate-spin" /> Salvando…</>
                      : 'Redefinir senha'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Sistema clínico privado · Acesso restrito
        </p>
      </div>
    </div>
  )
}
