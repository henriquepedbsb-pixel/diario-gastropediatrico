import { useState, useEffect } from 'react'
import { X, Loader2, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useExames } from '../../hooks/useExames'

const FLAG = {
  low:     { label: 'Baixo',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  high:    { label: 'Alto',      cls: 'bg-red-50 text-red-700 border-red-200' },
  normal:  { label: 'Normal',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  unknown: { label: 'Sem ref.',  cls: 'bg-slate-50 text-slate-500 border-slate-200' },
}

export default function ExameReviewModal({ exame, onClose, onSaved }) {
  const { reprocessar, salvarRevisao, getUrlArquivo } = useExames()

  const [examName, setExamName]   = useState(exame.exam_name || '')
  const [examDate, setExamDate]   = useState(exame.exam_date || '')
  const [params,   setParams]     = useState(exame.structured_data || [])
  const [notas,    setNotas]      = useState(exame.doctor_notes || '')
  const [salvando, setSalvando]   = useState(false)
  const [reproc,   setReproc]     = useState(false)
  const [urlArq,   setUrlArq]     = useState(null)

  useEffect(() => {
    getUrlArquivo(exame.file_path).then(setUrlArq).catch(() => setUrlArq(null))
  }, [exame.file_path, getUrlArquivo])

  const isProcessing = exame.status === 'uploaded' || exame.status === 'processing'
  const isError       = exame.status === 'error'

  async function handleReprocessar() {
    setReproc(true)
    await reprocessar(exame.id)
    setReproc(false)
    onSaved?.()
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      await salvarRevisao({
        examId: exame.id, examName, examDate,
        structuredData: params, doctorNotes: notas,
      })
      onSaved?.()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  function atualizarParam(idx, campo, valor) {
    setParams(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Revisão do Exame</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {urlArq && (
            <a href={urlArq} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium">
              <ExternalLink className="w-4 h-4" /> Ver arquivo original
            </a>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Transcrevendo exame com IA — isso leva alguns segundos...
            </div>
          )}

          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {exame.ai_summary || 'Falha na transcrição.'}
              </p>
              <button onClick={handleReprocessar} disabled={reproc}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800">
                {reproc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Tentar novamente
              </button>
            </div>
          )}

          {!isProcessing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nome do exame</label>
                  <input value={examName} onChange={e => setExamName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data do exame</label>
                  <input type="date" value={examDate || ''} onChange={e => setExamDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {exame.ai_summary && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {exame.ai_summary}
                </div>
              )}

              {params.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Parâmetro</th>
                        <th className="text-left px-3 py-2 font-medium">Valor</th>
                        <th className="text-left px-3 py-2 font-medium">Referência</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.map((p, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{p.name}</td>
                          <td className="px-3 py-2">
                            <input value={`${p.value ?? ''} ${p.unit ?? ''}`.trim()}
                              onChange={e => atualizarParam(i, 'value', e.target.value)}
                              className="w-full border border-slate-200 rounded px-2 py-1" />
                          </td>
                          <td className="px-3 py-2 text-slate-500">{p.reference_range || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${FLAG[p.flag]?.cls || FLAG.unknown.cls}`}>
                              {FLAG[p.flag]?.label || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhum parâmetro estruturado extraído.</p>
              )}

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Notas clínicas do médico <span className="text-slate-400">(uso interno — não é gerado por IA)</span>
                </label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={4}
                  placeholder="Sua interpretação e conduta ficam aqui..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <button onClick={handleSalvar} disabled={salvando}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Revisão
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
