import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { markPatientActivity } from '../../lib/utils'

const LADOS = [
  { value: 'esquerdo', label: 'Esquerdo', emoji: '⬅️' },
  { value: 'direito',  label: 'Direito',  emoji: '➡️' },
  { value: 'ambos',    label: 'Ambos',    emoji: '↔️' },
  { value: 'formula',  label: 'Fórmula',  emoji: '🍼' },
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

export default function TabAmamentacao({ patient }) {
  const { session } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    started_at:       format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_minutes: '',
    side:             'esquerdo',
    notes:            '',
  })

  const load = () => {
    supabase.from('breastfeeding_records')
      .select('*')
      .eq('patient_id', patient.id)
      .order('started_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }

  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    started_at:       format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_minutes: '',
    side:             'esquerdo',
    notes:            '',
  })

  const save = async () => {
    if (!form.started_at) return
    setSaving(true); setSaveErro('')
    const { error } = await supabase.from('breastfeeding_records').insert({
      patient_id:       patient.id,
      started_at:       new Date(form.started_at).toISOString(),
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      side:             form.side,
      notes:            form.notes || null,
      created_by:       session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) { setSaveErro(error.message) }
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id) }
  }

  const del = async (id) => {
    await supabase.from('breastfeeding_records').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Registrar mamada
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <p className="font-medium">Nenhuma mamada registrada</p>
          <p className="text-xs mt-1">Registre as mamadas para acompanhamento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => {
            const lado = LADOS.find(l => l.value === e.side)
            return (
              <div key={e.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{lado?.emoji ?? '🤱'}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {lado?.label}
                        {e.duration_minutes && (
                          <span className="text-slate-500 font-normal ml-1">· {e.duration_minutes} min</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(parseISO(e.started_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
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
        <Modal title="Registrar Mamada" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Horário *</label>
              <input type="datetime-local" className="input" value={form.started_at}
                onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {LADOS.map(l => (
                  <button key={l.value} type="button" onClick={() => setForm(f => ({ ...f, side: l.value }))}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      form.side === l.value
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600'
                    }`}>
                    {l.emoji} {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Duração (minutos)</label>
              <input type="number" min="1" max="120" className="input"
                placeholder="Ex: 15"
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Dificuldade de pega, choro, quantidade…"
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
