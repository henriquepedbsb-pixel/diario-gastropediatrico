import { useState, useEffect, useRef } from 'react'
import { FileSearch, Users, Upload, Loader2, AlertCircle, FileText, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react'
import { useExames } from '../hooks/useExames'
import ExameReviewModal from '../components/exames/ExameReviewModal'
import { supabase } from '../lib/supabase'

const STATUS_BADGE = {
  uploaded:    { label: 'Enviado',      cls: 'bg-slate-100 text-slate-600' },
  processing:  { label: 'Transcrevendo...', cls: 'bg-blue-50 text-blue-600' },
  transcribed: { label: 'Aguardando revisão', cls: 'bg-amber-50 text-amber-700' },
  reviewed:    { label: 'Revisado',     cls: 'bg-emerald-50 text-emerald-700' },
  error:       { label: 'Erro',         cls: 'bg-red-50 text-red-700' },
  archived:    { label: 'Arquivado',    cls: 'bg-slate-100 text-slate-400' },
}

const fmtBR = (iso) => { if (!iso) return '—'; const [y,m,d] = iso.slice(0,10).split('-'); return `${d}/${m}/${y}` }

export default function Exames() {
  const [pacientes,  setPacientes]  = useState([])
  const [loadingPac, setLoadingPac] = useState(true)
  const [pacienteId, setPacienteId] = useState('')
  const [enviando,   setEnviando]   = useState(false)
  const [erroUpload, setErroUpload] = useState(null)
  const [modalExame, setModalExame] = useState(null)
  const [apagandoId, setApagandoId] = useState(null)
  const fileInputRef = useRef(null)

  const { exames, loading, erro, fetchExames, uploadExame, apagarExame } = useExames()

  useEffect(() => {
    async function fetchPacientes() {
      setLoadingPac(true)
      const { data, error } = await supabase.from('patients').select('id, name').order('name')
      if (!error && data?.length) {
        setPacientes(data)
        if (data.length === 1) setPacienteId(data[0].id)
      }
      setLoadingPac(false)
    }
    fetchPacientes()
  }, [])

  useEffect(() => {
    if (pacienteId) fetchExames(pacienteId)
  }, [pacienteId, fetchExames])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || !pacienteId) return
    setEnviando(true)
    setErroUpload(null)
    try {
      await uploadExame(pacienteId, file)
      await fetchExames(pacienteId)
    } catch (err) {
      setErroUpload(err.message)
    } finally {
      setEnviando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleApagar(e, exame) {
    e.stopPropagation() // evita abrir o modal de revisão ao clicar na lixeira
    const ok = window.confirm(
      `Apagar este exame? Esta ação remove o arquivo e a transcrição permanentemente e não pode ser desfeita.`
    )
    if (!ok) return
    setApagandoId(exame.id)
    try {
      await apagarExame(exame)
      await fetchExames(pacienteId)
    } catch (err) {
      alert(err.message)
    } finally {
      setApagandoId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <FileSearch className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Exames</h1>
            <p className="text-sm text-slate-500">Transcrição assistida por IA · revisão obrigatória do médico</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
              <Users className="w-4 h-4 text-sky-600" /> Paciente
            </label>
            {loadingPac ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando pacientes...
              </div>
            ) : (
              <select value={pacienteId} onChange={e => setPacienteId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Selecione o paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="application/pdf,image/*"
            onChange={handleFile} className="hidden" id="exam-upload" />
          <label htmlFor="exam-upload"
            className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
              !pacienteId || enviando
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}>
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Upload className="w-4 h-4" /> Adicionar exame (foto ou PDF)</>
            }
          </label>
          {erroUpload && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {erroUpload}
            </p>
          )}
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{erro}</div>
        )}

        {pacienteId && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando exames...
              </div>
            ) : exames.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-6">Nenhum exame cadastrado para este paciente.</p>
            ) : (
              exames.map(ex => {
                const badge = STATUS_BADGE[ex.status] || STATUS_BADGE.uploaded
                const Icon  = ex.file_type === 'pdf' ? FileText : ImageIcon
                const apagando = apagandoId === ex.id
                return (
                  <div key={ex.id}
                    className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                    <button onClick={() => setModalExame(ex)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
                      <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {ex.exam_name || 'Exame sem nome (aguardando transcrição)'}
                        </p>
                        <p className="text-xs text-slate-400">{fmtBR(ex.exam_date)}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ex.status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                      {ex.status === 'error' && <RefreshCw className="w-3.5 h-3.5 text-red-500" />}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                      <button
                        onClick={(e) => handleApagar(e, ex)}
                        disabled={apagando}
                        title="Apagar exame"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                        {apagando
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>

      {modalExame && (
        <ExameReviewModal
          exame={modalExame}
          onClose={() => setModalExame(null)}
          onSaved={() => fetchExames(pacienteId)}
        />
      )}
    </div>
  )
}
