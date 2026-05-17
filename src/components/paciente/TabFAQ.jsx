import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const PERGUNTAS = [
  {
    q: 'Quando devo introduzir alimentos sólidos?',
    a: 'A OMS recomenda aleitamento materno exclusivo por 6 meses, com introdução alimentar a partir daí. Para prematuros, use a idade corrigida como referência.',
  },
  {
    q: 'Meu filho regurgita muito após mamar — é normal?',
    a: 'Regurgitações são frequentes nos primeiros meses devido à imaturidade do esfíncter esofagiano. Preocupe-se quando houver choro excessivo, recusa alimentar, perda de peso ou vômitos em jato frequentes.',
  },
  {
    q: 'Com que frequência o bebê deve evacuar?',
    a: 'No aleitamento exclusivo pode variar de várias vezes ao dia até uma vez por semana — ambos podem ser normais. Com fórmula o padrão é mais regular. Atenção se as fezes forem muito duras (Bristol 1-2) ou houver dor.',
  },
  {
    q: 'O que é a Escala de Bristol?',
    a: 'Classifica as fezes em 7 tipos por consistência. Tipos 3 e 4 são ideais; tipos 1-2 indicam constipação; tipos 5-7 indicam diarreia. Use a aba "Fezes" para registrar.',
  },
  {
    q: 'Meu filho tem alergia à proteína do leite de vaca (APLV) — o que evitar?',
    a: 'Evite leite de vaca e derivados (queijo, iogurte, manteiga, creme de leite). Em bebês amamentados, a mãe deve excluir da dieta. Com fórmula, use extensamente hidrolisadas ou à base de aminoácidos conforme orientação médica.',
  },
  {
    q: 'Quando me preocupar com o crescimento?',
    a: 'Queda de 2 ou mais canais percentílicos, peso abaixo do percentil 3 ou estagnação por 2+ meses são motivos para consulta. Acompanhe na aba Gráficos.',
  },
  {
    q: 'O que é doença do refluxo gastroesofágico (DRGE) em bebês?',
    a: 'Diferente da regurgitação fisiológica, a DRGE causa choro excessivo, arqueamento, recusa alimentar e comprometimento do crescimento. O diagnóstico é clínico; o tratamento inclui posicionamento, adaptações na dieta e, em casos selecionados, medicação.',
  },
  {
    q: 'Como usar o aplicativo para acompanhamento?',
    a: 'Registre na aba correta: Refeições (o que e quando comeu), Fezes (tipo e cor), Sintomas (intercorrências), Sono (períodos de descanso), Amamentação (mamadas). O médico terá acesso a todos os registros.',
  },
]

export default function TabFAQ() {
  const [aberto, setAberto] = useState(null)

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 pb-1">Dúvidas frequentes sobre gastropediatria e uso do aplicativo.</p>
      {PERGUNTAS.map((item, i) => (
        <div key={i} className="card overflow-hidden">
          <button
            onClick={() => setAberto(aberto === i ? null : i)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left"
          >
            <span className="text-sm font-medium text-slate-800 flex-1">{item.q}</span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform ${aberto === i ? 'rotate-180' : ''}`}
            />
          </button>
          {aberto === i && (
            <div className="px-4 pb-4">
              <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
