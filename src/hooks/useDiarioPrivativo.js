import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDiarioPrivativo() {
  const [notas,   setNotas]   = useState([])
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState(null)

  const fetchNotas = useCallback(async (patientId) => {
    if (!patientId) { setNotas([]); return }
    setLoading(true)
    setErro(null)
    try {
      const { data, error } = await supabase
        .from('private_clinical_notes')
        .select('id, content, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setNotas(data || [])
    } catch (err) {
      setErro(err.message || 'Erro ao buscar anotações.')
      setNotas([])
    } finally {
      setLoading(false)
    }
  }, [])

  const adicionarNota = useCallback(async (patientId, content) => {
    if (!patientId || !content?.trim()) throw new Error('Escreva algo antes de salvar.')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('private_clinical_notes')
      .insert({ patient_id: patientId, doctor_id: user?.id || null, content: content.trim() })
    if (error) throw new Error(`Falha ao salvar: ${error.message}`)
  }, [])

  return { notas, loading, erro, fetchNotas, adicionarNota }
}
