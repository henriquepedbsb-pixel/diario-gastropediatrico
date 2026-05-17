import { useState } from 'react'
import { Pill, Ruler } from 'lucide-react'

/* ═══════════════════════════════════════════
   CALCULADORA DE DOSE DE MEDICAMENTOS
═══════════════════════════════════════════ */
function calcular(c, pesoNum) {
  const pesoInt = Math.floor(pesoNum)

  if (c.tipo === 'gotas_por_kg') {
    return { valor: Math.min(Math.round(pesoNum * c.gotas_por_kg), c.max_gotas), unidade: 'gotas', aviso: null }
  }

  if (c.tipo === 'lookup_exact') {
    const entrada = c.tabela.find(e => e.peso === pesoInt)
    if (!entrada) return { valor: null, unidade: 'mL', aviso: 'Peso fora da tabela' }
    return { valor: entrada.vol.toFixed(1), unidade: 'mL', aviso: null }
  }

  if (c.tipo === 'lookup_range') {
    const entrada = c.tabela.find(e => pesoInt >= e.min && pesoInt <= e.max)
    if (!entrada) return { valor: null, unidade: 'mL', aviso: 'Peso fora da tabela' }
    return { valor: entrada.vol % 1 === 0 ? entrada.vol.toFixed(0) : entrada.vol.toFixed(1), unidade: 'mL', aviso: null }
  }

  if (c.tipo === 'lookup_range_minmax') {
    const entrada = c.tabela.find(e => pesoInt >= e.min && pesoInt <= e.max)
    if (!entrada) return { valor: null, aviso: 'Peso fora da tabela' }
    const fmt = v => v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '')
    if (c.gotas_por_ml) {
      const gMin = Math.round(entrada.vol_min * c.gotas_por_ml)
      const gMax = Math.round(entrada.vol_max * c.gotas_por_ml)
      return { valor: `${gMin} a ${gMax}`, unidade: 'gotas', aviso: null }
    }
    return { valor: `${fmt(entrada.vol_min)} a ${fmt(entrada.vol_max)}`, unidade: 'mL', aviso: null }
  }

  if (c.tipo === 'mg_kg') {
    const doseMg  = Math.min(pesoNum * c.dose_mg_kg, c.max_dose_mg)
    const atingiu = pesoNum * c.dose_mg_kg > c.max_dose_mg
    if (c.gotas_por_ml) {
      const gotas = Math.round(doseMg / c.mg_ml * c.gotas_por_ml)
      return { valor: gotas, unidade: 'gotas', aviso: atingiu ? 'dose máxima' : null, doseMg }
    }
    return { valor: (doseMg / c.mg_ml).toFixed(2), unidade: 'mL', aviso: atingiu ? 'dose máxima' : null, doseMg }
  }

  return null
}

const MEDICAMENTOS = [
  {
    nome: 'Paracetamol',
    intervalo: '4/4h a 6/6h',
    info: 'Máx. 5 doses/dia · Para < 11 kg ou < 2 anos, consulte o médico',
    concentracoes: [
      {
        label: 'Solução Oral 200 mg/mL',
        tipo: 'gotas_por_kg',
        gotas_por_kg: 1,
        max_gotas: 35,
      },
      {
        label: 'Suspensão Concentrada 100 mg/mL',
        tipo: 'lookup_exact',
        tabela: [
          { peso: 3,  vol: 0.4 },
          { peso: 4,  vol: 0.5 },
          { peso: 5,  vol: 0.6 },
          { peso: 6,  vol: 0.8 },
          { peso: 7,  vol: 0.9 },
          { peso: 8,  vol: 1.0 },
          { peso: 9,  vol: 1.1 },
          { peso: 10, vol: 1.3 },
          { peso: 11, vol: 1.4 },
          { peso: 12, vol: 1.5 },
          { peso: 13, vol: 1.6 },
        ],
      },
      {
        label: 'Suspensão Oral 32 mg/mL',
        tipo: 'lookup_range',
        tabela: [
          { min: 11, max: 15, vol: 5   },
          { min: 16, max: 21, vol: 7.5 },
          { min: 22, max: 26, vol: 10  },
          { min: 27, max: 31, vol: 12.5 },
          { min: 32, max: 43, vol: 15  },
        ],
      },
    ],
  },
  {
    nome: 'Ibuprofeno',
    intervalo: '8/8h',
    concentracoes: [
      { label: 'Gotas 100 mg/mL',     tipo: 'mg_kg', dose_mg_kg: 5, mg_ml: 100, max_dose_mg: 400, gotas_por_ml: 20 },
      { label: 'Suspensão 100 mg/5mL', tipo: 'mg_kg', dose_mg_kg: 5, mg_ml: 20,  max_dose_mg: 400 },
    ],
  },
  {
    nome: 'Dipirona (Novalgina)',
    intervalo: '6/6h',
    info: 'Máx. 4 doses/dia',
    concentracoes: [
      {
        label: 'Gotas 500 mg/mL',
        tipo: 'gotas_por_kg',
        gotas_por_kg: 0.8,
        max_gotas: 999,
      },
      {
        label: 'Suspensão 50 mg/mL',
        tipo: 'lookup_range_minmax',
        tabela: [
          { min: 5,  max: 8,  vol_min: 1.25, vol_max: 2.5  },
          { min: 9,  max: 15, vol_min: 2.5,  vol_max: 5    },
          { min: 16, max: 23, vol_min: 3.75, vol_max: 7.5  },
          { min: 24, max: 30, vol_min: 5,    vol_max: 10   },
          { min: 31, max: 45, vol_min: 7.5,  vol_max: 15   },
          { min: 46, max: 53, vol_min: 8.75, vol_max: 17.5 },
        ],
      },
    ],
  },
]

function CalcDose() {
  const [peso, setPeso] = useState('')
  const pesoNum    = parseFloat(peso)
  const pesoValido = !isNaN(pesoNum) && pesoNum > 0 && pesoNum < 100

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <label className="label">Peso atual da criança (kg)</label>
        <input
          type="number" step="0.1" min="1" max="99" className="input"
          placeholder="Ex: 8.5"
          value={peso}
          onChange={e => setPeso(e.target.value)}
        />
        {peso && !pesoValido && (
          <p className="text-xs text-red-500 mt-1">Informe um peso válido (1–99 kg)</p>
        )}
      </div>

      {pesoValido && (
        <div className="space-y-3">
          {MEDICAMENTOS.map(med => (
            <div key={med.nome} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{med.nome}</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{med.intervalo}</span>
              </div>
              {med.info && (
                <p className="text-xs text-slate-400 leading-relaxed">{med.info}</p>
              )}
              <div className="space-y-1.5">
                {med.concentracoes.map(c => {
                  const res = calcular(c, pesoNum)
                  return (
                    <div key={c.label} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 gap-2">
                      <span className="text-xs text-slate-600">{c.label}</span>
                      {res?.valor != null ? (
                        <span className="text-sm font-semibold text-blue-700 shrink-0">
                          {res.valor} {res.unidade}
                          {res.aviso && (
                            <span className="ml-1 text-xs text-amber-500 font-normal">({res.aviso})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 shrink-0">{res?.aviso ?? '—'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 border-amber-200 bg-amber-50">
        <p className="text-xs text-amber-800 leading-relaxed">
          ⚠️ <strong>Atenção:</strong> Este calculador é apenas orientativo. Sempre confirme a dose com o médico antes de administrar qualquer medicamento.
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   CALCULADORA DE ALTURA-ALVO (ESTATURA GENÉTICA)
═══════════════════════════════════════════ */
function CalcAlturaAlvo() {
  const [alturaPai,   setAlturaPai]   = useState('')
  const [alturaMae,   setAlturaMae]   = useState('')
  const [sexo,        setSexo]        = useState('M')

  const pai = parseFloat(alturaPai)
  const mae = parseFloat(alturaMae)
  const valido = !isNaN(pai) && !isNaN(mae) && pai > 100 && pai < 230 && mae > 100 && mae < 230

  let alvoMin = null, alvoMax = null, alvoMedio = null
  if (valido) {
    // Fórmula de Tanner (estatura-alvo genética)
    const correcao = sexo === 'M' ? +13 : -13
    alvoMedio = (pai + mae + correcao) / 2
    alvoMin   = alvoMedio - 8.5
    alvoMax   = alvoMedio + 8.5
  }

  const fmt = v => v != null ? v.toFixed(1) : '—'

  return (
    <div className="space-y-4">
      {/* Sexo */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Sexo biológico da criança</label>
          <div className="flex gap-2 mt-1">
            {[{ v: 'M', l: '♂ Masculino' }, { v: 'F', l: '♀ Feminino' }].map(op => (
              <button key={op.v} onClick={() => setSexo(op.v)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                  ${sexo === op.v
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {op.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Altura do pai (cm)</label>
            <input type="number" step="0.1" min="100" max="230" className="input"
              placeholder="Ex: 178"
              value={alturaPai}
              onChange={e => setAlturaPai(e.target.value)} />
          </div>
          <div>
            <label className="label">Altura da mãe (cm)</label>
            <input type="number" step="0.1" min="100" max="230" className="input"
              placeholder="Ex: 163"
              value={alturaMae}
              onChange={e => setAlturaMae(e.target.value)} />
          </div>
        </div>

        {alturaPai && alturaMae && !valido && (
          <p className="text-xs text-red-500">Informe alturas válidas (100–230 cm)</p>
        )}
      </div>

      {/* Resultado */}
      {valido && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Ruler size={18} className="text-blue-500" />
            Estatura-alvo genética (Fórmula de Tanner)
          </h3>

          {/* Alvo central */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-500 font-medium mb-1">Estatura-alvo central</p>
            <p className="text-4xl font-bold text-blue-700">{fmt(alvoMedio)} cm</p>
          </div>

          {/* Faixa normal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Limite inferior</p>
              <p className="text-xl font-bold text-slate-700">{fmt(alvoMin)} cm</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Limite superior</p>
              <p className="text-xl font-bold text-slate-700">{fmt(alvoMax)} cm</p>
            </div>
          </div>

          {/* Faixa visual */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{fmt(alvoMin)}</span>
              <span>Faixa normal (±8,5 cm)</span>
              <span>{fmt(alvoMax)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
                <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-500 to-blue-200 rounded-full w-3/4" />
              </div>
            </div>
          </div>

          {/* Fórmula */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-1">Como foi calculado:</p>
            <p className="text-xs text-slate-500 font-mono">
              ({fmt(pai)} + {fmt(mae)} {sexo === 'M' ? '+ 13' : '− 13'}) ÷ 2 = {fmt(alvoMedio)} cm
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {sexo === 'M' ? '♂ Masculino: soma +13 cm' : '♀ Feminino: subtrai 13 cm'} · Faixa normal: ±8,5 cm
            </p>
          </div>
        </div>
      )}

      <div className="card p-4 border-amber-200 bg-amber-50">
        <p className="text-xs text-amber-800 leading-relaxed">
          ⚠️ A estatura-alvo genética é uma <strong>estimativa</strong> baseada nas alturas dos pais. Fatores como nutrição, saúde e ambiente influenciam o crescimento real. Avalie sempre com o médico.
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   COMPONENTE PRINCIPAL — 2 calculadoras
═══════════════════════════════════════════ */
export default function TabCalculadora() {
  const [aba, setAba] = useState('dose')

  return (
    <div className="space-y-4">
      {/* Seletor de calculadora */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setAba('dose')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
            ${aba === 'dose'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'}`}>
          <Pill size={15} /> Dose de Medicamentos
        </button>
        <button
          onClick={() => setAba('altura')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
            ${aba === 'altura'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'}`}>
          <Ruler size={15} /> Altura-Alvo
        </button>
      </div>

      {aba === 'dose'   && <CalcDose />}
      {aba === 'altura' && <CalcAlturaAlvo />}
    </div>
  )
}
