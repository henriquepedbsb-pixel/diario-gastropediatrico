import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, X, Upload, FileText, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { markPatientActivity } from '../../lib/utils'

const CATEGORIAS = [
  { value: 'exame',   label: 'Exame',   emoji: '🔬' },
  { value: 'laudo',   label: 'Laudo',   emoji: '📋' },
  { value: 'receita', label: 'Receita', emoji: '💊' },
  { value: 'outro',   label: 'Outro',   emoji: '📎' },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function TabDocumentos({ patient }) {
  const { session } = useAuth()
  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    title: '', category: 'exame', file: null, fileName: '', notes: '',
  })

  const load = () => {
    supabase.from('patient_documents')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setDocs(data ?? []); setLoading(false) })
  }

  useEffect(load, [patient.id])

  const resetForm = () => setForm({ title: '', category: 'exame', file: null, fileName: '', notes: '' })

  const save = async () => {
    if (!form.title.trim()) { setSaveErro('Informe um título.'); return }
    setSaving(true); setSaveErro('')
    let fileUrl  = null
    let fileType = null
    if (form.file) {
      const ext  = form.file.name.split('.').pop().toLowerCase()
      fileType   = ext === 'pdf' ? 'pdf' : 'image'
      const path = `${patient.id}/${Date.now()}_${form.file.name}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('patient-documents')
        .upload(path, form.file)
      if (upErr) { setSaveErro(`Erro no upload: ${upErr.message}`); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('patient-documents').getPublicUrl(upData.path)
      fileUrl = urlData.publicUrl
    }
    const { error } = await supabase.from('patient_documents').insert({
      patient_id:  patient.id,
      title:       form.title.trim(),
      file_url:    fileUrl,
      file_type:   fileType,
      category:    form.category,
      notes:       form.notes || null,
      uploaded_by: session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) { setSaveErro(error.message) }
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id) }
  }

  const del = async (doc) => {
    if (doc.file_url) {
      const match = doc.file_url.match(/patient-documents\/(.+)/)
      if (match) await supabase.storage.from('patient-documents').remove([match[1]])
    }
    await supabase.from('patient_documents').delete().eq('id', doc.id)
    setDocs(d => d.filter(x => x.id !== doc.id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{docs.length} documento{docs.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Adicionar documento
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum documento</p>
          <p className="text-xs mt-1">Adicione exames, laudos e receitas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(d => {
            const cat = CATEGORIAS.find(c => c.value === d.category)
            return (
              <div key={d.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{cat?.emoji ?? '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {cat && <span className="text-xs text-slate-500">{cat.label}</span>}
                      <span className="text-xs text-slate-400">
                        {format(parseISO(d.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    {d.notes && <p className="text-xs text-slate-400 italic mt-0.5">{d.notes}</p>}
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                        <ExternalLink size={11} /> Abrir arquivo
                      </a>
                    )}
                  </div>
                  <button onClick={() => del(d)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title="Adicionar Documento" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input className="input" placeholder="Ex: Hemograma completo – mai/2025"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Categoria</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIAS.map(c => (
                  <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, category: c.value }))}
                    className={`py-2 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      form.category === c.value
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600'
                    }`}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Arquivo (PDF ou imagem)</label>
              <label className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                ${form.file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-300'}`}>
                <Upload size={16} className={form.file ? 'text-green-500' : 'text-slate-400'} />
                <span className={`text-sm flex-1 truncate ${form.file ? 'text-green-700 font-medium' : 'text-slate-400'}`}>
                  {form.fileName || 'Selecionar arquivo…'}
                </span>
                {form.file && (
                  <button type="button"
                    onClick={e => { e.preventDefault(); setForm(f => ({ ...f, file: null, fileName: '' })) }}
                    className="text-slate-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
                <input type="file" accept=".pdf,image/*" className="sr-only"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setForm(prev => ({ ...prev, file: f, fileName: f?.name ?? '' }))
                  }} />
              </label>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Laboratório, data, contexto…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {saveErro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                <span>⚠️</span> {saveErro}
              </div>
            )}
            <button onClick={save} disabled={saving} className="btn-primary w-full py-2.5">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
