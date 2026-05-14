import { differenceInMonths, parseISO } from 'date-fns'
import { Syringe, CheckCircle2, Clock, AlertCircle, Star } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   CALENDÁRIO SBIM 2026/2027 — Criança 0 a 10 anos
   Fonte: Sociedade Brasileira de Imunizações, 27/04/2026
───────────────────────────────────────────────────────────────*/
const CALENDARIO = [
  {
    idade: 'Ao nascer',
    mesRef: 0,
    vacinas: [
      {
        nome: 'BCG',
        dose: 'Dose única',
        info: 'Aplicar na maternidade. Adiar se PN < 2.000 g. Não revacinação de rotina.',
        sus: true,
      },
      {
        nome: 'Hepatite B',
        dose: '1ª dose',
        info: 'Nas primeiras 12h de vida. Se mãe HBsAg+: administrar também IGHAHB até 7 dias após o parto.',
        sus: true,
      },
      {
        nome: 'Nirsevimabe (anti-VSR)',
        dose: 'Dose única',
        info: 'Prematuros <37 sem ou RN de mãe não vacinada. 50 mg se <5 kg · 100 mg se ≥5 kg. Cobre 1º ano de vida.',
        sus: false,
      },
    ],
  },
  {
    idade: '1 mês',
    mesRef: 1,
    vacinas: [
      {
        nome: 'Hepatite B',
        dose: '2ª dose',
        info: 'Obrigatório para RN com PN < 2.000 g ou IG < 33 semanas (esquema 0-1-2-6 meses).',
        sus: true,
      },
    ],
  },
  {
    idade: '2 meses',
    mesRef: 2,
    vacinas: [
      {
        nome: 'DTP + Hib + HepB + VIP',
        dose: '1ª dose',
        info: '⭐ Privado: Hexavalente acelular (DTPa-HB-VIP-Hib) — 6 componentes em 1 injeção\nSUS: Pentavalente DTPw-HB-Hib + VIP separado',
        sus: true,
      },
      {
        nome: 'Pneumocócica conjugada',
        dose: '1ª dose',
        info: 'Privado: preferir VPC20 ou VPC15 · SUS: VPC10 · Esquema 3+1 quando iniciada até 6 meses',
        sus: true,
      },
      {
        nome: 'Rotavírus (oral)',
        dose: '1ª dose',
        info: 'Monovalente RV1: 2 doses (2 e 4m) · Pentavalente RV5: 3 doses (2, 4 e 6m) · Contraindicada em ambiente hospitalar',
        sus: true,
      },
    ],
  },
  {
    idade: '3 meses',
    mesRef: 3,
    vacinas: [
      {
        nome: 'Meningocócica ACWY (ou C)',
        dose: '1ª dose',
        info: 'Privado: preferir MenACWY (mais ampla) · SUS: menC aos 3 meses',
        sus: true,
      },
      {
        nome: 'Meningocócica B',
        dose: '1ª dose',
        info: 'Aplicar em separado de Pneumo e DTP para reduzir risco de febre alta · Paracetamol profilático nas 24h após',
        sus: false,
      },
    ],
  },
  {
    idade: '4 meses',
    mesRef: 4,
    vacinas: [
      {
        nome: 'DTP + Hib + HepB + VIP',
        dose: '2ª dose',
        info: '⭐ Privado: Hexavalente acelular (DTPa-HB-VIP-Hib) · SUS: Pentavalente DTPw-HB-Hib + VIP',
        sus: true,
      },
      {
        nome: 'Pneumocócica conjugada',
        dose: '2ª dose',
        info: 'Privado: VPC20 ou VPC15 · SUS: VPC10',
        sus: true,
      },
      {
        nome: 'Rotavírus (oral)',
        dose: '2ª dose',
        info: 'Última dose para o esquema monovalente (RV1)',
        sus: true,
      },
    ],
  },
  {
    idade: '5 meses',
    mesRef: 5,
    vacinas: [
      {
        nome: 'Meningocócica ACWY (ou C)',
        dose: '2ª dose',
        info: 'Privado: MenACWY · SUS: menC aos 5 meses',
        sus: true,
      },
      {
        nome: 'Meningocócica B',
        dose: '2ª dose',
        info: '',
        sus: false,
      },
    ],
  },
  {
    idade: '6 meses',
    mesRef: 6,
    vacinas: [
      {
        nome: 'DTP + Hib + HepB + VIP',
        dose: '3ª dose',
        info: '⭐ Privado: Hexavalente acelular (DTPa-HB-VIP-Hib) · SUS: Pentavalente DTPw + VIP',
        sus: true,
      },
      {
        nome: 'Pneumocócica conjugada',
        dose: '3ª dose',
        info: 'Privado: VPC20/VPC15, esquema 3+1 · SUS: VPC10 não inclui 3ª dose de rotina',
        sus: false,
      },
      {
        nome: 'Rotavírus (oral)',
        dose: '3ª dose',
        info: 'Apenas no esquema pentavalente RV5',
        sus: false,
      },
      {
        nome: 'Influenza',
        dose: '1ª dose *',
        info: '* Primovacinação em <9 anos: 2 doses (intervalo 30 dias). Após: dose única anual. Privado: 3V e 4V',
        sus: true,
      },
    ],
  },
  {
    idade: '9 meses',
    mesRef: 9,
    vacinas: [
      {
        nome: 'Febre Amarela',
        dose: '1ª dose',
        info: 'Indicada em todo o território nacional · Não aplicar com Tríplice Viral no mesmo dia em <2 anos',
        sus: true,
      },
    ],
  },
  {
    idade: '12 meses',
    mesRef: 12,
    vacinas: [
      {
        nome: 'SCRV — Tetraviral (SCR + Varicela)',
        dose: '1ª dose',
        info: '⭐ Privado: vacina combinada Tetraviral (SCRV) preferencial · SUS: SCR separada da Varicela',
        sus: true,
      },
      {
        nome: 'Hepatite A',
        dose: '1ª dose',
        info: 'SUS: dose única até <5 anos · Privado: 2 doses (12m e 15m) ou Twinrix (HepA+HepB, 2 doses 0-6m)',
        sus: true,
      },
      {
        nome: 'Pneumocócica conjugada',
        dose: 'Reforço',
        info: 'Privado: VPC20 ou VPC15 · SUS: VPC10',
        sus: true,
      },
      {
        nome: 'Meningocócica ACWY',
        dose: 'Reforço',
        info: 'SUS: menACWY no reforço dos 12 meses · Privado: menACWY',
        sus: true,
      },
      {
        nome: 'Meningocócica B',
        dose: 'Reforço',
        info: 'Entre 12 e 15 meses',
        sus: false,
      },
    ],
  },
  {
    idade: '15 meses',
    mesRef: 15,
    vacinas: [
      {
        nome: 'DTPa (ou DTPa-VIP ou DTPa-VIP-Hib)',
        dose: '1º reforço',
        info: '⭐ Privado: preferir Pentavalente acelular (DTPa-VIP-Hib) ou DTPa-VIP · SUS: DTPw\nReforço Hib recomendado nesta faixa, principalmente com série em DTPa',
        sus: true,
      },
      {
        nome: 'Poliomielite VIP',
        dose: '1º reforço',
        info: 'Privado: incluso na DTPa-VIP · SUS: VOP oral',
        sus: true,
      },
      {
        nome: 'SCRV — Tetraviral',
        dose: '2ª dose',
        info: 'Intervalo mínimo de 3 meses da dose anterior de SCR, V ou SCRV · ⭐ Privado: usar Tetraviral',
        sus: true,
      },
      {
        nome: 'Hepatite A',
        dose: '2ª dose',
        info: 'SUS: não recomenda 2ª dose de rotina · Privado: 2ª dose aos 15 meses',
        sus: false,
      },
    ],
  },
  {
    idade: '4 anos',
    mesRef: 48,
    vacinas: [
      {
        nome: 'DTPa-VIP ou dTpa-VIP',
        dose: '2º reforço',
        info: '⭐ Privado: DTPa-VIP (Tetravalente pediátrica) ou dTpa-VIP (Tetravalente adulto) · SUS: DTPw + VOP',
        sus: true,
      },
      {
        nome: 'Febre Amarela',
        dose: '2ª dose',
        info: 'SBIm recomenda 2ª dose aos 4 anos para todos · PNI: 2ª dose somente se 1ª dose antes dos 5 anos',
        sus: true,
      },
      {
        nome: 'Dengue Qdenga® — 1ª dose',
        dose: '1ª dose (0 e 3 meses)',
        info: 'A partir de 4 anos, independente de contato prévio com o vírus · SUS: apenas 10–14 anos · Privado: a partir de 4 anos',
        sus: false,
      },
      {
        nome: 'Varicela',
        dose: '2ª dose',
        info: 'Apenas se não recebeu as 2 doses de SCRV nos 12 e 15 meses',
        sus: true,
      },
    ],
  },
  {
    idade: '5 – 6 anos',
    mesRef: 60,
    vacinas: [
      {
        nome: 'Meningocócica ACWY',
        dose: '2º reforço',
        info: 'SBIm recomenda reforço ~5 anos após o último (reforço dos 12 meses) pela queda dos títulos de anticorpos',
        sus: false,
      },
    ],
  },
  {
    idade: '9 anos',
    mesRef: 108,
    vacinas: [
      {
        nome: 'HPV9 — Gardasil 9®',
        dose: '2 doses (0 e 6 meses)',
        info: '⭐ SBIm recomenda HPV9 preferencial para máxima proteção · SUS: HPV4 dose única para meninas e meninos 9–14 anos',
        sus: true,
      },
      {
        nome: 'dTpa ou dTpa-VIP',
        dose: 'Reforço',
        info: 'Reforço ~5 anos após DTPa dos 4 anos · Preferência entre 9 e 11 anos · Privado: dTpa ou dTpa-VIP (Tetravalente adulto)',
        sus: false,
      },
    ],
  },
]

/* ─── Vacinas combinadas disponíveis no serviço privado ─── */
const COMBINADAS = [
  {
    nome: 'Hexavalente acelular',
    sigla: 'DTPa-HB-VIP-Hib',
    componentes: 'DTP acelular + Hepatite B + VIP + Hib',
    uso: 'Série primária: 2, 4 e 6 meses',
    destaque: true,
  },
  {
    nome: 'Pentavalente acelular',
    sigla: 'DTPa-VIP-Hib',
    componentes: 'DTP acelular + VIP + Hib',
    uso: 'Reforço 15 meses ou série primária',
    destaque: false,
  },
  {
    nome: 'Tetravalente pediátrica',
    sigla: 'DTPa-VIP',
    componentes: 'DTP acelular + VIP',
    uso: 'Reforço 4–6 anos',
    destaque: false,
  },
  {
    nome: 'Tetravalente adulto',
    sigla: 'dTpa-VIP',
    componentes: 'dTpa (adulto) + VIP',
    uso: 'Reforço 9 anos+',
    destaque: false,
  },
  {
    nome: 'Tetraviral SCRV',
    sigla: 'SCRV',
    componentes: 'Sarampo + Caxumba + Rubéola + Varicela',
    uso: '12 meses e 15 meses',
    destaque: true,
  },
  {
    nome: 'Twinrix (HepA + HepB)',
    sigla: 'HepA-HepB',
    componentes: 'Hepatite A + Hepatite B',
    uso: 'A partir de 1 ano · 2 doses (0 e 6 meses)',
    destaque: false,
  },
  {
    nome: 'HPV9 — Gardasil 9®',
    sigla: 'HPV9',
    componentes: '9 genótipos do HPV',
    uso: '9 anos · 2 doses (0 e 6 meses)',
    destaque: true,
  },
  {
    nome: 'Dengue Qdenga®',
    sigla: 'DEN-TDV',
    componentes: '4 sorotipos do vírus da dengue',
    uso: 'A partir de 4 anos · 2 doses (0 e 3 meses)',
    destaque: false,
  },
]

/* ─── Helpers ─── */
function StatusIcon({ status }) {
  if (status === 'passado') return <CheckCircle2 size={15} className="text-green-500 shrink-0" />
  if (status === 'atual')   return <Syringe      size={15} className="text-blue-500  shrink-0" />
  if (status === 'proximo') return <AlertCircle  size={15} className="text-amber-500 shrink-0" />
  return                           <Clock        size={15} className="text-slate-300 shrink-0" />
}

export default function TabVacinas({ birthdate }) {
  const idadeMeses = birthdate
    ? differenceInMonths(new Date(), parseISO(birthdate))
    : null

  const proximoIndex = CALENDARIO.findIndex(
    (f, i) => idadeMeses != null && idadeMeses < f.mesRef + 1
      && (i === 0 || idadeMeses >= CALENDARIO[i - 1].mesRef + 1)
  )

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
        <p className="text-sm text-blue-800 font-semibold">
          💉 Calendário Vacinal SBIm 2026/2027 — Criança 0 a 10 anos
        </p>
        <p className="text-xs text-blue-600">
          Fonte: Sociedade Brasileira de Imunizações · Atualizado em 27/04/2026
        </p>
        <p className="text-xs text-blue-500">
          Sempre que possível, preferir vacinas combinadas e considerar aplicações simultâneas na mesma visita.
        </p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-500" /> Faixa passada</span>
        <span className="flex items-center gap-1.5"><Syringe      size={13} className="text-blue-500"  /> Faixa atual</span>
        <span className="flex items-center gap-1.5"><AlertCircle  size={13} className="text-amber-500" /> Próxima faixa</span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-100 border border-green-400 inline-block" />SUS
          <span className="w-2 h-2 rounded-full bg-violet-100 border border-violet-400 inline-block ml-2" />Privado
        </span>
      </div>

      {/* ── Calendário por faixa etária ── */}
      <div className="space-y-3">
        {CALENDARIO.map((faixa, idx) => {
          const passado = idadeMeses != null && idadeMeses >= faixa.mesRef + 1
          const atual   = idadeMeses != null && idadeMeses >= faixa.mesRef && idadeMeses < faixa.mesRef + 1
          const proximo = !passado && !atual && idx === proximoIndex
          const status  = passado ? 'passado' : atual ? 'atual' : proximo ? 'proximo' : 'futuro'

          return (
            <div key={faixa.idade}
              className={`card overflow-hidden
                ${atual   ? 'ring-2 ring-blue-400 shadow-md'  : ''}
                ${proximo ? 'ring-2 ring-amber-300 shadow-sm' : ''}`}>

              {/* Header da faixa */}
              <div className={`px-4 py-2.5 flex items-center gap-2 border-b
                ${atual   ? 'bg-blue-600 border-blue-500'
                : proximo ? 'bg-amber-50 border-amber-200'
                : passado ? 'bg-slate-50 border-slate-100'
                :           'bg-white    border-slate-50'}`}>
                <StatusIcon status={status} />
                <span className={`font-semibold text-sm
                  ${atual ? 'text-white' : passado ? 'text-slate-500' : 'text-slate-700'}`}>
                  {faixa.idade}
                </span>
                {atual   && <span className="ml-auto text-xs bg-white/25 text-white font-bold px-2 py-0.5 rounded-full">Atual</span>}
                {proximo && <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Próxima</span>}
                {passado && <span className="ml-auto text-xs text-green-500 font-medium">✓ Realizada</span>}
              </div>

              {/* Lista de vacinas */}
              <div className="divide-y divide-slate-50">
                {faixa.vacinas.map(v => (
                  <div key={v.nome} className="px-4 py-3 flex items-start gap-3">
                    {/* Badge SUS / Privado */}
                    <span className={`mt-0.5 shrink-0 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full
                      ${v.sus
                        ? 'bg-green-100  text-green-700  border border-green-300'
                        : 'bg-violet-100 text-violet-700 border border-violet-300'}`}>
                      {v.sus ? 'SUS' : 'PVT'}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug
                        ${passado ? 'text-slate-500' : 'text-slate-800'}`}>
                        {v.nome}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${passado ? 'text-slate-400' : 'text-blue-600'}`}>
                        {v.dose}
                      </p>
                      {v.info && (
                        <p className={`text-xs mt-1 leading-relaxed whitespace-pre-line
                          ${passado ? 'text-slate-400' : 'text-slate-500'}`}>
                          {v.info}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Influenza — dose anual ── */}
      <div className="card p-4 bg-sky-50 border-sky-200 space-y-1.5">
        <p className="text-sm font-semibold text-sky-800 flex items-center gap-2">
          🤧 Influenza — dose anual (a partir dos 6 meses)
        </p>
        <ul className="text-xs text-sky-700 space-y-1 list-disc list-inside">
          <li>Primovacinação em menores de 9 anos: <strong>2 doses</strong> com intervalo de 30 dias</li>
          <li>Após primovacinação: <strong>dose única anual</strong></li>
          <li>SUS: vacina 3V (trivalente) · Privado: 3V e 4V disponíveis</li>
          <li>Região Norte: campanha antecipada (novembro–fevereiro), formulação HN recomendada pela OMS</li>
        </ul>
      </div>

      {/* ── COVID-19 ── */}
      <div className="card p-4 bg-slate-50 border-slate-200 space-y-1.5">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          🦠 COVID-19
        </p>
        <p className="text-xs text-slate-600">
          Rotina pelo PNI para crianças de <strong>6 meses até menores de 5 anos</strong>.
          Esquema de doses conforme a vacina utilizada. Serviço privado: não disponível.
        </p>
        <a href="https://www.gov.br/saude/pt-br/assuntos/covid-19"
          target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline">
          → gov.br/saude/covid-19
        </a>
      </div>

      {/* ── Vacinas combinadas — serviço privado ── */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-violet-50 border-b border-violet-200">
          <p className="text-sm font-semibold text-violet-800">
            ⭐ Vacinas combinadas — Serviço privado
          </p>
          <p className="text-xs text-violet-600 mt-0.5">
            Sempre que possível, preferir as combinadas para reduzir o número de injeções na mesma visita.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {COMBINADAS.map(c => (
            <div key={c.sigla}
              className={`px-4 py-3 flex items-start gap-3 ${c.destaque ? 'bg-violet-50/50' : ''}`}>
              <div className="shrink-0 mt-0.5">
                {c.destaque
                  ? <Star size={13} className="text-violet-500 fill-violet-200" />
                  : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {c.nome}
                  <span className="ml-2 text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">
                    {c.sigla}
                  </span>
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{c.componentes}</p>
                <p className="text-xs text-slate-400 mt-0.5">📅 {c.uso}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notas finais */}
      <div className="card p-4 bg-slate-50 border-slate-200 space-y-1.5">
        <p className="text-xs font-semibold text-slate-600">Notas importantes:</p>
        <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
          <li>Atrasos vacinais: avaliar esquema de reposição com o pediatra</li>
          <li>MenB deve ser aplicada separado de Pneumocócica e DTP (reduz febre)</li>
          <li>Febre Amarela e Tríplice Viral: não aplicar no mesmo dia em menores de 2 anos (intervalo 30 dias)</li>
          <li>ESAVI significativos devem ser notificados às autoridades competentes</li>
          <li>Crianças com comorbidades: consultar Calendário SBIm Pacientes Especiais</li>
        </ul>
        <p className="text-xs text-slate-400 pt-1">
          Fonte: SBIm — Sociedade Brasileira de Imunizações · Calendário 2026/2027 · Atualizado em 27/04/2026
        </p>
      </div>
    </div>
  )
}
