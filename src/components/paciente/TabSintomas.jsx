import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { markPatientActivity } from '../../lib/utils'

const SINTOMAS_LIST = [
  'Vômito', 'Náusea', 'Diarreia', 'Constipação', 'Distensão abdominal',
  'Dor abdominal', 'Febre', 'Recusa alimentar', 'Choro excessivo',
  'Sangue nas fezes', 'Muco nas fezes', 'Refluxo', 'Erupção cutânea',
]

const SEVERIDADE = [
  { value: 1, label: 'Leve',     cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 2, label: 'Moderado', cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 3, label: 'Grave',    cor: 'bg-red-100 text-red-700 border-red-200'          },
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

export default function TabSintomas({ patient }) {
  const { session } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    recorded_at:    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    symptoms:       [],
    customSintoma:  '',
    severity:       1,
    fever_temp:     '',
    notes:          '',
  })

  const load = () => {
    supabase.from('symptom_records')
      .select('*')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }

  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    recorded_at:   format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    symptoms:      [],
    customSintoma: '',
    severity:      1,
    fever_temp:    '',
    notes:         '',
  })

  const addCustomSintoma = () => {
    const val = form.customSintoma.trim()
    if (val && !form.symptoms.includes(val)) {
      setForm(f => ({ ...f, symptoms: [...f.symptoms, val], customSintoma: '' }))
    } else {
      setForm(f => ({ ...f, customSintoma: '' }))
    }
  }

  const toggleSintoma = (s) =>
    setForm(f => ({
      ...f,
      symptoms: f.symptoms.includes(s)
        ? f.symptoms.filter(x => x !== s)
        : [...f.symptoms, s],
    }))

  const save = async () => {
    if (!form.symptoms.length) { setSaveErro('Selecione pelo menos um sintoma.'); return }
    setSaving(true); setSaveErro('')
    const { error } = await supabase.from('symptom_records').insert({
      patient_id:  patient.id,
      recorded_at: new Date(form.recorded_at).toISOString(),
      symptoms:    form.symptoms,
      severity:    form.severity,
      fever_temp:  form.fever_temp ? parseFloat(form.fever_temp) : null,
      notes:       form.notes || null,
      created_by:  session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) { setSaveErro(error.message) }
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id) }
  }

  const del = async (id) => {
    await supabase.from('symptom_records').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Registrar sintoma
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <p className="font-medium">Nenhum sintoma registrado</p>
          <p className="text-xs mt-1">Registre intercorrências para acompanhamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(e => {
            const sev = SEVERIDADE[e.severity - 1]
            return (
              <div key={e.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {(e.symptoms || []).map(s => (
                      <span key={s} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <button onClick={() => del(e.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                  {sev && (
                    <span className={`px-2 py-0.5 rounded-full border font-medium ${sev.cor}`}>{sev.label}</span>
                  )}
                  {e.fever_temp && <span>🌡️ {e.fever_temp}°C</span>}
                  <span>{format(parseISO(e.recorded_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                {e.notes && <p className="text-xs text-slate-400 italic">{e.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title="Registrar Sintoma" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Data e hora *</label>
              <input type="datetime-local" className="input" value={form.recorded_at}
                onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Sintomas *</label>
              <div className="flex flex-wrap gap-2">
                {SINTOMAS_LIST.map(s => (
                  <button key={s} type="button" onClick={() => toggleSintoma(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.symptoms.includes(s)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}>
                    {s}
                  </button>
                ))}
                {form.symptoms.filter(s => !SINTOMAS_LIST.includes(s)).map(s => (
                  <button key={s} type="button" onClick={() => toggleSintoma(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border bg-blue-600 text-white border-blue-600">
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  className="input text-sm flex-1"
                  placeholder="Outro sintoma… (pressione Enter)"
                  value={form.customSintoma}
                  onChange={e => setForm(f => ({ ...f, customSintoma: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSintoma() } }}
                />
                <button type="button" onClick={addCustomSintoma}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors shrink-0">
                  + Adicionar
                </button>
              </div>
            </div>
            <div>
              <label className="label">Gravidade</label>
              <div className="flex gap-2">
                {SEVERIDADE.map(s => (
                  <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, severity: s.value }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.severity === s.value ? s.cor : 'border-slate-200 text-slate-500'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Temperatura (°C) — se febre</label>
              <input type="number" step="0.1" min="35" max="42" className="input"
                placeholder="Ex: 38.5"
                value={form.fever_temp}
                onChange={e => setForm(f => ({ ...f, fever_temp: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Duração, contexto, outros detalhes…"
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
