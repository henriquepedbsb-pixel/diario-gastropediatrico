import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { linkGoogleAgenda, baixarICS } from '../../lib/lembreteCalendario'
import { lerPreferencia, gravarPreferencia } from '../../lib/preferenciasLocais'

/* Tabelas que contam como "registro do dia" e a coluna de data de cada uma */
const FONTES = [
  ['meals',                  'eaten_at'],
  ['stool_records',          'recorded_at'],
  ['symptom_records',        'recorded_at'],
  ['sleep_records',          'sleep_start'],
  ['breastfeeding_records',  'recorded_at'],
  ['crying_records',         'recorded_at'],
  ['diaper_records',         'recorded_at'],
  ['family_journal_entries', 'entry_at'],
]

const chaveDia = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const NOMES    = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const ultimosSeteDias = () => {
  const dias = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
    dias.push(d)
  }
  return dias
}

/* "Sua semana": em quantos dos últimos 7 houve registro + atalho do lembrete diário. */
export default function SemanaResumo({ patient }) {
  const [porDia, setPorDia]   = useState(null)      // Map chaveDia -> quantidade
  const [lembrete, setLembrete] = useState(false)
  const primeiroNome = patient.name?.split(' ')[0] ?? ''

  useEffect(() => {
    let ativo = true
    const dias = ultimosSeteDias()
    const desde = dias[0].toISOString()
    Promise.all(FONTES.map(([tabela, coluna]) =>
      supabase.from(tabela).select(coluna).eq('patient_id', patient.id).gte(coluna, desde).limit(500)
        .then(({ data }) => (data ?? []).map(r => r[coluna]))
        .catch(() => [])
    )).then(listas => {
      if (!ativo) return
      const mapa = new Map()
      listas.flat().forEach(quando => {
        const d = new Date(quando)
        if (Number.isNaN(d.getTime())) return
        const k = chaveDia(d)
        mapa.set(k, (mapa.get(k) ?? 0) + 1)
      })
      setPorDia(mapa)
    })
    return () => { ativo = false }
  }, [patient.id])

  if (!porDia) return <div className="card h-24 animate-pulse bg-slate-100" aria-busy="true" />

  const dias     = ultimosSeteDias()
  const comReg   = dias.filter(d => porDia.has(chaveDia(d))).length
  const hojeTem  = porDia.has(chaveDia(dias[6]))

  const frase = comReg === 0
    ? 'Ainda não há registros nesta semana. Que tal começar por hoje?'
    : comReg === 7
      ? 'Você registrou todos os dias desta semana.'
      : `Você registrou em ${comReg} dos últimos 7 dias.${hojeTem ? '' : ' Hoje ainda não.'}`

  return (
    <section aria-label="Sua semana" className="card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="section-header mb-1">Sua semana</p>
          <p className="text-sm font-semibold text-slate-700">{frase}</p>
        </div>

        <ol className="flex gap-1.5 shrink-0" aria-label="Registros nos últimos 7 dias">
          {dias.map((d, i) => {
            const tem = porDia.has(chaveDia(d))
            const hoje = i === 6
            return (
              <li key={i} className="flex flex-col items-center gap-1">
                <span
                  title={`${NOMES[d.getDay()]}: ${tem ? 'com registro' : 'sem registro'}`}
                  aria-label={`${NOMES[d.getDay()]}${hoje ? ' (hoje)' : ''}: ${tem ? 'com registro' : 'sem registro'}`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${tem ? 'bg-marinho text-white' : 'bg-slate-100 text-slate-400'}
                    ${hoje ? 'ring-2 ring-sol ring-offset-2' : ''}`}>
                  {tem ? '✓' : INICIAIS[d.getDay()]}
                </span>
                <span className="text-[10px] font-semibold text-slate-400" aria-hidden>{hoje ? 'hoje' : INICIAIS[d.getDay()]}</span>
              </li>
            )
          })}
        </ol>

        <button onClick={() => setLembrete(true)} className="btn-secondary shrink-0">
          <BellRing size={15} /> Lembrete diário
        </button>
      </div>

      {lembrete && <LembreteDiario nomeCrianca={primeiroNome} onClose={() => setLembrete(false)} />}
    </section>
  )
}

function LembreteDiario({ nomeCrianca, onClose }) {
  const [hora, setHora] = useState(() => lerPreferencia('lembrete:hora') || '20:00')
  const dados = { hora, nomeCrianca }
  const guardar = () => gravarPreferencia('lembrete:hora', hora)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      role="dialog" aria-modal="true" aria-labelledby="lembrete-titulo">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 id="lembrete-titulo" className="font-semibold text-slate-800">Lembrete diário</h3>
          <button onClick={onClose} aria-label="Fechar" className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            O lembrete é criado no calendário do seu celular e toca todos os dias no horário escolhido.
            Para parar, é só apagar o evento do calendário.
          </p>
          <div>
            <label className="label" htmlFor="lembrete-hora">Horário</label>
            <input id="lembrete-hora" type="time" className="input" value={hora}
              onChange={e => setHora(e.target.value || '20:00')} />
          </div>
          <div className="grid gap-2">
            <a href={linkGoogleAgenda(dados)} target="_blank" rel="noopener noreferrer" onClick={guardar}
              className="btn-primary w-full">
              Adicionar ao Google Agenda
            </a>
            <button onClick={() => { guardar(); baixarICS(dados) }} className="btn-secondary w-full">
              Outro calendário (iPhone, Samsung…)
            </button>
          </div>
          <p className="text-xs text-slate-400">
            O evento leva só o primeiro nome da criança e o link do diário. Nenhum dado de saúde vai para o calendário.
          </p>
        </div>
      </div>
    </div>
  )
}
