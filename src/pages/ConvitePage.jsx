import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, HeartHandshake, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useConvite } from '../hooks/useConvite'
import { isDoctor } from '../lib/utils'
import { supabase } from '../lib/supabase'

/* ─────────────────────────────────────────────────────────────
   /convite/:token — página pública do convite da família.
   Sem conta: cria conta (ou entra) e aceita. Com conta de responsável:
   aceita direto. Depois, recarrega em /diario já com o filho vinculado.
───────────────────────────────────────────────────────────────*/

const MSG_STATUS = {
  invalido: { titulo: 'Convite não encontrado', texto: 'Confira se o link foi copiado inteiro ou peça um novo convite ao consultório.' },
  expirado: { titulo: 'Convite expirado',       texto: 'Este link não vale mais. Peça um novo convite ao consultório.' },
  usado:    { titulo: 'Convite já utilizado',   texto: 'Este convite já foi aceito. Se foi você, é só entrar na sua conta.' },
}

function Casca({ children }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <p className="text-center text-xl font-extrabold text-noite">Ped<span className="bg-sol px-1 rounded">Diário</span></p>
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

export default function ConvitePage() {
  const { token } = useParams()
  const { session, profile, loading: authLoading, signIn, signUpPai, signOut } = useAuth()
  const { infoConvite, aceitarConvite } = useConvite()

  const [info,     setInfo]     = useState(null)
  const [carreg,   setCarreg]   = useState(true)
  const [modo,     setModo]     = useState('criar')   // 'criar' | 'entrar'
  const [form,     setForm]     = useState({ nome: '', email: '', senha: '' })
  const [verSenha, setVerSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro,     setErro]     = useState('')

  useEffect(() => {
    let ativo = true
    infoConvite(token)
      .then(i => { if (ativo) setInfo(i) })
      .catch(err => { if (ativo) { setInfo({ status: 'erro' }); setErro(err.message) } })
      .finally(() => { if (ativo) setCarreg(false) })
    return () => { ativo = false }
  }, [token, infoConvite])

  const concluir = async () => {
    await aceitarConvite(token)
    // recarrega o app inteiro para o AuthContext carregar o paciente vinculado
    window.location.assign('/diario')
  }

  const aceitarLogado = async () => {
    setEnviando(true); setErro('')
    try { await concluir() } catch (err) { setErro(err.message); setEnviando(false) }
  }

  const enviarFormulario = async (e) => {
    e.preventDefault()
    setErro('')
    const email = form.email.trim().toLowerCase()
    if (!/\S+@\S+\.\S+/.test(email)) { setErro('Informe um e-mail válido.'); return }
    if (form.senha.length < 6)       { setErro('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (modo === 'criar' && !form.nome.trim()) { setErro('Informe seu nome.'); return }

    setEnviando(true)
    try {
      if (modo === 'criar') {
        await signUpPai({ email, password: form.senha, full_name: form.nome.trim() })
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          setErro('Enviamos um e-mail de confirmação. Confirme e depois abra este mesmo link de novo.')
          setEnviando(false)
          return
        }
      } else {
        await signIn(email, form.senha)
      }
      await concluir()
    } catch (err) {
      const m = err?.message || ''
      setErro(/already registered|already been registered/i.test(m)
        ? 'Este e-mail já tem conta. Toque em "Já tenho conta" e entre com sua senha.'
        : /Invalid login credentials/i.test(m) ? 'E-mail ou senha incorretos.' : m || 'Não foi possível continuar.')
      setEnviando(false)
    }
  }

  if (carreg || authLoading) {
    return <Casca><div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-10"><Loader2 size={18} className="animate-spin" /> Abrindo convite…</div></Casca>
  }

  if (!info || info.status !== 'valido') {
    const msg = MSG_STATUS[info?.status] ?? { titulo: 'Não foi possível abrir o convite', texto: erro || 'Tente novamente em instantes.' }
    return (
      <Casca>
        <div className="text-center space-y-3">
          <AlertCircle size={36} className="mx-auto text-amber-500" />
          <h1 className="text-lg font-extrabold text-noite">{msg.titulo}</h1>
          <p className="text-sm text-slate-600">{msg.texto}</p>
          <Link to="/login" className="btn-secondary inline-flex">Ir para o login</Link>
        </div>
      </Casca>
    )
  }

  const cabecalho = (
    <div className="text-center space-y-2 mb-6">
      <div className="w-12 h-12 rounded-2xl bg-sol/30 text-noite flex items-center justify-center mx-auto">
        <HeartHandshake size={24} />
      </div>
      <h1 className="text-xl font-extrabold text-noite leading-tight">
        Acompanhe {info.crianca ? <span className="bg-[linear-gradient(transparent_62%,rgba(255,230,0,.85)_62%)] px-1">{info.crianca}</span> : 'seu filho(a)'} no PedDiário
      </h1>
      <p className="text-sm text-slate-500">
        Convite {info.medico ? <>de <strong className="text-slate-700">{info.medico}</strong></> : 'do consultório'} para
        registrar o dia a dia e conversar com o médico entre as consultas.
      </p>
    </div>
  )

  /* Logado como médico */
  if (session && isDoctor(profile?.role)) {
    return (
      <Casca>
        {cabecalho}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          Você está conectado com uma conta de médico. Saia para que a família aceite o convite neste aparelho.
        </div>
        <button onClick={signOut} className="btn-secondary w-full mt-4"><LogOut size={15} /> Sair</button>
      </Casca>
    )
  }

  /* Logado como responsável */
  if (session) {
    return (
      <Casca>
        {cabecalho}
        <p className="text-sm text-slate-600 text-center mb-4">
          Você está conectado como <strong>{profile?.full_name || session.user?.email}</strong>.
        </p>
        {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-3">{erro}</div>}
        <button onClick={aceitarLogado} disabled={enviando} className="btn-primary w-full py-3">
          {enviando ? <><Loader2 size={16} className="animate-spin" /> Aceitando…</> : 'Aceitar convite'}
        </button>
        <button onClick={signOut} className="w-full text-xs text-slate-400 hover:text-slate-600 mt-3">Não é você? Sair</button>
      </Casca>
    )
  }

  /* Sem conta / não logado */
  return (
    <Casca>
      {cabecalho}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-full mb-5">
        {[['criar', 'Criar conta'], ['entrar', 'Já tenho conta']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => { setModo(id); setErro('') }}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all
              ${modo === id ? 'bg-white text-noite shadow-sm' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={enviarFormulario} className="space-y-4" noValidate>
        {modo === 'criar' && (
          <div>
            <label className="label" htmlFor="cv-nome">Seu nome</label>
            <input id="cv-nome" className="input" autoComplete="name" placeholder="Nome e sobrenome"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="cv-email">E-mail</label>
          <input id="cv-email" type="email" className="input" autoComplete="email" placeholder="seu@email.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="cv-senha">{modo === 'criar' ? 'Crie uma senha' : 'Senha'}</label>
          <div className="relative">
            <input id="cv-senha" type={verSenha ? 'text' : 'password'} className="input pr-11"
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
              placeholder={modo === 'criar' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
            <button type="button" onClick={() => setVerSenha(v => !v)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{erro}</div>}

        <button type="submit" disabled={enviando} className="btn-primary w-full py-3">
          {enviando
            ? <><Loader2 size={16} className="animate-spin" /> Aguarde…</>
            : modo === 'criar' ? 'Criar conta e aceitar' : 'Entrar e aceitar'}
        </button>
        {modo === 'entrar' && (
          <p className="text-center"><Link to="/esqueci-senha" className="text-xs text-blue-600 hover:underline">Esqueci minha senha</Link></p>
        )}
      </form>
    </Casca>
  )
}
