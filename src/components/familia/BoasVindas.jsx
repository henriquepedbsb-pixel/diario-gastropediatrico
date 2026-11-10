import { useEffect, useRef, useState } from 'react'
import { lerPreferencia, gravarPreferencia } from '../../lib/preferenciasLocais'

/* Primeiro acesso da família: três passos curtos, uma única vez por conta neste aparelho. */
export default function BoasVindas({ userId, nomeCrianca, artigo = 'de', onRegistrar }) {
  const chave = `boasvindas:v1:${userId ?? 'anon'}`
  const [aberto, setAberto] = useState(() => !!userId && lerPreferencia(chave) !== '1')
  const [passo, setPasso]   = useState(0)
  const botao = useRef(null)

  useEffect(() => { if (aberto) botao.current?.focus() }, [aberto, passo])

  if (!aberto) return null

  const fechar = () => { gravarPreferencia(chave); setAberto(false) }
  const nome = nomeCrianca || 'seu filho'

  const PASSOS = [
    {
      emoji: '👋',
      titulo: <>Este é o diário {artigo} <span className="bg-[linear-gradient(transparent_62%,rgba(255,230,0,.85)_62%)] px-0.5">{nome}</span></>,
      corpo: (
        <p>
          Aqui você registra o dia a dia entre uma consulta e outra. O pediatra vê os registros
          e chega na consulta já sabendo como foram as últimas semanas.
        </p>
      ),
    },
    {
      emoji: '📝',
      titulo: 'O que vale registrar',
      corpo: (
        <>
          <ul className="space-y-2">
            {[
              ['🍽️', 'Alimentação', 'refeições, mamadas e alimentos novos'],
              ['💧', 'Intestino', 'cocô e fraldas'],
              ['⚠️', 'Sintomas', 'o que apareceu e quando'],
              ['🌙', 'Sono e choro', 'como foram o dia e a noite'],
            ].map(([e, t, d]) => (
              <li key={t} className="flex items-start gap-2.5">
                <span aria-hidden className="text-lg leading-6">{e}</span>
                <span><strong className="text-slate-800">{t}:</strong> {d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-slate-500">Não precisa registrar tudo. Um minuto por dia já ajuda.</p>
        </>
      ),
    },
    {
      emoji: '💬',
      titulo: 'Dúvidas e urgências',
      corpo: (
        <>
          <p>
            Surgiu uma dúvida? Anote em <strong className="text-slate-800">Meu Diário</strong> e marque
            para perguntar na próxima consulta.
          </p>
          <p className="mt-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
            O diário não substitui a consulta e não é um canal de urgência. Em caso de urgência,
            procure o pronto-socorro.
          </p>
        </>
      ),
    },
  ]

  const atual  = PASSOS[passo]
  const ultimo = passo === PASSOS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-noite/60"
      role="dialog" aria-modal="true" aria-labelledby="boasvindas-titulo">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1.5" aria-label={`Passo ${passo + 1} de ${PASSOS.length}`}>
              {PASSOS.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-7 bg-marinho' : i < passo ? 'w-3 bg-marinho/50' : 'w-3 bg-slate-200'}`} />
              ))}
            </div>
            {!ultimo && (
              <button onClick={fechar} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Pular</button>
            )}
          </div>

          <div key={passo} className="tab-enter">
            <div className="w-12 h-12 rounded-2xl bg-sol/30 flex items-center justify-center text-2xl mb-4" aria-hidden>{atual.emoji}</div>
            <h2 id="boasvindas-titulo" className="text-xl font-extrabold text-noite leading-tight">{atual.titulo}</h2>
            <div className="mt-3 text-sm text-slate-600 leading-relaxed">{atual.corpo}</div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            {passo > 0 && (
              <button onClick={() => setPasso(p => p - 1)} className="btn-secondary">Voltar</button>
            )}
            {ultimo ? (
              <button ref={botao} onClick={() => { fechar(); onRegistrar?.() }} className="btn-primary flex-1">
                Começar a registrar
              </button>
            ) : (
              <button ref={botao} onClick={() => setPasso(p => p + 1)} className="btn-primary flex-1">Continuar</button>
            )}
          </div>
          {ultimo && (
            <button onClick={fechar} className="mt-3 w-full text-xs font-semibold text-slate-400 hover:text-slate-600">
              Agora não, só quero olhar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
