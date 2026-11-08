import { Sparkles, Infinity as InfinityIcon, ExternalLink, Lock } from 'lucide-react'
import { PLANOS, CHECKOUT_URL } from '../../hooks/usePlano'

/* Botão de upgrade — só aparece se o checkout estiver configurado */
export function BotaoUpgrade({ className = '' }) {
  if (!CHECKOUT_URL) {
    return <p className={`text-xs text-slate-500 ${className}`}>Para ampliar o plano, fale com a equipe PedDiário.</p>
  }
  return (
    <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className={`btn-sun ${className}`}>
      <Sparkles size={15} /> Fazer upgrade <ExternalLink size={13} className="opacity-60" />
    </a>
  )
}

/* Card compacto do plano — painel do médico */
export default function PlanoCard({ plano }) {
  if (!plano) return null
  const meta      = PLANOS[plano.id] ?? PLANOS.free
  const ilimitado = plano.limite == null
  const pct       = ilimitado ? 0 : Math.min(100, Math.round((plano.usados / Math.max(plano.limite, 1)) * 100))
  const cheio     = !ilimitado && plano.usados >= plano.limite

  if (ilimitado) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`badge ${meta.cor}`}>Plano {meta.nome}</span>
        <span className="inline-flex items-center gap-1"><InfinityIcon size={13} /> pacientes ilimitados</span>
      </div>
    )
  }

  return (
    <div className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${cheio ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${meta.cor}`}>Plano {meta.nome}</span>
          <span className="text-sm font-semibold text-slate-700">
            {plano.usados} de {plano.limite} paciente{plano.limite !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar"
          aria-valuenow={plano.usados} aria-valuemin={0} aria-valuemax={plano.limite}>
          <div className={`h-full rounded-full ${cheio ? 'bg-amber-400' : 'bg-marinho'}`} style={{ width: `${pct}%` }} />
        </div>
        {cheio && (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <Lock size={12} /> Limite atingido. Seus pacientes continuam acessíveis; para cadastrar novos, amplie o plano.
          </p>
        )}
      </div>
      {cheio && <BotaoUpgrade className="shrink-0" />}
    </div>
  )
}
