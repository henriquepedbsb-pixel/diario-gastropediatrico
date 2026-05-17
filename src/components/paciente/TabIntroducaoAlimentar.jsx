import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, X, Loader2, Sprout } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { markPatientActivity } from '../../lib/utils'

const REACOES = [
  { value: 'aceito',       label: 'Aceito',       color: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500'  },
  { value: 'alergia',      label: 'Alergia',      color: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-500'    },
  { value: 'intolerancia', label: 'Intolerância', color: 'bg-orange-100 text-orange-700 border-orange-200',dot: 'bg-orange-500' },
  { value: 'recusado',     label: 'Recusado',     color: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400'  },
]

const ALIMENTOS_COMUNS = [
  'Arroz', 'Feijão', 'Frango', 'Carne bovina', 'Peixe', 'Ovo',
  'Leite de vaca', 'Iogurte', 'Queijo', 'Pão', 'Macarrão',
  'Batata', 'Cenoura', 'Abobrinha', 'Brócolis', 'Espinafre', 'Batata-doce',
  'Maçã', 'Banana', 'Pera', 'Mamão', 'Melancia', 'Manga', 'Uva',
  'Aveia', 'Milho', 'Amendoim', 'Soja', 'Trigo', 'Lentilha',
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

export default function TabIntroducaoAlimentar({ patient }) {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [filtro,   setFiltro]   = useState('all')
  const [form, setForm] = useState({
    food_name: '', introduced_at: format(new Date(), 'yyyy-MM-dd'),
    reaction: 'aceito', notes: '',
  })

  const load = () => {
    supabase.from('food_introductions').select('*')
      .eq('patient_id', patient.id)
      .order('introduced_at', { ascending: false })
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }
  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    food_name: '', introduced_at: format(new Date(), 'yyyy-MM-dd'),
    reaction: 'aceito', notes: '',
  })

  const save = async () => {
    if (!form.food_name.trim()) { setSaveErro('Informe o alimento.'); return }
    setSaving(true); setSaveErro('')
    const { error } = await supabase.from('food_introductions').insert({
      patient_id:    patient.id,
      food_name:     form.food_name.trim(),
      introduced_at: form.introduced_at,
      reaction:      form.reaction,
      notes:         form.notes || null,
    })
    setSaving(false)
    if (error) setSaveErro(error.message)
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id, 'Alimento introduzido') }
  }

  const del = async (id) => {
    await supabase.from('food_introductions').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
  }

  const visible = filtro === 'all' ? items : items.filter(i => i.reaction === filtro)
  const counts  = REACOES.reduce((acc, r) => { acc[r.value] = items.filter(i => i.reaction === r.value).length; return acc }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} alimento{items.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Adicionar alimento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFiltro('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
            ${filtro === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
          Todos ({items.length})
        </button>
        {REACOES.map(r => (
          <button key={r.value} onClick={() => setFiltro(r.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
              ${filtro === r.value ? r.color : 'bg-white text-slate-600 border-slate-200'}`}>
            {r.label} ({counts[r.value] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card p-3 h-14 animate-pulse bg-slate-100" />)}</div>
      ) : visible.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Sprout size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum alimento registrado</p>
          <p className="text-xs mt-1">Registre os alimentos da introdução alimentar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map(item => {
            const r = REACOES.find(x => x.value === item.reaction)
            return (
              <div key={item.id} className={`card p-3 border ${r?.color}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.food_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${r?.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r?.dot}`} />
                        {r?.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {format(parseISO(item.introduced_at + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    {item.notes && <p className="text-xs text-slate-500 italic mt-1">{item.notes}</p>}
                  </div>
                  <button onClick={() => del(item.id)}
                    className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 shrink-0">
                    <X size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title="Adicionar Alimento" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Alimento *</label>
              <input className="input" placeholder="Ex: Frango desfiado"
                value={form.food_name} list="alimentos-list"
                onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))} />
              <datalist id="alimentos-list">
                {ALIMENTOS_COMUNS.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Data de introdução</label>
              <input type="date" className="input" value={form.introduced_at}
                onChange={e => setForm(f => ({ ...f, introduced_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Reação</label>
              <div className="grid grid-cols-2 gap-2">
                {REACOES.map(r => (
                  <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, reaction: r.value }))}
                    className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center gap-2
                      ${form.reaction === r.value ? r.color + ' border-current' : 'border-slate-200 text-slate-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${r.dot}`} /> {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Reação específica, quantidade aceita…"
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
