import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Stethoscope, Users, Loader2, CheckCircle, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUpMedico, signUpPai } = useAuth()

  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState('')
  const [sucesso,  setSucesso]  = useState(false)
  const [tipoSel,  setTipoSel]  = useState(null)   // 'medico' | 'pai' | null

  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const senha = watch('password', '')

  /* ─── submit ─── */
  const onSubmit = async (values) => {
    if (!tipoSel) { setErro('Selecione o tipo de conta.'); return }

    setLoading(true)
    setErro('')
    try {
      if (tipoSel === 'medico') {
        await signUpMedico({
          email:         values.email,
          password:      values.password,
          full_name:     values.nome,
          codigoConvite: values.codigo,
        })
      } else {
        await signUpPai({
          email:     values.email,
          password:  values.password,
          full_name: values.nome,
        })
      }
      setSucesso(true)
    } catch (err) {
      setErro(err.message ?? 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Tela de sucesso ─── */
  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Conta criada!</h2>
          <p className="text-sm text-slate-500 mb-6">
            {tipoSel === 'medico'
              ? 'Bem-vindo, Dr.! Faça login para acessar o sistema.'
              : 'Conta criada com sucesso. Faça login para ver o diário do seu filho.'}
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full">
            Ir para o Login
          </button>
        </div>
      </div>
    )
  }

  /* ─── Formulário ─── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">

          {/* Cabeçalho */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
              <div>
                <p className="font-bold">Criar Conta</p>
                <p className="text-blue-200 text-xs">Diário Gastropediátrico · Dr. Henrique Gomes</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-5">

            {/* ── Dados pessoais ── */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">
                Dados de acesso
              </h2>

              {/* Nome */}
              <div>
                <label className="label">Nome completo</label>
                <input
                  className="input"
                  placeholder="Seu nome completo"
                  {...register('nome', { required: 'Nome obrigatório' })}
                />
                {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="input"
                  {...register('email', {
                    required: 'E-mail obrigatório',
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
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="input pr-11"
                    {...register('password', {
                      required: 'Senha obrigatória',
                      minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                    })}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="label">Confirmar senha</label>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  className="input"
                  {...register('confirmar', {
                    required: 'Confirmação obrigatória',
                    validate: v => v === senha || 'As senhas não conferem',
                  })}
                />
                {errors.confirmar && <p className="mt-1 text-xs text-red-500">{errors.confirmar.message}</p>}
              </div>
            </div>

            {/* ── Tipo de conta ── */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-700 border-b border-slate-100 pb-2">
                Tipo de conta
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Responsável */}
                <button type="button" onClick={() => setTipoSel('pai')}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-left
                    ${tipoSel === 'pai'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${tipoSel === 'pai' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Users size={20} className={tipoSel === 'pai' ? 'text-blue-600' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${tipoSel === 'pai' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Sou responsável
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">de um paciente</p>
                  </div>
                  {tipoSel === 'pai' && (
                    <span className="text-blue-500 text-xs font-medium">✓ Selecionado</span>
                  )}
                </button>

                {/* Médico */}
                <button type="button" onClick={() => setTipoSel('medico')}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-left
                    ${tipoSel === 'medico'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${tipoSel === 'medico' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Stethoscope size={20} className={tipoSel === 'medico' ? 'text-blue-600' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${tipoSel === 'medico' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Sou médico
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Dr. Henrique Gomes</p>
                  </div>
                  {tipoSel === 'medico' && (
                    <span className="text-blue-500 text-xs font-medium">✓ Selecionado</span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Campo extra: código (médico) ── */}
            {tipoSel === 'medico' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-xs text-blue-700 font-medium">
                  🔒 Informe o código de acesso para criar uma conta médica.
                </p>
                <div>
                  <label className="label">Código de acesso</label>
                  <input
                    className="input text-center tracking-[0.3em] font-mono uppercase"
                    placeholder="XXXXXXXX"
                    {...register('codigo', {
                      required: tipoSel === 'medico' ? 'Código obrigatório para médico' : false,
                    })}
                  />
                  {errors.codigo && <p className="mt-1 text-xs text-red-500">{errors.codigo.message}</p>}
                </div>
              </div>
            )}

            {/* ── Aviso para responsável ── */}
            {tipoSel === 'pai' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p className="font-semibold">Como funciona o acesso?</p>
                  <p className="text-blue-700 leading-relaxed">
                    O Dr. Henrique Gomes cadastra o paciente e informa o seu e-mail.
                    Ao criar conta com esse mesmo e-mail, o vínculo é feito automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Erro geral */}
            {erro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                <span className="shrink-0 mt-0.5">⚠️</span> {erro}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading || !tipoSel} className="btn-primary w-full py-3 text-base">
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Criando conta…</>
                : 'Criar Conta'}
            </button>

            <p className="text-center text-sm text-slate-500">
              Já tem conta?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
