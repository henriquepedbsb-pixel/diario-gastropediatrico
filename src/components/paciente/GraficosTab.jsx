import { useMemo, useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Scatter,
} from 'recharts'
import {
  WHO_PESO_MENINOS, WHO_PESO_MENINAS,
  WHO_ALTURA_MENINOS, WHO_ALTURA_MENINAS,
  WHO_PC_MENINOS, WHO_PC_MENINAS,
} from '../../lib/whoData'

function idadeEmMesesNaData(dataNascimento, dataConsulta) {
  const nasc = new Date(dataNascimento)
  const cons = new Date(dataConsulta)
  return Math.floor(differenceInDays(cons, nasc) / 30.44)
}

function buildChartData(whoData, medidas, dataNascimento, campo) {
  // WHO reference lines (up to 24 months)
  const whoPoints = whoData.map(w => ({
    mes: w.mes, p3: w.p3, p50: w.p50, p97: w.p97,
  }))

  // Merge patient data
  const patientPoints = medidas
    .filter(m => m[campo] !== null && m[campo] !== undefined)
    .map(m => ({
      mes:    idadeEmMesesNaData(dataNascimento, m.data),
      paciente: m[campo],
      data:   format(parseISO(m.data), 'dd/MM/yy'),
    }))

  // Combine by mes
  const allMeses = new Set([...whoPoints.map(w => w.mes), ...patientPoints.map(p => p.mes)])
  const combined = Array.from(allMeses).sort((a, b) => a - b).map(mes => {
    const who = whoPoints.find(w => w.mes === mes) ?? {}
    const pat = patientPoints.find(p => p.mes === mes) ?? {}
    return { mes, ...who, ...pat }
  })
  return combined
}

const CustomTooltip = ({ active, payload, label, unidade }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label} meses</p>
      {payload.map(p => p.value != null && (
        <p key={p.name} style={{ color: p.color }} className="mb-0.5">
          {p.name}: <strong>{Number(p.value).toFixed(1)}{unidade}</strong>
        </p>
      ))}
    </div>
  )
}

function GrowthChart({ title, data, unidade, cor }) {
  const temDados = data.some(d => d.paciente != null)
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {!temDados && <span className="text-xs text-slate-400 italic">Sem medidas do paciente ainda</span>}
      </div>
      <p className="text-xs text-slate-400 mb-4">Curvas OMS — P3, P50, P97 · {unidade}</p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} label={{ value: 'Meses', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip unidade={unidade} />} />
          <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />

          {/* WHO reference curves */}
          <Line dataKey="p3"  name="P3 (OMS)"  stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />
          <Line dataKey="p50" name="P50 (OMS)" stroke="#64748b" strokeWidth={2}   dot={false} connectNulls />
          <Line dataKey="p97" name="P97 (OMS)" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />

          {/* Patient data */}
          <Line
            dataKey="paciente"
            name="Paciente"
            stroke={cor}
            strokeWidth={2.5}
            dot={{ r: 5, fill: cor, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function GraficosTab({ paciente, medidas }) {
  const ehMenino = paciente.sexo === 'M'
  const nasc     = paciente.data_nascimento

  const pesoData  = useMemo(() => buildChartData(
    ehMenino ? WHO_PESO_MENINOS   : WHO_PESO_MENINAS,   medidas, nasc, 'peso'
  ), [medidas, nasc, ehMenino])

  const alturaData = useMemo(() => buildChartData(
    ehMenino ? WHO_ALTURA_MENINOS : WHO_ALTURA_MENINAS, medidas, nasc, 'comprimento'
  ), [medidas, nasc, ehMenino])

  const pcData    = useMemo(() => buildChartData(
    ehMenino ? WHO_PC_MENINOS     : WHO_PC_MENINAS,     medidas, nasc, 'perimetro_cefalico'
  ), [medidas, nasc, ehMenino])

  if (!nasc) return (
    <div className="text-center py-12 text-slate-400 text-sm">
      Data de nascimento não cadastrada — necessária para calcular a idade.
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
        📊 Curvas de crescimento baseadas nos padrões OMS 2006 · {ehMenino ? 'Masculino' : 'Feminino'} ·
        Registre medidas na aba <strong>Perfil</strong> para visualizar a evolução do paciente.
      </div>

      <GrowthChart title="⚖️ Peso por Idade"          data={pesoData}   unidade="kg" cor="#3b82f6" />
      <GrowthChart title="📏 Comprimento por Idade"   data={alturaData} unidade="cm" cor="#10b981" />
      <GrowthChart title="🧠 Perímetro Cefálico por Idade" data={pcData} unidade="cm" cor="#8b5cf6" />
    </div>
  )
}
