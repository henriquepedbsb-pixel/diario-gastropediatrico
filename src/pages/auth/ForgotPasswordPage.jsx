import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Stethoscope, Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro,    setErro]    = useState('')

  const { register, handleSubmit, formState: { errors }, getValues } = useForm()

  const onSubmit = async ({ email }) => {
    setLoading(true)
    setErro('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (error) throw error
      setEnviado(true)
    } catch (err) {
      setErro(err.message ?? 'Erro ao enviar e-mail. Tente novamente.')
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

            {enviado ? (
              /* ── Estado de sucesso ── */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">E-mail enviado!</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Enviamos um link de redefinição para{' '}
                    <strong className="text-slate-700">{getValues('email')}</strong>.
                    Verifique também a caixa de spam.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                >
                  <ArrowLeft size={15} /> Voltar ao login
                </Link>
              </div>
            ) : (
              /* ── Formulário ── */
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">Esqueceu sua senha?</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Informe seu e-mail e enviaremos um link para criar uma nova senha.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="label">E-mail</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        className="input pl-9"
                        {...register('email', {
                          required: 'Informe o e-mail',
                          pattern: { value: /\S+@\S+\.\S+/, message: 'E-mail inválido' },
                        })}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  {erro && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                      <span className="shrink-0">⚠️</span> {erro}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                    {loading
                      ? <><Loader2 size={18} className="animate-spin" /> Enviando…</>
                      : 'Enviar link de redefinição'}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Lembrou a senha?{' '}
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                    Voltar ao login
                  </Link>
                </p>
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
