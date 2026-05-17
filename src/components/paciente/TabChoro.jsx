import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, X, Loader2, Frown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { markPatientActivity } from '../../lib/utils'

const INTENSIDADES = [
  { value: 'leve',     label: 'Leve',     color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'moderado', label: 'Moderado', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'intenso',  label: 'Intenso',  color: 'bg-red-100 text-red-700 border-red-200'          },
]

const GATILHOS = [
  'Fome', 'Cólica', 'Desconforto', 'Sono', 'Troca de fralda',
  'Refluxo', 'Estimulação excessiva', 'Dor', 'Outro',
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

export default function TabChoro({ patient }) {
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    recorded_at:      format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_min:     '',
    intensity:        'moderado',
    possible_trigger: '',
    notes:            '',
  })

  const load = () => {
    supabase.from('crying_records').select('*')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: false })
      .limit(60)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }
  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    recorded_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_min: '', intensity: 'moderado', possible_trigger: '', notes: '',
  })

  const save = async () => {
    if (!form.duration_min || isNaN(form.duration_min)) { setSaveErro('Informe a duração.'); return }
    setSaving(true); setSaveErro('')
    const { error } = await supabase.from('crying_records').insert({
      patient_id:       patient.id,
      recorded_at:      new Date(form.recorded_at).toISOString(),
      duration_min:     parseInt(form.duration_min),
      intensity:        form.intensity,
      possible_trigger: form.possible_trigger || null,
      notes:            form.notes || null,
    })
    setSaving(false)
    if (error) setSaveErro(error.message)
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id, 'Episódio de choro registrado') }
  }

  const del = async (id) => {
    await supabase.from('crying_records').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const totalDur  = entries.reduce((a, e) => a + (e.duration_min || 0), 0)
  const avgDur    = entries.length > 0 ? Math.round(totalDur / entries.length) : 0
  const triggers  = entries.reduce((acc, e) => { if (e.possible_trigger) acc[e.possible_trigger] = (acc[e.possible_trigger] || 0) + 1; return acc }, {})
  const topTrigger = Object.entries(triggers).sort((a, b) => b[1] - a[1])[0]?.[0]

  const porDia = entries.reduce((acc, e) => {
    const dia = format(parseISO(e.recorded_at), 'yyyy-MM-dd')
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(e)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} episódio{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Registrar episódio
        </button>
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-xl font-bold text-slate-800">{entries.length}</p>
            <p className="text-xs text-slate-500">Episódios</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-xl font-bold text-slate-800">{avgDur}min</p>
            <p className="text-xs text-slate-500">Duração média</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-sm font-bold text-slate-800 truncate">{topTrigger ?? '—'}</p>
            <p className="text-xs text-slate-500">Gatilho frequente</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-slate-100" />)}</div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Frown size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum episódio registrado</p>
          <p className="text-xs mt-1">Registre episódios de choro ou cólica</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porDia).map(([dia, itens]) => (
            <div key={dia}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                {format(parseISO(dia), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="space-y-2">
                {itens.map(e => {
                  const im = INTENSIDADES.find(i => i.value === e.intensity)
                  return (
                    <div key={e.id} className="card p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-600">
                              {format(parseISO(e.recorded_at), 'HH:mm')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${im?.color}`}>
                              {im?.label}
                            </span>
                            <span className="text-xs text-slate-500">{e.duration_min} min</span>
                            {e.possible_trigger && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {e.possible_trigger}
                              </span>
                            )}
                          </div>
                          {e.notes && <p className="text-xs text-slate-400 italic mt-1">{e.notes}</p>}
                        </div>
                        <button onClick={() => del(e.id)}
                          className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Registrar Episódio de Choro" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Data e hora</label>
              <input type="datetime-local" className="input" value={form.recorded_at}
                onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Duração (minutos) *</label>
              <input type="number" className="input" placeholder="Ex: 20" min="1"
                value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
            </div>
            <div>
              <label className="label">Intensidade</label>
              <div className="grid grid-cols-3 gap-2">
                {INTENSIDADES.map(i => (
                  <button key={i.value} type="button" onClick={() => setForm(f => ({ ...f, intensity: i.value }))}
                    className={`py-2 rounded-xl border-2 text-sm font-medium transition-all
                      ${form.intensity === i.value ? i.color + ' border-current' : 'border-slate-200 text-slate-600'}`}>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Possível gatilho</label>
              <select className="input" value={form.possible_trigger}
                onChange={e => setForm(f => ({ ...f, possible_trigger: e.target.value }))}>
                <option value="">Selecione…</option>
                {GATILHOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {saveErro && <p className="text-sm text-red-600">{saveErro}</p>}
            <button onClick={save} disabled={saving} className="btn-primary w-full py-2.5">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
