import { useMemo, useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Info, Baby } from 'lucide-react'
import {
  MEDIDAS, sexoRef, ehPrematuro, igDias, formatarIG, curvaSugerida,
  posicaoIG, posicaoOMS, centisIG, centisOMS, zIG, zOMS, percentilDeZ,
  formatarIdadeMeses, IG_IPM_MIN, IG_IPM_MAX, OMS_MAX_MESES,
} from '../../lib/crescimento'

/* ─────────────────────────────────────────────────────────────
   Curvas de crescimento (OMS 2006 · INTERGROWTH-21st prematuros)
   modo="medico"  → escore-z e percentil por medida
   modo="familia" → só o gráfico e as medidas, sem interpretação
───────────────────────────────────────────────────────────── */

const LINHAS = {
  ig:  [['P3', 'dash'], ['P10', 'fina'], ['P50', 'forte'], ['P90', 'fina'], ['P97', 'dash']],
  oms: [['P3', 'dash'], ['P15', 'fina'], ['P50', 'forte'], ['P85', 'fina'], ['P97', 'dash']],
}
const ESTILO = {
  forte: { stroke: '#64748b', strokeWidth: 2 },
  fina:  { stroke: '#94a3b8', strokeWidth: 1.25 },
  dash:  { stroke: '#cbd5e1', strokeWidth: 1.25, strokeDasharray: '5 4' },
}
const fmtNum = (v, casas) => (v == null ? '—' : Number(v).toFixed(casas).replace('.', ','))
const fmtZ = (z) => {
  if (z == null) return '—'
  const r = Math.round(z * 10) / 10
  return r === 0 ? '0,0' : `${r > 0 ? '+' : ''}${r.toFixed(1).replace('.', ',')}`
}
const fmtP = (z) => {
  const p = percentilDeZ(z)
  if (p == null) return '—'
  if (p < 0.1) return '<0,1'
  if (p > 99.9) return '>99,9'
  return p < 10 || p > 90 ? p.toFixed(1).replace('.', ',') : Math.round(p).toString()
}

export default function CurvasCrescimento({ patient, medidas = [], modo = 'medico' }) {
  const sexo      = sexoRef(patient)
  const prematuro = ehPrematuro(patient)
  const [curva,  setCurva]  = useState(() => curvaSugerida(patient, medidas))
  const [medida, setMedida] = useState('peso')

  // Ajusta a curva sugerida quando chegam as medidas ou muda a IG
  useEffect(() => { setCurva(curvaSugerida(patient, medidas)) },
    [patient?.id, patient?.gestational_age_weeks, patient?.gestational_age_days, medidas.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const meta = MEDIDAS[medida]
  const curvaAtiva = prematuro ? curva : 'oms'

  /* Pontos do paciente na curva ativa */
  const { pontos, foraDaCurva } = useMemo(() => {
    const comValor = medidas.filter(m => m[meta.campo] != null && m[meta.campo] !== '')
    const pts = []
    for (const m of comValor) {
      const valor = Number(m[meta.campo])
      if (!(valor > 0)) continue
      if (curvaAtiva === 'ig') {
        const x = posicaoIG(patient, m.recorded_at)
        if (x == null) continue
        pts.push({ x, valor, data: m.recorded_at, z: sexo ? zIG(sexo, medida, x, valor) : null, idade: (() => { const d = Math.round(x * 7); return `${Math.floor(d / 7)}+${d % 7} sem IPM` })() })
      } else {
        const pos = posicaoOMS(patient, m.recorded_at)
        if (!pos) continue
        pts.push({ x: pos.meses, valor, data: m.recorded_at, z: sexo ? zOMS(sexo, medida, pos.meses, valor) : null,
          idade: formatarIdadeMeses(pos.meses) + (pos.corrigida ? ' (corrigida)' : '') })
      }
    }
    pts.sort((a, b) => a.x - b.x)
    return { pontos: pts, foraDaCurva: comValor.length - pts.length }
  }, [medidas, meta.campo, curvaAtiva, patient, sexo, medida])

  /* Linhas de referência */
  const { referencia, dominio } = useMemo(() => {
    if (!sexo) return { referencia: [], dominio: [0, 1] }
    if (curvaAtiva === 'ig') {
      const ref = []
      for (let s = IG_IPM_MIN; s <= IG_IPM_MAX; s++) ref.push({ x: s, ...centisIG(sexo, medida, s) })
      const xs = pontos.map(p => p.x)
      const ini = xs.length ? Math.max(IG_IPM_MIN, Math.floor(Math.min(...xs)) - 2) : IG_IPM_MIN
      return { referencia: ref, dominio: [ini, IG_IPM_MAX] }
    }
    const maxPac = pontos.length ? Math.max(...pontos.map(p => p.x)) : 0
    const fim = Math.min(OMS_MAX_MESES, Math.max(12, Math.ceil((maxPac + 6) / 6) * 6))
    const ref = []
    for (let m = 0; m <= fim; m += m < 24 ? 0.5 : 1) ref.push({ x: m, ...centisOMS(sexo, medida, m) })
    return { referencia: ref, dominio: [0, fim] }
  }, [sexo, curvaAtiva, medida, pontos])

  if (!sexo) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        Para ver as curvas, informe o <strong>sexo</strong> no cadastro da criança.
      </div>
    )
  }

  const ticksX = curvaAtiva === 'ig'
    ? Array.from({ length: Math.floor((dominio[1] - dominio[0]) / 2) + 1 }, (_, i) => dominio[0] + i * 2)
    : undefined

  const TooltipConteudo = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const p = payload.find(i => i.dataKey === 'valor')?.payload
    if (!p) return null
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs space-y-0.5">
        <p className="font-semibold text-slate-800">{format(parseISO(p.data), 'dd/MM/yyyy')}</p>
        <p className="text-slate-500">{p.idade}</p>
        <p className="text-slate-800">{meta.rotulo}: <strong>{fmtNum(p.valor, meta.casas)} {meta.unidade}</strong></p>
        {modo === 'medico' && <p className="text-slate-500">z {fmtZ(p.z)} · P {fmtP(p.z)}</p>}
      </div>
    )
  }

  const nomeCurva = curvaAtiva === 'ig' ? 'INTERGROWTH-21st (prematuros)' : 'OMS 2006'

  return (
    <div className="space-y-4">

      {/* Seletores */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-full overflow-x-auto">
          {Object.entries(MEDIDAS).map(([id, m]) => (
            <button key={id} onClick={() => setMedida(id)}
              className={`flex-1 sm:flex-none whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${medida === id ? 'bg-white text-noite shadow-sm' : 'text-slate-500'}`}>
              {id === 'comprimento' ? 'Comprimento' : m.rotulo}
            </button>
          ))}
        </div>
        {prematuro && (
          <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
            {[['ig', 'Prematuro (IPM)'], ['oms', 'OMS (idade corrigida)']].map(([id, label]) => (
              <button key={id} onClick={() => setCurva(id)}
                className={`flex-1 sm:flex-none whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                  ${curva === id ? 'bg-white text-noite shadow-sm' : 'text-slate-500'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gráfico */}
      <div className="card p-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="font-semibold text-slate-700 text-sm">{meta.rotulo} · {sexo === 'M' ? 'Meninos' : 'Meninas'}</h3>
          <span className="text-[11px] text-slate-400 text-right">{nomeCurva}</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          {curvaAtiva === 'ig'
            ? 'Eixo: idade pós-menstrual (semanas) · linhas P3, P10, P50, P90, P97'
            : `Eixo: idade${prematuro ? ' corrigida até 24 meses' : ''} (meses) · linhas P3, P15, P50, P85, P97`}
        </p>
        <div className="h-64 sm:h-72 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 6, right: 34, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" domain={dominio} ticks={ticksX} allowDataOverflow
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={v => (curvaAtiva === 'ig' ? `${v}` : v >= 24 && v % 12 === 0 ? `${v / 12}a` : `${v}`)} />
              <YAxis domain={['auto', 'auto']} width={38} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<TooltipConteudo />} />
              {LINHAS[curvaAtiva].map(([k, est]) => (
                <Line key={k} data={referencia} dataKey={k} dot={false} activeDot={false} isAnimationActive={false}
                  type="monotone" {...ESTILO[est]}
                  label={({ index, x, y }) => (index === referencia.length - 1
                    ? <text x={x + 4} y={y + 3} fontSize={9} fill="#94a3b8">{k}</text> : null)} />
              ))}
              <Line data={pontos} dataKey="valor" stroke="#1d4ed8" strokeWidth={2} isAnimationActive={false}
                dot={{ r: 4, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {pontos.length === 0 && (
          <p className="text-xs text-slate-400 text-center -mt-2">Nenhuma medida de {meta.rotulo.toLowerCase()} nesta curva ainda.</p>
        )}
        {foraDaCurva > 0 && (
          <p className="text-[11px] text-slate-400 mt-2">
            {foraDaCurva} medida{foraDaCurva > 1 ? 's' : ''} fora da faixa desta curva
            {prematuro ? ' (veja a outra aba)' : curvaAtiva === 'oms' ? ' (a curva OMS 2006 vai até 5 anos)' : ''}.
          </p>
        )}
      </div>

      {/* Medidas */}
      {pontos.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Idade</th>
                <th className="px-3 py-2 text-right font-medium">{meta.unidade}</th>
                {modo === 'medico' && <th className="px-3 py-2 text-right font-medium">z</th>}
                {modo === 'medico' && <th className="px-3 py-2 text-right font-medium">P</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...pontos].reverse().map(p => (
                <tr key={p.data + p.valor}>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">{format(parseISO(p.data), 'dd/MM/yy')}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{p.idade}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">{fmtNum(p.valor, meta.casas)}</td>
                  {modo === 'medico' && <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtZ(p.z)}</td>}
                  {modo === 'medico' && <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtP(p.z)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notas */}
      {modo === 'familia' ? (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            As linhas cinzas mostram a faixa de crescimento de referência para a idade. Cada criança tem o seu
            ritmo, e o mais importante é a evolução ao longo do tempo. <strong>Quem interpreta a curva é o
            médico</strong>, na consulta — se tiver dúvidas, anote no Meu Diário para conversar.
            {prematuro && ' Para bebês prematuros, usamos a curva própria de prematuros e a idade corrigida.'}
          </p>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 leading-relaxed space-y-1">
          {prematuro ? (
            <p className="flex items-start gap-1.5"><Baby size={12} className="shrink-0 mt-0.5" />
              Prematuro ({formatarIG(patient)}): INTERGROWTH-21st de {IG_IPM_MIN} a {IG_IPM_MAX} sem de IPM; depois,
              OMS pela idade corrigida até 24 meses corrigidos e, em seguida, idade cronológica.</p>
          ) : igDias(patient) == null ? (
            <p>Idade gestacional não informada: curvas OMS pela idade cronológica.</p>
          ) : null}
          <p>Fontes: WHO Child Growth Standards 2006 (LMS); Villar J et al. Lancet Glob Health 2015;3:e681-91
            (INTERGROWTH-21st). z da INTERGROWTH aproximado por interpolação entre as linhas de DP.
            Ferramenta de apoio: a interpretação clínica é do médico.</p>
        </div>
      )}
    </div>
  )
}
