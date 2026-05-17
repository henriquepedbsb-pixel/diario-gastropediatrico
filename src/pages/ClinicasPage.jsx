import { MapPin, ExternalLink, Phone } from 'lucide-react'

/* Ícone WhatsApp inline */
function IconWhatsApp({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

const CLINICAS = [
  {
    nome:      'PedStar',
    subtitulo: 'Clínica de Pediatria — Noroeste',
    endereco:  'CRNW 510, Lote 2, Bloco A, Loja 07\nEd. Sunset Noroeste — Noroeste, Brasília/DF',
    whatsapp:  '5561998462002',
    whatsappLabel: '(61) 99846-2002',
    maps: 'https://www.google.com/maps/place/PedStar+%7C+Cl%C3%ADnica+de+Pediatria+no+Noroeste/data=!4m2!3m1!1s0x0:0xf1157a5d42392f4a?sa=X&ved=1t:2428&ictx=111',
    cor: 'bg-blue-600',
    corLight: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    nome:      'PedCare',
    subtitulo: 'Centro Integrado de Pediatria — Lago Sul',
    endereco:  'SHIS QI 17, Bloco F, Loja 101 Parte A\nLago Sul, Brasília/DF — CEP 71645-500',
    whatsapp:  '5561986180492',
    whatsappLabel: '(61) 98618-0492',
    maps: 'https://www.google.com/maps/search/pedcare+brasilia/@-15.860607,-47.872620,16z',
    cor: 'bg-teal-600',
    corLight: 'bg-teal-50 text-teal-700 border-teal-200',
  },
]

export default function ClinicasPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Clínicas de Atendimento</h1>
        <p className="text-sm text-slate-500 mt-1">
          Locais de atendimento do Dr. Henrique Gomes
        </p>
      </div>

      {/* Cards das clínicas */}
      {CLINICAS.map(c => (
        <div key={c.nome} className="card overflow-hidden">

          {/* Header colorido */}
          <div className={`${c.cor} px-5 py-4`}>
            <h2 className="text-lg font-bold text-white">{c.nome}</h2>
            <p className="text-sm text-white/80 mt-0.5">{c.subtitulo}</p>
          </div>

          <div className="p-5 space-y-4">

            {/* Endereço */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={15} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Endereço</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{c.endereco}</p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`https://wa.me/${c.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
              >
                <IconWhatsApp size={17} />
                {c.whatsappLabel}
              </a>

              <a
                href={c.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
              >
                <MapPin size={15} />
                Ver no Google Maps
                <ExternalLink size={12} className="opacity-50" />
              </a>
            </div>
          </div>
        </div>
      ))}

      {/* Rodapé informativo */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Phone size={15} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            O agendamento de consultas é feito diretamente pelo WhatsApp de cada clínica ou pelo link{' '}
            <a
              href="https://www.doctoralia.com.br/henrique-gomes-3/gastroenterologista-pediatrico-pediatra/brasilia"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              Doctoralia
            </a>.
          </p>
        </div>
      </div>

    </div>
  )
}
