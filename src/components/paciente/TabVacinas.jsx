import { differenceInMonths, parseISO } from 'date-fns'
import { Syringe, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

/* ─── Calendário SBIM 2024 — Criança 0 a 10 anos ─── */
const CALENDARIO = [
  {
    idade: 'Ao nascer',
    mesRef: 0,
    vacinas: [
      { nome: 'BCG',        dose: 'Dose única', info: 'Formas graves de tuberculose',    sus: true  },
      { nome: 'Hepatite B', dose: '1ª dose',    info: '',                                sus: true  },
    ],
  },
  {
    idade: '1 mês',
    mesRef: 1,
    vacinas: [
      { nome: 'Hepatite B', dose: '2ª dose', info: '', sus: true },
    ],
  },
  {
    idade: '2 meses',
    mesRef: 2,
    vacinas: [
      { nome: 'Pentavalente (DTP+Hib+HepB)', dose: '1ª dose', info: '',                   sus: true  },
      { nome: 'Poliomielite VIP',             dose: '1ª dose', info: 'Injetável',          sus: true  },
      { nome: 'Pneumocócica 10V',             dose: '1ª dose', info: '',                   sus: true  },
      { nome: 'Rotavírus',                    dose: '1ª dose', info: 'Oral',               sus: true  },
      { nome: 'Meningocócica C conjugada',    dose: '1ª dose', info: '',                   sus: true  },
      { nome: 'Meningocócica B',              dose: '1ª dose', info: 'Calendário privado', sus: false },
    ],
  },
  {
    idade: '3 meses',
    mesRef: 3,
    vacinas: [
      { nome: 'Meningocócica B', dose: '2ª dose', info: 'Calendário privado', sus: false },
    ],
  },
  {
    idade: '4 meses',
    mesRef: 4,
    vacinas: [
      { nome: 'Pentavalente (DTP+Hib+HepB)', dose: '2ª dose', info: '',                   sus: true  },
      { nome: 'Poliomielite VIP',             dose: '2ª dose', info: 'Injetável',          sus: true  },
      { nome: 'Pneumocócica 10V',             dose: '2ª dose', info: '',                   sus: true  },
      { nome: 'Rotavírus',                    dose: '2ª dose', info: 'Oral',               sus: true  },
      { nome: 'Meningocócica C conjugada',    dose: '2ª dose', info: '',                   sus: true  },
      { nome: 'Meningocócica B',              dose: '3ª dose', info: 'Calendário privado', sus: false },
    ],
  },
  {
    idade: '6 meses',
    mesRef: 6,
    vacinas: [
      { nome: 'Pentavalente (DTP+Hib+HepB)', dose: '3ª dose', info: '',                                    sus: true  },
      { nome: 'Poliomielite VIP',             dose: '3ª dose', info: 'Injetável',                          sus: true  },
      { nome: 'Influenza',                    dose: '1ª dose*', info: '* Duas doses no 1º ano; anual após', sus: true  },
      { nome: 'Pneumocócica 13V',             dose: '3ª dose', info: 'Calendário privado',                  sus: false },
    ],
  },
  {
    idade: '9 meses',
    mesRef: 9,
    vacinas: [
      { nome: 'Febre Amarela',       dose: '1ª dose', info: 'Áreas com recomendação vacinal', sus: true  },
      { nome: 'Meningocócica C',     dose: 'Reforço', info: 'Calendário privado',             sus: false },
    ],
  },
  {
    idade: '12 meses',
    mesRef: 12,
    vacinas: [
      { nome: 'SCR — Tríplice Viral',     dose: '1ª dose', info: 'Sarampo, Caxumba, Rubéola',        sus: true  },
      { nome: 'Varicela',                 dose: '1ª dose', info: '',                                  sus: true  },
      { nome: 'Hepatite A',               dose: '1ª dose', info: '',                                  sus: true  },
      { nome: 'Pneumocócica',             dose: 'Reforço', info: '',                                  sus: true  },
      { nome: 'Meningocócica ACWY',       dose: 'Reforço', info: '',                                  sus: true  },
      { nome: 'Meningocócica B',          dose: 'Reforço', info: 'Calendário privado',                sus: false },
    ],
  },
  {
    idade: '15 meses',
    mesRef: 15,
    vacinas: [
      { nome: 'DTP',               dose: '1º reforço',             info: 'Difteria, Tétano, Coqueluche', sus: true  },
      { nome: 'Poliomielite VOP',  dose: '1º reforço',             info: 'Oral',                         sus: true  },
      { nome: 'SCRV — Tetraviral', dose: '2ª dose SCR + Varicela', info: 'Sarampo, Caxumba, Rubéola, Varicela', sus: true },
      { nome: 'Hepatite A',        dose: '2ª dose',                info: 'Calendário privado',           sus: false },
    ],
  },
  {
    idade: '4 anos',
    mesRef: 48,
    vacinas: [
      { nome: 'DTP',              dose: '2º reforço', info: '',                              sus: true  },
      { nome: 'Poliomielite VOP', dose: '2º reforço', info: 'Oral',                          sus: true  },
      { nome: 'Varicela',         dose: '2ª dose',    info: 'Se não recebeu SCRV',           sus: false },
      { nome: 'Influenza',        dose: 'Dose anual', info: 'A partir de 6 meses, todo ano', sus: true  },
    ],
  },
  {
    idade: '9 – 10 anos',
    mesRef: 108,
    vacinas: [
      { nome: 'HPV',  dose: '2 doses (0 e 6 meses)', info: 'SUS: meninas; Privado: ambos os sexos', sus: true  },
      { nome: 'dTpa', dose: 'Reforço',                info: 'Tétano, Difteria, Pertussis acelular', sus: false },
    ],
  },
]

function StatusIcon({ status }) {
  if (status === 'passado')  return <CheckCircle2 size={16} className="text-green-500 shrink-0" />
  if (status === 'atual')    return <Syringe      size={16} className="text-blue-500 shrink-0" />
  if (status === 'proximo')  return <AlertCircle  size={16} className="text-amber-500 shrink-0" />
  return                            <Clock        size={16} className="text-slate-300 shrink-0" />
}

export default function TabVacinas({ birthdate }) {
  const idadeMeses = birthdate
    ? differenceInMonths(new Date(), parseISO(birthdate))
    : null

  // Descobre qual é a próxima faixa (a primeira que ainda não passou)
  const proximoIndex = CALENDARIO.findIndex(f => idadeMeses != null && idadeMeses < f.mesRef + 1)

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm text-blue-700 font-medium">
          💉 Calendário Vacinal SBIM 2024 — Criança 0 a 10 anos
        </p>
        <p className="text-xs text-blue-500 mt-0.5">
          Inclui vacinas do SUS e do calendário privado. Consulte sempre o pediatra para adequar ao histórico vacinal.
        </p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-green-500" /> Faixa passada</span>
        <span className="flex items-center gap-1"><Syringe      size={13} className="text-blue-500"  /> Faixa atual</span>
        <span className="flex items-center gap-1"><AlertCircle  size={13} className="text-amber-500" /> Próxima faixa</span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-100 border border-green-400 inline-block" /> SUS
          <span className="w-2 h-2 rounded-full bg-purple-100 border border-purple-400 inline-block ml-2" /> Privado
        </span>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {CALENDARIO.map((faixa, idx) => {
          const passado = idadeMeses != null && idadeMeses >= faixa.mesRef + 1
          const atual   = idadeMeses != null && idadeMeses >= faixa.mesRef && idadeMeses < faixa.mesRef + 1
          const proximo = idx === proximoIndex
          const status  = passado ? 'passado' : atual ? 'atual' : proximo ? 'proximo' : 'futuro'

          return (
            <div key={faixa.idade}
              className={`card overflow-hidden
                ${atual   ? 'ring-2 ring-blue-400 shadow-md'   : ''}
                ${proximo ? 'ring-2 ring-amber-300 shadow-sm'  : ''}`}>

              {/* Header */}
              <div className={`px-4 py-2.5 flex items-center gap-2
                ${atual   ? 'bg-blue-600'
                : proximo ? 'bg-amber-50 border-b border-amber-200'
                : passado ? 'bg-slate-50 border-b border-slate-100'
                : 'bg-white border-b border-slate-50'}`}>
                <StatusIcon status={status} />
                <span className={`font-semibold text-sm
                  ${atual ? 'text-white' : passado ? 'text-slate-500' : 'text-slate-700'}`}>
                  {faixa.idade}
                </span>
                {atual   && <span className="ml-auto text-xs bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full">Atual</span>}
                {proximo && <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Próxima</span>}
              </div>

              {/* Vacinas */}
              <div className="divide-y divide-slate-50">
                {faixa.vacinas.map(v => (
                  <div key={v.nome + v.dose} className="px-4 py-2.5 flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0
                      ${v.sus
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-purple-100 text-purple-700 border border-purple-300'}`}>
                      {v.sus ? 'SUS' : 'PVT'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug
                        ${passado ? 'text-slate-500' : 'text-slate-800'}`}>
                        {v.nome}
                      </p>
                      <p className={`text-xs mt-0.5 ${passado ? 'text-slate-400' : 'text-slate-500'}`}>
                        {v.dose}{v.info ? ` · ${v.info}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Nota de rodapé */}
      <div className="card p-4 bg-slate-50 border-slate-200 space-y-1">
        <p className="text-xs text-slate-600 font-medium">Notas importantes:</p>
        <ul className="text-xs text-slate-500 space-y-0.5 list-disc list-inside">
          <li>Influenza: dose anual a partir dos 6 meses de vida</li>
          <li>Febre Amarela: indicada conforme área de residência/viagem</li>
          <li>Calendário privado pode incluir vacinas não disponíveis no SUS</li>
          <li>Atrasos vacinais devem ser avaliados pelo pediatra (esquema de reposição)</li>
        </ul>
        <p className="text-xs text-slate-400 mt-2">Fonte: SBIM — Sociedade Brasileira de Imunizações, 2024</p>
      </div>
    </div>
  )
}
