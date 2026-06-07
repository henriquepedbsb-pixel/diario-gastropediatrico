import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRelatorio() {
  const [dados,   setDados]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState(null)

  const buscarDados = useCallback(async ({ pacienteId, dataInicio, dataFim }) => {
    if (!pacienteId || !dataInicio || !dataFim) {
      setErro('Selecione o paciente e o período para gerar o relatório.')
      return
    }

    setLoading(true)
    setErro(null)
    setDados(null)

    try {
      const [resPac, resSin, resSon, resAma] = await Promise.all([

        supabase
          .from('patients')
          .select('id, name, birthdate, gender, allergies, notes')
          .eq('id', pacienteId)
          .single(),

        supabase
          .from('symptom_records')
          .select('id, recorded_at, symptoms, severity, fever_temp, notes, created_at')
          .eq('patient_id', pacienteId)
          .gte('recorded_at', `${dataInicio}T00:00:00`)
          .lte('recorded_at', `${dataFim}T23:59:59`)
          .order('recorded_at', { ascending: true }),

        supabase
          .from('sleep_records')
          .select('id, sleep_start, sleep_end, duration_minutes, quality, notes, created_at')
          .eq('patient_id', pacienteId)
          .gte('sleep_start', `${dataInicio}T00:00:00`)
          .lte('sleep_start', `${dataFim}T23:59:59`)
          .order('sleep_start', { ascending: true }),

        supabase
          .from('breastfeeding_records')
          .select('id, started_at, duration_minutes, side, notes, created_at')
          .eq('patient_id', pacienteId)
          .gte('started_at', `${dataInicio}T00:00:00`)
          .lte('started_at', `${dataFim}T23:59:59`)
          .order('started_at', { ascending: true }),
      ])

      if (resPac.error) throw new Error(`Paciente não encontrado: ${resPac.error.message}`)

      const sintomas    = resSin.error ? [] : (resSin.data || [])
      const sono        = resSon.error ? [] : (resSon.data || [])
      const amamentacao = resAma.error ? [] : (resAma.data || [])

      const diasSet = new Set([
        ...sintomas.map(r    => r.recorded_at?.slice(0, 10)),
        ...sono.map(r        => r.sleep_start?.slice(0, 10)),
        ...amamentacao.map(r => r.started_at?.slice(0, 10)),
      ].filter(Boolean))

      const freq = sintomas
        .flatMap(r => Array.isArray(r.symptoms) ? r.symptoms : [])
        .reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {})
      const sintomaTop = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null

      const comDuracao   = sono.filter(r => Number(r.duration_minutes) > 0)
      const mediaSonoMin = comDuracao.length
        ? Math.round(comDuracao.reduce((s, r) => s + Number(r.duration_minutes), 0) / comDuracao.length)
        : null

      setDados({
        paciente: resPac.data,
        sintomas,
        sono,
        amamentacao,
        periodo:  { inicio: dataInicio, fim: dataFim },
        geradoEm: new Date().toISOString(),
        stats: {
          totalRegistros:  sintomas.length + sono.length + amamentacao.length,
          diasComRegistro: diasSet.size,
          sintomaTop,
          mediaSonoMin,
        },
      })
    } catch (err) {
      setErro(err.message || 'Erro ao buscar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  const limpar = useCallback(() => { setDados(null); setErro(null) }, [])

  return { dados, loading, erro, buscarDados, limpar }
}
