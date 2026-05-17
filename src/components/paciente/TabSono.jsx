import { useEffect, useState } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { markPatientActivity } from '../../lib/utils'

const QUALIDADE = [
  { value: 'bom',     label: 'Bom',    cor: 'bg-green-100 text-green-700 border-green-200'   },
  { value: 'regular', label: 'Regular', cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'ruim',    label: 'Ruim',   cor: 'bg-red-100 text-red-700 border-red-200'          },
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

export default function TabSono({ patient }) {
  const { session } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    sleep_start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    sleep_end:   '',
    quality:     'bom',
    notes:       '',
  })

  const load = () => {
    supabase.from('sleep_records')
      .select('*')
      .eq('patient_id', patient.id)
      .order('sleep_start', { ascending: false })
      .limit(50)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }

  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    sleep_start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    sleep_end:   '',
    quality:     'bom',
    notes:       '',
  })

  const save = async () => {
    if (!form.sleep_start) return
    setSaving(true); setSaveErro('')
    const start  = new Date(form.sleep_start)
    const end    = form.sleep_end ? new Date(form.sleep_end) : null
    const durMin = end ? differenceInMinutes(end, start) : null
    const { error } = await supabase.from('sleep_records').insert({
      patient_id:       patient.id,
      sleep_start:      start.toISOString(),
      sleep_end:        end?.toISOString() ?? null,
      duration_minutes: durMin,
      quality:          form.quality,
      notes:            form.notes || null,
      created_by:       session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) { setSaveErro(error.message) }
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id, 'Sono registrado') }
  }

  const del = async (id) => {
    await supabase.from('sleep_records').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const fmtDur = (min) => {
    if (!min || min <= 0) return null
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Registrar sono
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <p className="font-medium">Nenhum registro de sono</p>
          <p className="text-xs mt-1">Registre os períodos de sono para acompanhamento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => {
            const q   = QUALIDADE.find(x => x.value === e.quality)
            const dur = fmtDur(e.duration_minutes)
            return (
              <div key={e.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-wrap flex-1">
                    <span className="text-xl">😴</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {format(parseISO(e.sleep_start), 'HH:mm')}
                        {e.sleep_end && ` → ${format(parseISO(e.sleep_end), 'HH:mm')}`}
                        {dur && <span className="text-slate-500 font-normal ml-1">({dur})</span>}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(parseISO(e.sleep_start), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    {q && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${q.cor}`}>{q.label}</span>
                    )}
                  </div>
                  <button onClick={() => del(e.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                {e.notes && <p className="text-xs text-slate-400 italic mt-1 ml-10">{e.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title="Registrar Sono" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Início do sono *</label>
              <input type="datetime-local" className="input" value={form.sleep_start}
                onChange={e => setForm(f => ({ ...f, sleep_start: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fim do sono (opcional)</label>
              <input type="datetime-local" className="input" value={form.sleep_end}
                onChange={e => setForm(f => ({ ...f, sleep_end: e.target.value }))} />
            </div>
            <div>
              <label className="label">Qualidade</label>
              <div className="flex gap-2">
                {QUALIDADE.map(q => (
                  <button key={q.value} type="button" onClick={() => setForm(f => ({ ...f, quality: q.value }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.quality === q.value ? q.cor : 'border-slate-200 text-slate-500'
                    }`}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Dificuldade para dormir, acordou durante a noite…"
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
