import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useExamesFamilia() {
  const [exames,  setExames]  = useState([])
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState(null)

  const fetchExames = useCallback(async (patientId) => {
    if (!patientId) { setExames([]); return }
    setLoading(true)
    setErro(null)
    try {
      const { data, error } = await supabase
        .from('exam_records_family_view')
        .select('id, patient_id, file_path, file_type, exam_name, exam_date, status, uploaded_by_role, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setExames(data || [])
    } catch (err) {
      setErro(err.message || 'Erro ao buscar exames.')
      setExames([])
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadExame = useCallback(async (patientId, file) => {
    if (!patientId || !file) throw new Error('Selecione o paciente e o arquivo.')

    const isPdf = file.type === 'application/pdf'
    const isImg = file.type.startsWith('image/')
    if (!isPdf && !isImg) throw new Error('Envie um PDF ou uma foto (JPG/PNG).')

    const ext  = isPdf ? 'pdf' : (file.name.split('.').pop() || 'jpg')
    const path = `${patientId}/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await supabase
      .storage.from('exames-pacientes')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) throw new Error(`Falha no upload: ${upErr.message}`)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: row, error: insErr } = await supabase
      .from('exam_records')
      .insert({
        patient_id:       patientId,
        file_path:        path,
        file_type:        isPdf ? 'pdf' : 'image',
        status:           'uploaded',
        uploaded_by_role: 'familia',
        created_by:       user?.id || null,
      })
      .select('id')
      .single()
    if (insErr) throw new Error(`Falha ao registrar exame: ${insErr.message}`)

    // Dispara transcrição em segundo plano — não bloqueia a família, e o resultado
    // (campos clínicos) nunca aparece para ela de qualquer forma (view não expõe esses campos).
    supabase.functions.invoke('transcribe-exam', { body: { examId: row.id } }).catch(() => {})

    return row
  }, [])

  const getUrlArquivo = useCallback(async (filePath) => {
    const { data, error } = await supabase
      .storage.from('exames-pacientes')
      .createSignedUrl(filePath, 120)
    if (error) throw new Error('Não foi possível abrir o arquivo.')
    return data.signedUrl
  }, [])

  return { exames, loading, erro, fetchExames, uploadExame, getUrlArquivo }
}
