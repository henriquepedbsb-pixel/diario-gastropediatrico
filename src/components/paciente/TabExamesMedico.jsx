import { useState, useEffect, useRef } from 'react'
import {
  Upload, Loader2, AlertCircle, FileText, Image as ImageIcon,
  RefreshCw, Trash2, FileSearch, Users,
} from 'lucide-react'
import { useExames } from '../../hooks/useExames'
import ExameReviewModal from '../exames/ExameReviewModal'

/* ─────────────────────────────────────────────────────────────
   Exames de UM paciente — visão do MÉDICO.
   Usado na aba "Exames" do paciente e na página global /dashboard/exames.
   Transcrição por IA com revisão obrigatória do médico (ExameReviewModal).
───────────────────────────────────────────────────────────── */

const STATUS_BADGE = {
  uploaded:    { label: 'Enviado',            cls: 'bg-slate-100 text-slate-600'     },
  processing:  { label: 'Transcrevendo…',     cls: 'bg-blue-50 text-blue-600'        },
  transcribed: { label: 'Aguardando revisão', cls: 'bg-amber-50 text-amber-700'      },
  reviewed:    { label: 'Revisado',           cls: 'bg-emerald-50 text-emerald-700'  },
  error:       { label: 'Erro',               cls: 'bg-red-50 text-red-700'          },
  archived:    { label: 'Arquivado',          cls: 'bg-slate-100 text-slate-400'     },
}

const EM_ANDAMENTO = ['uploaded', 'processing']
const POLL_MS      = 5000
const POLL_MAX     = 36   // ~3 minutos

const fmtBR = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function TabExamesMedico({ patient }) {
  const patientId = patient?.id ?? null

  const [enviando,   setEnviando]   = useState(false)
  const [erroUpload, setErroUpload] = useState(null)
  const [modalExame, setModalExame] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [apagandoId, setApagandoId] = useState(null)
  const [acaoErro,   setAcaoErro]   = useState('')
  const fileInputRef = useRef(null)
  const pollCount    = useRef(0)

  const { exames, loading, erro, fetchExames, uploadExame, apagarExame } = useExames()

  useEffect(() => {
    pollCount.current = 0
    setConfirmDel(null)
    if (patientId) fetchExames(patientId)
  }, [patientId, fetchExames])

  /* Enquanto houver exame em transcrição, atualiza a lista sozinho */
  const temEmAndamento = exames.some(ex => EM_ANDAMENTO.includes(ex.status))
  useEffect(() => {
    if (!patientId || !temEmAndamento || pollCount.current >= POLL_MAX) return
    const t = setTimeout(() => {
      pollCount.current += 1
      fetchExames(patientId, { silencioso: true })
    }, POLL_MS)
    return () => clearTimeout(t)
  }, [patientId, temEmAndamento, exames, fetchExames])

  const recarregar = () => {
    pollCount.current = 0
    return fetchExames(patientId, { silencioso: true })
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || !patientId) return
    setEnviando(true)
    setErroUpload(null)
    try {
      await uploadExame(patientId, file)
      await recarregar()
    } catch (err) {
      setErroUpload(err.message)
    } finally {
      setEnviando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function apagar(exame) {
    setApagandoId(exame.id); setAcaoErro('')
    try {
      await apagarExame(exame)
      setConfirmDel(null)
      await recarregar()
    } catch (err) {
      setAcaoErro(err.message)
    } finally {
      setApagandoId(null)
    }
  }

  const aguardando = exames.filter(ex => ex.status === 'transcribed').length

  if (!patientId) return null

  return (
    <div className="space-y-4">

      <div className="card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileSearch size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Transcrição assistida por IA</p>
            <p className="text-xs text-slate-500">
              Os valores só passam a valer depois da sua revisão. Exames enviados pela família também aparecem aqui.
            </p>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="application/pdf,image/*"
          onChange={handleFile} className="hidden" id={`exam-upload-${patientId}`} />
        <label htmlFor={`exam-upload-${patientId}`}
          className={`flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-colors ${
            enviando
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
              : 'bg-marinho hover:bg-noite text-white cursor-pointer active:scale-[0.99]'
          }`}>
          {enviando
            ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
            : <><Upload size={16} /> Adicionar exame (foto ou PDF)</>}
        </label>
        {erroUpload && (
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle size={14} /> {erroUpload}
          </p>
        )}
      </div>

      {(erro || acaoErro) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{erro || acaoErro}</div>
      )}

      {aguardando > 0 && (
        <p className="text-xs font-semibold text-amber-700 px-1">
          {aguardando} {aguardando === 1 ? 'exame aguardando' : 'exames aguardando'} sua revisão
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : exames.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum exame deste paciente ainda</p>
          <p className="text-xs mt-1">Adicione um exame ou peça para a família enviar pelo app</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exames.map(ex => {
            const badge    = STATUS_BADGE[ex.status] || STATUS_BADGE.uploaded
            const Icon     = ex.file_type === 'pdf' ? FileText : ImageIcon
            const apagando = apagandoId === ex.id
            const daFamilia = ex.uploaded_by_role === 'familia'
            return (
              <div key={ex.id}
                className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  ex.status === 'transcribed' ? 'border-l-4 border-l-amber-400' : ''}`}>
                <button onClick={() => setModalExame(ex)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
                  <Icon size={20} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {ex.exam_name || 'Exame sem nome (aguardando transcrição)'}
                    </p>
                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2">
                      <span>{fmtBR(ex.exam_date || ex.created_at)}</span>
                      {daFamilia && (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                          <Users size={11} /> Enviado pela família
                        </span>
                      )}
                    </p>
                  </div>
                </button>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  {ex.status === 'processing' && <Loader2 size={14} className="animate-spin text-blue-500" />}
                  {ex.status === 'error' && <RefreshCw size={14} className="text-red-500" />}
                  <span className={`badge ${badge.cls}`}>{badge.label}</span>

                  {confirmDel === ex.id ? (
                    <>
                      <button onClick={() => apagar(ex)} disabled={apagando}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 text-white active:scale-95 disabled:opacity-60">
                        {apagando ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Apagar
                      </button>
                      <button onClick={() => setConfirmDel(null)} disabled={apagando}
                        className="px-2 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:bg-slate-100">
                        Não
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDel(ex.id)} title="Apagar exame" aria-label="Apagar exame"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {confirmDel && (
            <p className="text-xs text-slate-400 text-center">
              Apagar remove o arquivo e a transcrição permanentemente.
            </p>
          )}
        </div>
      )}

      {modalExame && (
        <ExameReviewModal
          exame={modalExame}
          onClose={() => setModalExame(null)}
          onSaved={recarregar}
        />
      )}
    </div>
  )
}
