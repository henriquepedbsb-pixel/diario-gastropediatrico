import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ─────────────────────────────────────────────────────────────
   Meu Diário — anotações livres da família
   Tabela: family_journal_entries · Bucket privado: diario-familia
   RLS garante: família vê só o próprio filho; médico vê só as
   anotações compartilhadas (visibility = 'shared').
───────────────────────────────────────────────────────────── */

const BUCKET      = 'diario-familia'
const MAX_CHARS   = 5000
const MAX_BYTES   = 10 * 1024 * 1024
const MAX_LADO_PX = 1600

export const TAGS_DIARIO = {
  observacao: { label: 'Observação',         emoji: '📝', cor: 'bg-slate-100 text-slate-700'   },
  duvida:     { label: 'Dúvida p/ consulta', emoji: '❓', cor: 'bg-amber-100 text-amber-800'   },
  marco:      { label: 'Conquista',          emoji: '🌟', cor: 'bg-green-100 text-green-700'   },
  rotina:     { label: 'Mudança na rotina',  emoji: '🔄', cor: 'bg-blue-100 text-blue-700'     },
}

/* Data local (não UTC) no formato yyyy-MM-dd */
export const hojeLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* Lembrete vencido ou de hoje, ainda não concluído */
export const lembreteAtivo = (e) =>
  !!e?.remind_on && !e.reminder_done && e.remind_on <= hojeLocal()

/* Reduz a foto para no máximo 1600px (JPEG). Se o navegador não conseguir
   decodificar (ex.: HEIC no Chrome), envia o arquivo original. */
function comprimirImagem(file) {
  return new Promise((resolve) => {
    if (!file?.type?.startsWith('image/')) return resolve(file)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const escala = Math.min(1, MAX_LADO_PX / Math.max(img.width, img.height))
        if (escala === 1 && file.size < 1.5 * 1024 * 1024) {
          URL.revokeObjectURL(url); return resolve(file)
        }
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * escala)
        canvas.height = Math.round(img.height * escala)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          resolve(blob && blob.size < file.size
            ? new File([blob], 'foto.jpg', { type: 'image/jpeg' })
            : file)
        }, 'image/jpeg', 0.82)
      } catch {
        URL.revokeObjectURL(url); resolve(file)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

/* crypto.randomUUID só existe a partir do Safari 15.4 — fallback p/ iOS antigos */
function novoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

async function enviarFoto(patientId, file) {
  const comprimida = await comprimirImagem(file)
  if (comprimida.size > MAX_BYTES) throw new Error('A foto é muito grande (máximo 10 MB).')
  const ext  = comprimida.type === 'image/jpeg' ? 'jpg'
    : (comprimida.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `${patientId}/${novoId()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, comprimida, { contentType: comprimida.type || 'image/jpeg', upsert: false })
  if (error) throw new Error(`Falha ao enviar a foto: ${error.message}`)
  return path
}

async function removerFoto(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
}

/* Normaliza o formulário para o banco (regras iguais às do banco) */
function montarRegistro(form) {
  const content = (form.content ?? '').trim()
  if (!content) throw new Error('Escreva alguma coisa antes de salvar.')
  if (content.length > MAX_CHARS) throw new Error(`O texto passou de ${MAX_CHARS} caracteres.`)

  const visibility   = form.visibility === 'private' ? 'private' : 'shared'
  const ask_at_visit = visibility === 'shared' && !!form.ask_at_visit
  const tag          = TAGS_DIARIO[form.tag] ? form.tag : 'observacao'

  let entry_at = new Date().toISOString()
  if (form.entry_at) {
    const d = new Date(form.entry_at)
    if (!isNaN(d.getTime())) entry_at = d.toISOString()
  }

  return {
    content,
    tag,
    visibility,
    ask_at_visit,
    entry_at,
    remind_on: form.remind_on || null,
  }
}

export function useDiarioFamilia() {
  const [entradas, setEntradas] = useState([])
  const [fotos,    setFotos]    = useState({})   // { photo_path: signedUrl }
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState(null)

  const carregarFotos = useCallback(async (lista) => {
    const paths = [...new Set(lista.map(e => e.photo_path).filter(Boolean))]
    if (!paths.length) { setFotos({}); return }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
    const mapa = {}
    ;(data ?? []).forEach(item => { if (item?.signedUrl && item.path) mapa[item.path] = item.signedUrl })
    setFotos(mapa)
  }, [])

  /* Lista as anotações visíveis para quem está logado (RLS filtra o resto) */
  const fetchEntradas = useCallback(async (patientId) => {
    if (!patientId) { setEntradas([]); setFotos({}); return }
    setLoading(true)
    setErro(null)
    try {
      const { data, error } = await supabase
        .from('family_journal_entries')
        .select('id, patient_id, created_by, entry_at, content, tag, ask_at_visit, visibility, remind_on, reminder_done, photo_path, discussed_at, created_at, updated_at')
        .eq('patient_id', patientId)
        .order('entry_at', { ascending: false })
        .limit(200)
      if (error) throw error
      const lista = data ?? []
      setEntradas(lista)
      carregarFotos(lista).catch(() => {})
    } catch (err) {
      setErro(err.message || 'Erro ao carregar o diário.')
      setEntradas([])
    } finally {
      setLoading(false)
    }
  }, [carregarFotos])

  /* Cria ou edita uma anotação.
     fotoNova: File | null · removerFotoAtual: boolean · original: entrada em edição */
  const salvarEntrada = useCallback(async (patientId, form, { fotoNova = null, removerFotoAtual = false, original = null } = {}) => {
    if (!patientId) throw new Error('Paciente não identificado.')
    const registro = montarRegistro(form)

    let novoPath = null
    if (fotoNova) novoPath = await enviarFoto(patientId, fotoNova)

    if (original?.id) {
      const patch = { ...registro }
      if (novoPath)              patch.photo_path = novoPath
      else if (removerFotoAtual) patch.photo_path = null
      // Lembrete com nova data volta a ficar pendente
      if (registro.remind_on !== original.remind_on) patch.reminder_done = false

      const { error } = await supabase
        .from('family_journal_entries')
        .update(patch)
        .eq('id', original.id)
      if (error) {
        if (novoPath) await removerFoto(novoPath)
        throw new Error(`Falha ao salvar: ${error.message}`)
      }
      if ((novoPath || removerFotoAtual) && original.photo_path) await removerFoto(original.photo_path)
      return
    }

    const { error } = await supabase
      .from('family_journal_entries')
      .insert({ patient_id: patientId, ...registro, photo_path: novoPath })
    if (error) {
      if (novoPath) await removerFoto(novoPath)
      throw new Error(`Falha ao salvar: ${error.message}`)
    }
  }, [])

  const apagarEntrada = useCallback(async (entrada) => {
    if (!entrada?.id) return
    const { error } = await supabase.from('family_journal_entries').delete().eq('id', entrada.id)
    if (error) throw new Error(`Falha ao apagar: ${error.message}`)
    await removerFoto(entrada.photo_path)
    setEntradas(lista => lista.filter(e => e.id !== entrada.id))
  }, [])

  /* Família: concluir / reabrir lembrete */
  const marcarLembrete = useCallback(async (id, feito = true) => {
    const { error } = await supabase
      .from('family_journal_entries')
      .update({ reminder_done: feito })
      .eq('id', id)
    if (error) throw new Error(`Falha ao atualizar lembrete: ${error.message}`)
    setEntradas(lista => lista.map(e => e.id === id ? { ...e, reminder_done: feito } : e))
  }, [])

  /* Médico: marcar / desmarcar "conversado na consulta" */
  const marcarConversado = useCallback(async (id, conversado = true) => {
    const discussed_at = conversado ? new Date().toISOString() : null
    const { error } = await supabase
      .from('family_journal_entries')
      .update({ discussed_at })
      .eq('id', id)
    if (error) throw new Error(`Falha ao atualizar: ${error.message}`)
    setEntradas(lista => lista.map(e => e.id === id ? { ...e, discussed_at } : e))
  }, [])

  return {
    entradas, fotos, loading, erro,
    fetchEntradas, salvarEntrada, apagarEntrada, marcarLembrete, marcarConversado,
  }
}
