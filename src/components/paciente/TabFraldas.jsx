import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Trash2, Loader2, Camera, X, Image, CheckCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { markPatientActivity } from '../../lib/utils'

/* ── Opções ───────────────────────────────────────────── */
const TIPOS = [
  { value: 'seco',   label: '✅ Seca',         cor: 'bg-slate-100  text-slate-600  border-slate-300'  },
  { value: 'urina',  label: '💛 Urina',         cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'fezes',  label: '🟫 Fezes',         cor: 'bg-amber-100  text-amber-700  border-amber-300'  },
  { value: 'misto',  label: '🔀 Urina + Fezes', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
]

const CORES_URINA = [
  { value: 'amarelo-claro', label: 'Amarelo claro', dot: 'bg-yellow-200' },
  { value: 'amarelo',       label: 'Amarelo',        dot: 'bg-yellow-400' },
  { value: 'amarelo-escuro',label: 'Amarelo escuro', dot: 'bg-yellow-600' },
  { value: 'laranja',       label: 'Laranja',        dot: 'bg-orange-400' },
  { value: 'rosado',        label: 'Rosado',         dot: 'bg-pink-300'   },
]

const CORES_FEZES = [
  { value: 'amarelo',  label: 'Amarelo',       dot: 'bg-yellow-400' },
  { value: 'verde',    label: 'Verde',         dot: 'bg-green-500'  },
  { value: 'marrom',   label: 'Marrom',        dot: 'bg-amber-800'  },
  { value: 'preto',    label: 'Preto (mecônio)', dot: 'bg-gray-900' },
  { value: 'vermelho', label: 'Vermelho',      dot: 'bg-red-500'    },
  { value: 'branco',   label: 'Branco/Cinza',  dot: 'bg-gray-200 border border-gray-300' },
]

function tipoMeta(value) { return TIPOS.find(t => t.value === value) }

/* ── Modal ────────────────────────────────────────────── */
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default function TabFraldas({ patient }) {
  const { session } = useAuth()
  const fileRef     = useRef(null)

  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [preview,  setPreview]  = useState(null) // URL de preview da foto selecionada
  const [lightbox, setLightbox] = useState(null) // foto ampliada

  const emptyForm = () => ({
    recorded_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    tipo: 'urina',
    cor_urina: '',
    cor_fezes: '',
    notes: '',
    file: null,
  })
  const [form, setForm] = useState(emptyForm())

  /* ── Carregar registros ── */
  const load = () => {
    supabase.from('diaper_records')
      .select('*')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: false })
      .limit(80)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }
  useEffect(load, [patient.id])

  /* ── Upload de foto ── */
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(f => ({ ...f, file }))
    setPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    setForm(f => ({ ...f, file: null }))
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  /* ── Salvar ── */
  const save = async () => {
    if (!form.recorded_at) return
    setSaving(true); setSaveErro('')

    let photo_url = null

    if (form.file) {
      const ext  = form.file.name.split('.').pop().toLowerCase()
      const path = `fraldas/${patient.id}/${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('patient-documents')
        .upload(path, form.file, { contentType: form.file.type })

      if (upErr) { setSaveErro(`Erro no upload: ${upErr.message}`); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('patient-documents').getPublicUrl(upData.path)
      photo_url = urlData.publicUrl
    }

    const { error } = await supabase.from('diaper_records').insert({
      patient_id:  patient.id,
      recorded_at: new Date(form.recorded_at).toISOString(),
      tipo:        form.tipo,
      cor_urina:   form.cor_urina || null,
      cor_fezes:   form.cor_fezes || null,
      notes:       form.notes || null,
      photo_url,
      created_by:  session?.user?.id ?? null,
    })

    setSaving(false)
    if (error) { setSaveErro(error.message); return }
    setModal(false)
    setForm(emptyForm())
    setPreview(null)
    load()
    markPatientActivity(patient.id, 'Fralda registrada')
  }

  /* ── Excluir ── */
  const del = async (entry) => {
    // remove foto do storage se existir
    if (entry.photo_url) {
      const match = entry.photo_url.match(/patient-documents\/(.+)$/)
      if (match) await supabase.storage.from('patient-documents').remove([match[1]])
    }
    await supabase.from('diaper_records').delete().eq('id', entry.id)
    setEntries(e => e.filter(x => x.id !== entry.id))
  }

  /* ── Agrupamento por dia ── */
  const porDia = entries.reduce((acc, e) => {
    const dia = format(parseISO(e.recorded_at), 'yyyy-MM-dd')
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(e)
    return acc
  }, {})

  /* ── Cores disponíveis conforme tipo ── */
  const coresDisponiveis = form.tipo === 'fezes' ? CORES_FEZES
    : form.tipo === 'urina' ? CORES_URINA
    : form.tipo === 'misto' ? [...CORES_URINA, ...CORES_FEZES]
    : []

  return (
    <div className="space-y-4">

      {/* Info */}
      <div className="card p-4 bg-cyan-50 border-cyan-200 space-y-1">
        <p className="text-sm font-semibold text-cyan-800">🍼 Registro de Fraldas</p>
        <p className="text-xs text-cyan-700 leading-relaxed">
          Registre cada troca com tipo, cor e foto. As imagens ajudam o médico a avaliar cor e consistência.
        </p>
      </div>

      {/* Cabeçalho com contador e botão */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setForm(emptyForm()); setPreview(null); setSaveErro(''); setModal(true) }}
          className="btn-primary">
          <Plus size={15} /> Nova troca
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <span className="text-5xl block mb-3">🍼</span>
          <p className="font-medium">Nenhum registro de fralda</p>
          <p className="text-xs mt-1">Toque em "Nova troca" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porDia).map(([dia, itens]) => (
            <div key={dia}>
              {/* Cabeçalho do dia */}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                {format(parseISO(dia), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                <span className="ml-2 normal-case font-normal">· {itens.length} troca{itens.length !== 1 ? 's' : ''}</span>
              </p>

              <div className="space-y-2">
                {itens.map(entry => {
                  const meta = tipoMeta(entry.tipo)
                  return (
                    <div key={entry.id} className="card p-3 flex gap-3">

                      {/* Foto (thumbnail) */}
                      {entry.photo_url ? (
                        <button onClick={() => setLightbox(entry.photo_url)}
                          className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity">
                          <img src={entry.photo_url} alt="fralda"
                            className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="shrink-0 w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center">
                          <span className="text-2xl">🍼</span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta?.cor}`}>
                              {meta?.label}
                            </span>
                            {entry.cor_urina && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Urina: {CORES_URINA.find(c => c.value === entry.cor_urina)?.label ?? entry.cor_urina}
                              </span>
                            )}
                            {entry.cor_fezes && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Fezes: {CORES_FEZES.find(c => c.value === entry.cor_fezes)?.label ?? entry.cor_fezes}
                              </span>
                            )}
                          </div>
                          <button onClick={() => del(entry)}
                            className="shrink-0 text-slate-300 hover:text-red-400 transition-colors p-0.5">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {format(parseISO(entry.recorded_at), 'HH:mm')}
                          {entry.photo_url && <span className="ml-2 text-blue-400">📷 foto</span>}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de registro ── */}
      {modal && (
        <Modal onClose={() => setModal(false)}>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-base">Nova troca de fralda</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Data/hora */}
            <div>
              <label className="label">Data e hora</label>
              <input type="datetime-local" className="input"
                value={form.recorded_at}
                onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))} />
            </div>

            {/* Tipo */}
            <div>
              <label className="label">Tipo de fralda</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => (
                  <button key={t.value} onClick={() => setForm(f => ({ ...f, tipo: t.value, cor_urina: '', cor_fezes: '' }))}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                      ${form.tipo === t.value ? t.cor + ' border-current' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor — urina */}
            {(form.tipo === 'urina' || form.tipo === 'misto') && (
              <div>
                <label className="label">Cor da urina</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_URINA.map(c => (
                    <button key={c.value} onClick={() => setForm(f => ({ ...f, cor_urina: f.cor_urina === c.value ? '' : c.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all
                        ${form.cor_urina === c.value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <span className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cor — fezes */}
            {(form.tipo === 'fezes' || form.tipo === 'misto') && (
              <div>
                <label className="label">Cor das fezes</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_FEZES.map(c => (
                    <button key={c.value} onClick={() => setForm(f => ({ ...f, cor_fezes: f.cor_fezes === c.value ? '' : c.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all
                        ${form.cor_fezes === c.value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <span className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Foto */}
            <div>
              <label className="label">Foto da fralda (opcional)</label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleFile} />

              {preview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200">
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={removePhoto}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle size={10} /> Foto selecionada
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                  <Camera size={24} />
                  <span className="text-sm font-medium">Tirar foto ou escolher da galeria</span>
                  <span className="text-xs">JPG, PNG · abre câmera no celular</span>
                </button>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="label">Observações (opcional)</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Ex: muito volume, vazamento, irritação..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {saveErro && <p className="text-sm text-red-500">{saveErro}</p>}

            <button onClick={save} disabled={saving || !form.recorded_at}
              className="btn-primary w-full py-3">
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
                : <><CheckCircle size={15} /> Registrar troca</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Lightbox de foto ── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={28} />
          </button>
          <img src={lightbox} alt="fralda ampliada"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
