import { useState } from 'react'

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

export default function TabCalculadora() {
  const [peso, setPeso] = useState('')

  const pesoNum   = parseFloat(peso)
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
