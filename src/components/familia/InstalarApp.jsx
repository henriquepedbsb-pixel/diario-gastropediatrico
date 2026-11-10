import { useEffect, useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import {
  aoMudarInstalacao, eventoDeInstalacao, limparEventoDeInstalacao,
  estaInstalado, ehSamsungInternet, ehAndroid, ehIOS, linkAbrirNoChrome,
} from '../../lib/instalacao'
import { lerPreferencia, gravarPreferencia } from '../../lib/preferenciasLocais'

const CHAVE = 'instalar:dispensado'

/* Convite para colocar o PedDiário na tela inicial do celular.
   - Navegador da Samsung: a instalação por ele é barrada pelo Google Play Protect
     (falha conhecida do navegador), então orientamos abrir no Chrome.
   - Chrome/Android: botão que abre a instalação nativa.
   - iPhone/iPad e demais: passo a passo curto. */
export default function InstalarApp() {
  const [evento, setEvento]   = useState(eventoDeInstalacao)
  const [oculto, setOculto]   = useState(() => estaInstalado() || lerPreferencia(CHAVE) === '1')

  useEffect(() => aoMudarInstalacao(setEvento), [])

  if (oculto) return null

  const samsung = ehSamsungInternet()
  const android = ehAndroid()
  const ios     = ehIOS()
  if (!samsung && !android && !ios) return null       // computador: não incomoda

  const dispensar = () => { gravarPreferencia(CHAVE); setOculto(true) }

  const instalar = async () => {
    try {
      evento.prompt()
      const escolha = await evento.userChoice
      if (escolha?.outcome === 'accepted') setOculto(true)
    } catch { /* o navegador recusou abrir de novo: mantém as instruções */ }
    limparEventoDeInstalacao()
  }

  let corpo
  if (samsung) {
    corpo = (
      <>
        <p className="text-sm text-slate-600">
          Para instalar, abra o PedDiário no <strong className="text-slate-800">Google Chrome</strong>.
          Pelo navegador da Samsung o celular costuma mostrar um alerta de segurança que não tem relação com o PedDiário.
        </p>
        <a href={linkAbrirNoChrome('/')} className="btn-primary mt-3 w-full sm:w-auto">Abrir no Chrome</a>
        <p className="text-xs text-slate-400 mt-2">
          No Chrome, entre de novo na sua conta e toque nos três pontinhos → “Adicionar à tela inicial”.
        </p>
      </>
    )
  } else if (evento) {
    corpo = (
      <>
        <p className="text-sm text-slate-600">Abra o diário direto da tela inicial, em tela cheia, como um aplicativo.</p>
        <button onClick={instalar} className="btn-primary mt-3 w-full sm:w-auto">Instalar</button>
      </>
    )
  } else if (ios) {
    corpo = (
      <p className="text-sm text-slate-600">
        Toque em <strong className="text-slate-800">Compartilhar</strong> (o quadrado com a seta para cima)
        e depois em <strong className="text-slate-800">“Adicionar à Tela de Início”</strong>.
      </p>
    )
  } else {
    corpo = (
      <p className="text-sm text-slate-600">
        No Chrome, toque nos <strong className="text-slate-800">três pontinhos</strong> no canto superior direito
        e depois em <strong className="text-slate-800">“Adicionar à tela inicial”</strong>.
      </p>
    )
  }

  return (
    <section aria-label="Instalar o PedDiário" className="card p-4 sm:p-5 border-l-4 border-l-marinho">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-blue-50 text-marinho flex items-center justify-center shrink-0">
          <Smartphone size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-noite">Coloque o PedDiário na tela inicial</p>
          <div className="mt-1">{corpo}</div>
        </div>
        <button onClick={dispensar} aria-label="Dispensar aviso de instalação"
          className="p-1.5 -m-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0">
          <X size={18} />
        </button>
      </div>
    </section>
  )
}
