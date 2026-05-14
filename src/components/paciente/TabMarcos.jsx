import { differenceInMonths, parseISO } from 'date-fns'
import { Star, CheckCircle2, Clock } from 'lucide-react'

const MARCOS = [
  {
    faixa: '0 – 3 meses',
    mesMin: 0, mesMax: 3,
    itens: [
      'Reage a sons altos (assusta-se)',
      'Fixa o olhar no rosto do cuidador',
      'Sorri de forma responsiva',
      'Move braços e pernas ativamente',
      'Levanta levemente a cabeça em decúbito ventral',
    ],
  },
  {
    faixa: '3 – 6 meses',
    mesMin: 3, mesMax: 6,
    itens: [
      'Vira a cabeça em direção a sons',
      'Segura objetos na mão',
      'Balbucia ("aaa", "ooo", "eeeh")',
      'Reconhece o rosto dos cuidadores',
      'Sustenta a cabeça sem apoio',
      'Rola de barriga para baixo e vice-versa',
    ],
  },
  {
    faixa: '6 – 9 meses',
    mesMin: 6, mesMax: 9,
    itens: [
      'Senta com apoio mínimo',
      'Transfere objetos entre as mãos',
      'Imita sons e expressões faciais',
      'Mostra interesse por alimentos',
      'Engatinha ou arrasta-se',
    ],
  },
  {
    faixa: '9 – 12 meses',
    mesMin: 9, mesMax: 12,
    itens: [
      'Senta sem apoio com estabilidade',
      'Fica em pé apoiado em móveis',
      'Fala "mamã" e "papá" com significado',
      'Faz gestos: tchau, bate palmas',
      'Usa pinça com polegar e indicador',
      'Responde ao próprio nome',
    ],
  },
  {
    faixa: '12 – 18 meses',
    mesMin: 12, mesMax: 18,
    itens: [
      'Caminha sozinho',
      'Fala 1 a 3 palavras com significado',
      'Bebe em copo com ajuda',
      'Aponta para objetos de interesse',
      'Empilha 2 a 3 blocos',
    ],
  },
  {
    faixa: '18 – 24 meses',
    mesMin: 18, mesMax: 24,
    itens: [
      'Sobe e desce escadas com apoio',
      'Combina 2 palavras ("quer água")',
      'Joga e pega bola',
      'Usa colher com poucos derramamentos',
      'Imita atividades domésticas',
    ],
  },
  {
    faixa: '2 – 3 anos',
    mesMin: 24, mesMax: 36,
    itens: [
      'Corre sem cair frequentemente',
      'Faz frases de 3 ou mais palavras',
      'Brinca próximo a outras crianças',
      'Identifica partes do corpo',
      'Rabisca círculos e linhas',
    ],
  },
  {
    faixa: '3 – 4 anos',
    mesMin: 36, mesMax: 48,
    itens: [
      'Anda de triciclo',
      'Conta até 10',
      'Veste-se com pouca ajuda',
      'Conta histórias simples',
      'Brinca de faz-de-conta',
    ],
  },
  {
    faixa: '4 – 5 anos',
    mesMin: 48, mesMax: 60,
    itens: [
      'Pula em um pé só',
      'Desenha figura humana com 4 partes',
      'Conta até 20',
      'Usa frases completas',
      'Entende regras simples de jogos',
    ],
  },
  {
    faixa: '5 – 6 anos',
    mesMin: 60, mesMax: 72,
    itens: [
      'Reconhece letras do nome',
      'Escreve o próprio nome',
      'Joga em grupo seguindo regras',
      'Controla esfíncteres de forma independente',
      'Distingue fantasia de realidade',
    ],
  },
  {
    faixa: '6 – 8 anos',
    mesMin: 72, mesMax: 96,
    itens: [
      'Lê palavras simples',
      'Realiza operações matemáticas básicas',
      'Tem amizades estáveis',
      'Demonstra empatia',
      'Pratica esportes em grupo',
    ],
  },
  {
    faixa: '8 – 10 anos',
    mesMin: 96, mesMax: 120,
    itens: [
      'Lê e compreende textos',
      'Resolve problemas lógicos',
      'Demonstra autonomia para higiene pessoal',
      'Organiza tarefas escolares',
      'Compreende conceitos de tempo e dinheiro',
    ],
  },
]

export default function TabMarcos({ birthdate }) {
  const idadeMeses = birthdate
    ? differenceInMonths(new Date(), parseISO(birthdate))
    : null

  return (
    <div className="space-y-4">
      {/* Aviso */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm text-blue-700 font-medium">
          📋 Baseado na Caderneta da Criança — Ministério da Saúde
        </p>
        <p className="text-xs text-blue-500 mt-0.5">
          Marcos são referências populacionais. Variações individuais são normais.
          Consulte o pediatra se algum marco não for atingido na faixa esperada.
        </p>
      </div>

      {/* Lista de faixas */}
      <div className="space-y-3">
        {MARCOS.map(faixa => {
          const isAtual  = idadeMeses != null && idadeMeses >= faixa.mesMin && idadeMeses < faixa.mesMax
          const isFuturo = idadeMeses != null && idadeMeses < faixa.mesMin
          const isPassado= idadeMeses != null && idadeMeses >= faixa.mesMax

          return (
            <div key={faixa.faixa}
              className={`card overflow-hidden ${isAtual ? 'ring-2 ring-blue-400 shadow-md' : ''}`}>

              {/* Header */}
              <div className={`px-4 py-3 flex items-center justify-between
                ${isAtual   ? 'bg-blue-600 text-white'
                : isPassado ? 'bg-slate-50'
                : 'bg-white'}`}>
                <div className="flex items-center gap-2">
                  {isAtual    && <Star        size={15} className="text-yellow-300 fill-yellow-300 shrink-0" />}
                  {isPassado  && <CheckCircle2 size={15} className="text-green-500 shrink-0" />}
                  {isFuturo   && <Clock        size={15} className="text-slate-400 shrink-0" />}
                  {idadeMeses == null && <Star size={15} className="text-slate-400 shrink-0" />}
                  <span className={`font-semibold text-sm ${isAtual ? 'text-white' : isPassado ? 'text-slate-500' : 'text-slate-700'}`}>
                    {faixa.faixa}
                  </span>
                </div>
                {isAtual && (
                  <span className="text-xs bg-yellow-400 text-yellow-900 font-bold px-2 py-0.5 rounded-full shrink-0">
                    Faixa atual
                  </span>
                )}
                {isPassado && (
                  <span className="text-xs text-green-500 font-medium shrink-0">Concluída</span>
                )}
              </div>

              {/* Itens */}
              <ul className="px-4 py-3 space-y-2">
                {faixa.itens.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0
                      ${isAtual ? 'bg-blue-500' : isPassado ? 'bg-green-400' : 'bg-slate-300'}`} />
                    <span className={isPassado ? 'text-slate-500' : 'text-slate-700'}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Aviso final */}
      <div className="card p-4 bg-amber-50 border-amber-200">
        <p className="text-xs text-amber-700">
          ⚠️ Esta lista é um guia educativo. O acompanhamento pediátrico regular é insubstituível
          para avaliação do desenvolvimento infantil.
        </p>
      </div>
    </div>
  )
}
