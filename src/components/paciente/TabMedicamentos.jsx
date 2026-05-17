import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, X, Loader2, Pill, CheckCircle, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { markPatientActivity } from '../../lib/utils'

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

export default function TabMedicamentos({ patient }) {
  const [meds,         setMeds]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saveErro,     setSaveErro]     = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [form, setForm] = useState({
    name: '', dose: '', frequency: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '', notes: '',
  })

  const load = () => {
    supabase.from('medications').select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setMeds(data ?? []); setLoading(false) })
  }
  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    name: '', dose: '', frequency: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '', notes: '',
  })

  const save = async () => {
    if (!form.name.trim() || !form.dose.trim() || !form.frequency.trim()) {
      setSaveErro('Nome, dose e frequência são obrigatórios.'); return
    }
    setSaving(true); setSaveErro('')
    const { error } = await supabase.from('medications').insert({
      patient_id:  patient.id,
      name:        form.name.trim(),
      dose:        form.dose.trim(),
      frequency:   form.frequency.trim(),
      start_date:  form.start_date,
      end_date:    form.end_date || null,
      is_active:   true,
      notes:       form.notes || null,
    })
    setSaving(false)
    if (error) setSaveErro(error.message)
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id, 'Medicamento adicionado') }
  }

  const toggleActive = async (med) => {
    const novo = !med.is_active
    await supabase.from('medications').update({ is_active: novo }).eq('id', med.id)
    setMeds(m => m.map(x => x.id === med.id ? { ...x, is_active: novo } : x))
  }

  const del = async (id) => {
    await supabase.from('medications').delete().eq('id', id)
    setMeds(m => m.filter(x => x.id !== id))
  }

  const active   = meds.filter(m => m.is_active)
  const inactive = meds.filter(m => !m.is_active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{active.length} ativo{active.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Adicionar medicamento
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-slate-100" />)}</div>
      ) : active.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <Pill size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum medicamento ativo</p>
          <p className="text-xs mt-1">Adicione os medicamentos em uso</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(med => (
            <div key={med.id} className="card p-4 border-l-4 border-blue-400">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{med.name}</p>
                  <p className="text-sm text-blue-700 font-medium mt-0.5">{med.dose} · {med.frequency}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Início: {format(parseISO(med.start_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    {med.end_date && ` · Fim: ${format(parseISO(med.end_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}`}
                  </p>
                  {med.notes && <p className="text-xs text-slate-400 italic mt-0.5">{med.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(med)} title="Marcar como inativo"
                    className="p-1.5 text-green-500 hover:text-slate-400 rounded-lg hover:bg-slate-100 transition-colors">
                    <CheckCircle size={16} />
                  </button>
                  <button onClick={() => del(med.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <button onClick={() => setShowInactive(s => !s)}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1">
            {showInactive ? '▲' : '▼'} Histórico ({inactive.length})
          </button>
          {showInactive && (
            <div className="space-y-2 mt-2">
              {inactive.map(med => (
                <div key={med.id} className="card p-3 opacity-60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500 line-through">{med.name}</p>
                      <p className="text-xs text-slate-400">{med.dose} · {med.frequency}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleActive(med)} title="Reativar"
                        className="p-1.5 text-slate-300 hover:text-green-500 rounded-lg hover:bg-green-50 transition-colors">
                        <RotateCcw size={14} />
                      </button>
                      <button onClick={() => del(med.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title="Adicionar Medicamento" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Nome do medicamento *</label>
              <input className="input" placeholder="Ex: Omeprazol"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Dose *</label>
                <input className="input" placeholder="Ex: 10mg"
                  value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} />
              </div>
              <div>
                <label className="label">Frequência *</label>
                <input className="input" placeholder="Ex: 1x ao dia"
                  value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Início</label>
                <input type="date" className="input" value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Término (opcional)</label>
                <input type="date" className="input" value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Posologia, orientações…"
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
