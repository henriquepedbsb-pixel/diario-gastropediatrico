import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

const BRISTOL_COLORS = {
  1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e',
  5: '#eab308', 6: '#f97316', 7: '#ef4444',
}

export default function TabGraficoFezes({ patient }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    supabase.from('stool_records').select('*')
      .eq('patient_id', patient.id)
      .gte('recorded_at', subDays(new Date(), 90).toISOString())
      .order('recorded_at', { ascending: true })
      .then(({ data }) => { setRecords(data ?? []); setLoading(false) })
  }, [patient.id])

  const today = new Date()
  const startDate = subDays(today, period - 1)
  const periodRecords = records.filter(r => parseISO(r.recorded_at) >= startDate)

  const days = eachDayOfInterval({ start: startDate, end: today })
  const freqData = days.map(day => ({
    date: format(day, period === 7 ? 'EEE' : 'dd/MM', { locale: ptBR }),
    qty:  records.filter(r =>
      format(parseISO(r.recorded_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    ).length,
  }))

  const bristolCount = {}
  periodRecords.forEach(r => {
    if (r.bristol_type) bristolCount[r.bristol_type] = (bristolCount[r.bristol_type] || 0) + 1
  })
  const bristolData = Object.entries(bristolCount)
    .map(([type, count]) => ({ name: `Tipo ${type}`, value: count, color: BRISTOL_COLORS[type] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const total = periodRecords.length
  const daysWithRecord = new Set(periodRecords.map(r => format(parseISO(r.recorded_at), 'yyyy-MM-dd'))).size
  const mostCommon = [...bristolData].sort((a, b) => b.value - a.value)[0]

  if (loading) return <div className="card p-8 animate-pulse bg-slate-100 h-40" />

  return (
    <div className="space-y-5">
      {/* Seletor de período */}
      <div className="flex gap-2">
        {[7, 15, 30].map(d => (
          <button key={d} onClick={() => setPeriod(d)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
              ${period === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
            {d} dias
          </button>
        ))}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',               value: total },
          { label: 'Dias com evacuação',  value: daysWithRecord },
          { label: 'Tipo mais comum',     value: mostCommon ? mostCommon.name : '—' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de frequência */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Evacuações por dia</h3>
        {total === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">Nenhum registro no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={freqData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }}
                interval={period === 7 ? 0 : period === 15 ? 1 : 4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Evacuações']} />
              <Bar dataKey="qty" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Distribuição Bristol */}
      {bristolData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Distribuição — Escala de Bristol</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={150}>
              <PieChart>
                <Pie data={bristolData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                  {bristolData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' vezes', n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {bristolData.map(b => (
                <div key={b.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: b.color }} />
                  <span className="text-xs text-slate-600">{b.name}: <strong>{b.value}x</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
