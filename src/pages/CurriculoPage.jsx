import { GraduationCap, Award, Building2, Stethoscope, Star, Heart, CalendarDays, ExternalLink } from 'lucide-react'

/* Ícone Instagram inline (lucide não inclui redes sociais) */
function IconInstagram({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  )
}

const FORMACAO = [
  {
    icon: GraduationCap,
    color: 'bg-blue-100 text-blue-700',
    titulo: 'Residência Médica em Pediatria',
    local: 'Hospital Materno Infantil de Brasília',
    ano: '2006 – 2007',
  },
  {
    icon: GraduationCap,
    color: 'bg-blue-100 text-blue-700',
    titulo: 'Residência Médica em Pediatria — Gastropediatria',
    local: 'Hospital de Base do Distrito Federal',
    ano: '2008 – 2009',
  },
  {
    icon: Award,
    color: 'bg-purple-100 text-purple-700',
    titulo: 'Pós-graduação em Doenças Funcionais do Aparelho Digestivo',
    local: 'Instituto Israelita Albert Einstein',
    ano: '2018',
  },
  {
    icon: Award,
    color: 'bg-purple-100 text-purple-700',
    titulo: 'Pós-graduação em Nutrologia Pediátrica',
    local: 'FG',
    ano: '2023',
  },
]

const ATUACAO = [
  {
    icon: Building2,
    color: 'bg-teal-100 text-teal-700',
    titulo: 'Grupo Santa',
    descricao: 'Mais de 15 anos de experiência em pacientes internados e de emergência.',
  },
  {
    icon: Heart,
    color: 'bg-pink-100 text-pink-700',
    titulo: 'UCIN Canguru — Hospital Materno Infantil de Brasília',
    descricao: 'Unidade de Cuidados Intermediários Neonatais, atendimento a recém-nascidos prematuros e de alto risco.',
  },
  {
    icon: Building2,
    color: 'bg-green-100 text-green-700',
    titulo: 'Secretaria de Saúde do Distrito Federal',
    descricao: 'Atuação desde 2008, com experiência em gestão pública e cargos de liderança.',
  },
]

export default function CurriculoPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="card p-6 flex items-center gap-6">
        {/* Foto perfil */}
        <div className="shrink-0">
          <img
            src="/medico.jpg"
            alt="Dr. Henrique Gomes"
            className="w-36 h-44 rounded-2xl object-cover object-top shadow-md border border-slate-100"
          />
        </div>
        {/* Texto */}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">Dr. Henrique Gomes</h1>
          <p className="text-sm text-teal-600 font-medium mt-0.5">Pediatra · Gastropediatra</p>
          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            Atendimento em pediatria e gastropediatria individualizado para cada paciente.
            Experiência em bebês prematuros. Prevenção é sempre o melhor remédio.
          </p>
          {/* Links */}
          <div className="flex flex-col gap-2 mt-4">
            <a
              href="https://www.doctoralia.com.br/adicionar-opiniao/henrique-gomes-3#/opiniao"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors text-sm font-medium"
            >
              <CalendarDays size={15} />
              Deixar avaliação — Doctoralia
              <ExternalLink size={12} className="ml-auto opacity-60" />
            </a>
            <a
              href="https://www.instagram.com/meumedicopediatra/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors text-sm font-medium"
            >
              <IconInstagram size={15} />
              @meumedicopediatra
              <ExternalLink size={12} className="ml-auto opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* Formação */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <GraduationCap size={16} className="text-blue-600" />
          <h2 className="font-semibold text-slate-700 text-sm">Formação Acadêmica</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {FORMACAO.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 leading-snug">{item.titulo}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.local}</p>
                  <span className="inline-block mt-1.5 text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {item.ano}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Atuação */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Star size={16} className="text-teal-600" />
          <h2 className="font-semibold text-slate-700 text-sm">Atuação Profissional</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {ATUACAO.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 leading-snug">{item.titulo}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.descricao}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Especialidades */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <Award size={16} className="text-purple-600" /> Áreas de Atuação
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            'Pediatria Geral',
            'Gastropediatria',
            'Neonatologia',
            'Doenças Funcionais Digestivas',
            'Bebês Prematuros',
            'Pacientes Internados',
            'Gestão em Saúde',
          ].map(tag => (
            <span key={tag}
              className="text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100 px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

    </div>
  )
}
