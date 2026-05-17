const ALERTAS = [
  {
    grupo: 'Emergências — ligue 192 (SAMU)',
    cor: 'red',
    itens: [
      'Dificuldade respiratória intensa ou parada respiratória',
      'Convulsão (incluindo febril prolongada > 5 min)',
      'Perda de consciência ou estado muito sonolento',
      'Cianose (lábios ou extremidades azulados)',
      'Vômitos com sangue ou fezes pretas (melena)',
    ],
  },
  {
    grupo: 'Consulta urgente (mesmo dia)',
    cor: 'orange',
    itens: [
      'Febre > 38°C em bebês com menos de 3 meses',
      'Febre > 39°C sem causa aparente há mais de 2 dias',
      'Recusa alimentar total por mais de 6 horas',
      'Vômitos persistentes (> 6 episódios em 24h)',
      'Diarreia com sinais de desidratação (olhos fundos, boca seca)',
      'Choro inconsolável por mais de 3 horas',
    ],
  },
  {
    grupo: 'Atenção — consulte em breve',
    cor: 'yellow',
    itens: [
      'Perda de peso ou ganho insuficiente por 2+ semanas',
      'Constipação (> 5 dias sem evacuar no lactente)',
      'Sangue nas fezes (estrias ou misturado)',
      'Regurgitações frequentes com choro após as mamadas',
      'Recusa de alimentos sólidos após 9 meses',
      'Distensão abdominal persistente',
    ],
  },
]

const CORES = {
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    header: 'text-red-700',    dot: 'bg-red-400'    },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', header: 'text-orange-700', dot: 'bg-orange-400' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'text-yellow-700', dot: 'bg-yellow-400' },
}

export default function TabAlertas() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Sinais que indicam necessidade de atendimento médico imediato ou em breve.</p>
      {ALERTAS.map(grupo => {
        const c = CORES[grupo.cor]
        return (
          <div key={grupo.grupo} className={`card p-5 border ${c.border} ${c.bg}`}>
            <h3 className={`font-semibold text-sm mb-3 ${c.header}`}>{grupo.grupo}</h3>
            <ul className="space-y-2">
              {grupo.itens.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${c.dot}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
