import { useState, useEffect, useRef } from 'react'
import { Upload, Loader2, AlertCircle, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { useExamesFamilia } from '../../hooks/useExamesFamilia'

const STATUS_LABEL = {
  uploaded:    'Enviado',
  processing:  'Enviado',
  transcribed: 'Recebido pelo médico',
  reviewed:    'Visto pelo médico',
  error:       'Enviado',
  archived:    'Arquivado',
}

const fmtBR = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function TabExamesFamilia({ patient }) {
  const [enviando,   setEnviando]   = useState(false)
  const [erroUpload, setErroUpload] = useState(null)
  const fileInputRef = useRef(null)

  const { exames, loading, erro, fetchExames, uploadExame, getUrlArquivo } = useExamesFamilia()

  useEffect(() => {
    if (patient?.id) fetchExames(patient.id)
  }, [patient?.id, fetchExames])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || !patient?.id) return
    setEnviando(true)
    setErroUpload(null)
    try {
      await uploadExame(patient.id, file)
      await fetchExames(patient.id)
    } catch (err) {
      setErroUpload(err.message)
    } finally {
      setEnviando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function abrirArquivo(filePath) {
    try {
      const url = await getUrlArquivo(filePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-4">

      <div className="card p-4 space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          Envie os exames do seu filho(a) diretamente para o Dr. Henrique.
          Você pode tirar uma foto ou anexar um PDF.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
          id="exam-upload-tab"
        />
        <label
          htmlFor="exam-upload-tab"
          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
            enviando
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-700 text-white'
          }`}
        >
          {enviando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            : <><Upload className="w-4 h-4" /> Anexar exame (foto ou PDF)</>
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

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando exames...
        </div>
      ) : exames.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Nenhum exame enviado ainda</p>
          <p className="text-xs mt-1">Toque no botão acima para anexar o primeiro</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exames.map(ex => {
            const Icon = ex.file_type === 'pdf' ? FileText : ImageIcon
            return (
              <button
                key={ex.id}
                onClick={() => abrirArquivo(ex.file_path)}
                className="card w-full p-4 text-left hover:border-sky-300 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {ex.exam_name || 'Exame enviado'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {fmtBR(ex.exam_date || ex.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABEL[ex.status] || 'Enviado'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
