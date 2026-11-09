import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import CurvasCrescimento from '../crescimento/CurvasCrescimento'

/* Crescimento — visão da FAMÍLIA (somente leitura, sem interpretação) */
export default function TabCrescimentoFamilia({ patient }) {
  const [medidas, setMedidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState('')

  useEffect(() => {
    let ativo = true
    setLoading(true); setErro('')
    supabase
      .from('growth_records')
      .select('id, recorded_at, weight_kg, height_cm, head_circumference_cm')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: true })
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setErro('Não foi possível carregar as medidas.')
        setMedidas(data ?? [])
        setLoading(false)
      })
    return () => { ativo = false }
  }, [patient.id])

  if (loading) return <div className="card h-72 animate-pulse bg-slate-100" />
  if (erro) return <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{erro}</div>

  if (medidas.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-400">
        <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Ainda não há medidas registradas</p>
        <p className="text-xs mt-1 max-w-xs mx-auto">Peso, comprimento e perímetro cefálico são registrados pelo médico nas consultas e aparecem aqui.</p>
      </div>
    )
  }

  return <CurvasCrescimento patient={patient} medidas={medidas} modo="familia" />
}
