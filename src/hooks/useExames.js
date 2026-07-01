import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useExames() {
  const [exames,  setExames]  = useState([])
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState(null)

  const fetchExames = useCallback(async (patientId) => {
    if (!patientId) { setExames([]); return }
    setLoading(true)
    setErro(null)
    try {
      const { data, error } = await supabase
        .from('exam_records')
        .select('*')
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
    if (!patientId || !file) throw new Error('Paciente e arquivo são obrigatórios.')

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
        patient_id: patientId,
        file_path:  path,
        file_type:  isPdf ? 'pdf' : 'image',
        status:     'uploaded',
        created_by: user?.id || null,
      })
      .select()
      .single()
    if (insErr) throw new Error(`Falha ao registrar exame: ${insErr.message}`)

    supabase.functions.invoke('transcribe-exam', { body: { examId: row.id } }).catch(() => {})

    return row
  }, [])

  const reprocessar = useCallback(async (examId) => {
    await supabase.from('exam_records').update({ status: 'processing' }).eq('id', examId)
    await supabase.functions.invoke('transcribe-exam', { body: { examId } })
  }, [])

  const salvarRevisao = useCallback(async ({ examId, examName, examDate, structuredData, doctorNotes }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('exam_records')
      .update({
        exam_name:       examName,
        exam_date:       examDate || null,
        structured_data: structuredData,
        doctor_notes:    doctorNotes,
        status:          'reviewed',
        reviewed_by:     user?.id || null,
        reviewed_at:     new Date().toISOString(),
      })
      .eq('id', examId)
    if (error) throw new Error(`Falha ao salvar revisão: ${error.message}`)
  }, [])

  const apagarExame = useCallback(async (exame) => {
    if (!exame?.id) throw new Error('Exame inválido.')

    // 1. Remove o arquivo do Storage (ignora se já não existir)
    if (exame.file_path) {
      const { error: stErr } = await supabase
        .storage.from('exames-pacientes')
        .remove([exame.file_path])
      // Não interrompe se o arquivo já foi removido — segue para apagar o registro
      if (stErr && !/not found/i.test(stErr.message)) {
        throw new Error(`Falha ao remover arquivo: ${stErr.message}`)
      }
    }

    // 2. Remove o registro do banco
    const { error: delErr } = await supabase
      .from('exam_records')
      .delete()
      .eq('id', exame.id)
    if (delErr) throw new Error(`Falha ao apagar exame: ${delErr.message}`)
  }, [])

  const getUrlArquivo = useCallback(async (filePath) => {
    const { data, error } = await supabase
      .storage.from('exames-pacientes')
      .createSignedUrl(filePath, 120)
    if (error) throw new Error('Não foi possível abrir o arquivo.')
    return data.signedUrl
  }, [])

  return { exames, loading, erro, fetchExames, uploadExame, reprocessar, salvarRevisao, apagarExame, getUrlArquivo }
}
