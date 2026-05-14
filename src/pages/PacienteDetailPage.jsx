import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UtensilsCrossed, TrendingUp, FileText, Lightbulb, Droplets,
         Plus, Trash2, Loader2, X, Scale, Ruler, Brain,
         ClipboardList, Pencil, Check, Upload, Paperclip, ToggleLeft, ToggleRight,
         Milestone, Syringe } from 'lucide-react'
import TabMarcos  from '../components/paciente/TabMarcos'
import TabVacinas from '../components/paciente/TabVacinas'
import { useAuth } from '../contexts/AuthContext'
import { format, parseISO, differenceInMonths, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import {
  WHO_PESO_MENINOS, WHO_PESO_MENINAS,
  WHO_ALTURA_MENINOS, WHO_ALTURA_MENINAS,
  WHO_PC_MENINOS, WHO_PC_MENINAS,
} from '../lib/whoData'

/* ─── helpers ─── */
function calcIdade(birthdate) {
  if (!birthdate) return '—'
  const birth  = parseISO(birthdate)
  const years  = differenceInYears(new Date(), birth)
  const months = differenceInMonths(new Date(), birth)
  if (months < 1)  return '< 1 mês'
  if (months < 24) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}

function idadeEmMeses(birthdate) {
  if (!birthdate) return 0
  return differenceInMonths(new Date(), parseISO(birthdate))
}

/* ─── modal ─── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA 1 — DIÁRIO ALIMENTAR
═══════════════════════════════════════════ */
const REFEICOES = {
  breakfast:        { label: 'Café da manhã',       emoji: '🌅' },
  morning_snack:    { label: 'Lanche da manhã',     emoji: '🍎' },
  lunch:            { label: 'Almoço',              emoji: '🍽️' },
  afternoon_snack:  { label: 'Lanche da tarde',     emoji: '🍪' },
  dinner:           { label: 'Jantar',              emoji: '🌙' },
  supper:           { label: 'Ceia',                emoji: '🥛' },
}

function TabDiario({ patient }) {
  const { session } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form,     setForm]     = useState({
    meal_type: 'breakfast', eaten_at: '', description: '', notes: '',
    file: null, fileName: '',
  })

  const load = () => {
    supabase.from('meals')
      .select('*').eq('patient_id', patient.id)
      .order('eaten_at', { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }

  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    meal_type: 'breakfast', eaten_at: '', description: '', notes: '',
    file: null, fileName: '',
  })

  const save = async () => {
    if (!form.eaten_at) return
    setSaving(true)
    setSaveErro('')

    let photoUrl = null

    if (form.file) {
      const { data: upData, error: upErr } = await supabase.storage
        .from('fotos-refeicoes')
        .upload(`${patient.id}/${Date.now()}_${form.file.name}`, form.file)

      if (upErr) {
        setSaveErro(`Erro no upload da foto: ${upErr.message}`)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('fotos-refeicoes')
        .getPublicUrl(upData.path)
      photoUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('meals').insert({
      patient_id:  patient.id,
      eaten_at:    form.eaten_at,
      meal_type:   form.meal_type,
      description: form.description || null,
      notes:       form.notes       || null,
      photo_url:   photoUrl,
      created_by:  session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) {
      setSaveErro(error.message)
    } else {
      setModal(false)
      resetForm()
      load()
    }
  }

  const del = async (id) => {
    await supabase.from('meals').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registros</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Registrar refeição
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <UtensilsCrossed size={36} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma refeição registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(e => {
            const ref = REFEICOES[e.meal_type] ?? { label: e.meal_type, emoji: '🍴' }
            return (
              <div key={e.id} className="card overflow-hidden">
                {e.photo_url && (
                  <div className="w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                    <img src={e.photo_url} alt="foto da refeição"
                      className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="p-4 flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{ref.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800 text-sm">{ref.label}</span>
                    {e.description && <p className="text-sm text-slate-600 mt-0.5">{e.description}</p>}
                    {e.notes       && <p className="text-xs text-slate-400 italic mt-0.5">{e.notes}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {format(parseISO(e.eaten_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <button onClick={() => del(e.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title="Registrar Refeição" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Data e hora *</label>
              <input type="datetime-local" className="input"
                value={form.eaten_at}
                onChange={e => setForm(f => ({ ...f, eaten_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo de refeição</label>
              <select className="input" value={form.meal_type}
                onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))}>
                {Object.entries(REFEICOES).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Descrição</label>
              <input className="input" placeholder="Ex: arroz, feijão, cenoura cozida…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Aceitação, reações, intercorrências…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Upload de foto */}
            <div>
              <label className="label">Foto da refeição (opcional)</label>
              <label className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                ${form.file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                <Upload size={16} className={form.file ? 'text-green-500' : 'text-slate-400'} />
                <span className={`text-sm flex-1 truncate ${form.file ? 'text-green-700 font-medium' : 'text-slate-400'}`}>
                  {form.fileName || 'Selecionar foto (JPG, PNG…)'}
                </span>
                {form.file && (
                  <button type="button"
                    onClick={e => { e.preventDefault(); setForm(f => ({ ...f, file: null, fileName: '' })) }}
                    className="text-slate-400 hover:text-red-500 shrink-0">
                    <X size={14} />
                  </button>
                )}
                <input type="file" accept="image/*" className="sr-only"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setForm(prev => ({ ...prev, file: f, fileName: f?.name ?? '' }))
                  }} />
              </label>
            </div>

            {saveErro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                <span className="shrink-0">⚠️</span> {saveErro}
              </div>
            )}
            <button onClick={save} disabled={saving || !form.eaten_at}
              className="btn-primary w-full py-2.5">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA 2 — GRÁFICOS DE CRESCIMENTO
═══════════════════════════════════════════ */
function GrowthChart({ title, unit, whoData, patientData, dataKey }) {
  // Mapa rápido: mês → dados OMS
  const whoMap = {}
  whoData.forEach(w => { whoMap[w.mes] = w })

  // Mapa age_months → valor do paciente (ASC → último mês prevalece se houver colisão)
  const medMap = {}
  patientData.forEach(m => { if (m[dataKey] != null) medMap[m.age_months] = m[dataKey] })

  // União de todos os meses (OMS + paciente) → garante que todo registro aparece
  const todosMeses = new Set([
    ...whoData.map(w => w.mes),
    ...Object.keys(medMap).map(Number),
  ])

  const chartData = [...todosMeses]
    .sort((a, b) => a - b)
    .map(mes => ({
      mes,
      p3:       whoMap[mes]?.p3   ?? null,
      p50:      whoMap[mes]?.p50  ?? null,
      p97:      whoMap[mes]?.p97  ?? null,
      paciente: medMap[mes]       ?? null,
    }))

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-slate-700 mb-3 text-sm">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }}
            label={{ value: 'meses', position: 'insideBottom', offset: -8, fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit={unit} width={42} />
          <Tooltip formatter={(v, n) => [v != null ? `${v} ${unit}` : '—',
            n === 'paciente' ? 'Paciente' : n]} />
          <Line dataKey="p97" stroke="#e2e8f0" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P97" connectNulls />
          <Line dataKey="p50" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="P50" connectNulls />
          <Line dataKey="p3"  stroke="#e2e8f0" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P3" connectNulls />
          <Line dataKey="paciente" stroke="#2563eb" strokeWidth={2.5}
            dot={{ r: 4, fill: '#2563eb' }} connectNulls name="Paciente" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Tabela consolidada de medições ── */
function TabelaMedidas({ medidas, onDelete }) {
  if (medidas.length === 0) return null
  const maisRecenteId = medidas[0]?.id   // já vem ordenada desc

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 text-sm">Histórico de Medições</h3>
        <span className="text-xs text-slate-400">{medidas.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left font-medium">Data</th>
              <th className="px-3 py-2.5 text-right font-medium">Peso (kg)</th>
              <th className="px-3 py-2.5 text-right font-medium">Alt. (cm)</th>
              <th className="px-3 py-2.5 text-right font-medium">PC (cm)</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {medidas.map(m => {
              const isLatest = m.id === maisRecenteId
              const tdCls = `px-3 py-2.5 text-right tabular-nums ${isLatest ? 'font-bold text-blue-700' : 'text-slate-600'}`
              return (
                <tr key={m.id} className={isLatest ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                  <td className={`px-4 py-2.5 whitespace-nowrap ${isLatest ? 'font-bold text-blue-700' : 'text-slate-700'}`}>
                    {format(parseISO(m.recorded_at), 'dd/MM/yyyy', { locale: ptBR })}
                    {isLatest && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-normal">
                        recente
                      </span>
                    )}
                  </td>
                  <td className={tdCls}>{m.weight_kg            != null ? m.weight_kg.toFixed(3)            : '—'}</td>
                  <td className={tdCls}>{m.height_cm            != null ? m.height_cm.toFixed(1)            : '—'}</td>
                  <td className={tdCls}>{m.head_circumference_cm != null ? m.head_circumference_cm.toFixed(1) : '—'}</td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => onDelete(m.id)}
                      className="p-1 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabGraficos({ patient }) {
  const { session }    = useAuth()
  const [medidas,      setMedidas]    = useState([])
  const [loading,      setLoading]    = useState(true)   // só true no 1º carregamento
  const [refreshing,   setRefreshing] = useState(false)  // refresh silencioso após save
  const [modal,        setModal]      = useState(false)
  const [saving,       setSaving]     = useState(false)
  const [saveErro,     setSaveErro]   = useState('')
  const [refreshKey,   setRefreshKey] = useState(0)
  const [form, setForm] = useState({
    recorded_at: '', weight_kg: '', height_cm: '', head_circumference_cm: '',
  })

  const isMenino  = patient.gender === 'M'
  const ageMonths = idadeEmMeses(patient.birthdate)

  /* ── Refetch: skeleton só no 1º load, silencioso nos demais ── */
  useEffect(() => {
    let cancelled = false
    if (refreshKey === 0) {
      setLoading(true)      // 1º load → mostra skeleton
    } else {
      setRefreshing(true)   // refresh após save → spinner sutil, gráficos ficam visíveis
    }
    supabase
      .from('growth_records')
      .select('*')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error) {
          const enriched = (data ?? []).map(m => ({
            ...m,
            age_months: differenceInMonths(parseISO(m.recorded_at), parseISO(patient.birthdate)),
          }))
          setMedidas(enriched)
        }
        setLoading(false)
        setRefreshing(false)
      })
    return () => { cancelled = true }
  }, [patient.id, refreshKey])

  const resetForm = () => setForm({ recorded_at: '', weight_kg: '', height_cm: '', head_circumference_cm: '' })

  const save = async () => {
    if (!form.recorded_at) return
    setSaving(true)
    setSaveErro('')
    const { error } = await supabase.from('growth_records').insert({
      patient_id:            patient.id,
      recorded_at:           form.recorded_at,
      weight_kg:             form.weight_kg             ? parseFloat(form.weight_kg)             : null,
      height_cm:             form.height_cm             ? parseFloat(form.height_cm)             : null,
      head_circumference_cm: form.head_circumference_cm ? parseFloat(form.head_circumference_cm) : null,
      recorded_by:           session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) {
      setSaveErro(error.message)
    } else {
      setModal(false)
      resetForm()
      setRefreshKey(k => k + 1)
    }
  }

  const del = async (id) => {
    await supabase.from('growth_records').delete().eq('id', id)
    setRefreshKey(k => k + 1)
  }

  // Tabela: mais recente primeiro
  const medidasDesc = [...medidas].sort(
    (a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)
  )

  return (
    <div className="space-y-4">
      {/* Barra de ação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500">{medidas.length} medição{medidas.length !== 1 ? 'ões' : ''}</p>
          {refreshing && <Loader2 size={14} className="animate-spin text-blue-500" />}
        </div>
        <button
          onClick={() => { resetForm(); setSaveErro(''); setModal(true) }}
          className="btn-primary"
        >
          <Plus size={15} /> Nova medição
        </button>
      </div>

      {ageMonths > 24 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-lg">
          ⚠️ Curvas OMS disponíveis para 0–24 meses. Paciente com {calcIdade(patient.birthdate)}.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card h-64 animate-pulse bg-slate-100" />)}
        </div>
      ) : medidas.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Scale size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma medição registrada</p>
          <p className="text-xs mt-1">Cadastre a primeira medição para ver os gráficos de crescimento OMS</p>
        </div>
      ) : (
        /* Layout: gráficos (60%) + tabela (40%) em desktop; empilhado em mobile */
        <div className="lg:grid lg:grid-cols-[60%_40%] lg:gap-4 space-y-4 lg:space-y-0">

          {/* Coluna dos gráficos */}
          <div className="space-y-4">
            <GrowthChart
              title={`Peso — ${isMenino ? 'Meninos' : 'Meninas'}`} unit="kg"
              whoData={isMenino ? WHO_PESO_MENINOS : WHO_PESO_MENINAS}
              patientData={medidas} dataKey="weight_kg"
            />
            <GrowthChart
              title={`Estatura — ${isMenino ? 'Meninos' : 'Meninas'}`} unit="cm"
              whoData={isMenino ? WHO_ALTURA_MENINOS : WHO_ALTURA_MENINAS}
              patientData={medidas} dataKey="height_cm"
            />
            <GrowthChart
              title={`Perímetro Cefálico — ${isMenino ? 'Meninos' : 'Meninas'}`} unit="cm"
              whoData={isMenino ? WHO_PC_MENINOS : WHO_PC_MENINAS}
              patientData={medidas} dataKey="head_circumference_cm"
            />
          </div>

          {/* Coluna da tabela */}
          <div>
            <TabelaMedidas medidas={medidasDesc} onDelete={del} />
          </div>
        </div>
      )}

      {modal && (
        <Modal title="Nova Medição Antropométrica" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" max={new Date().toISOString().split('T')[0]}
                value={form.recorded_at}
                onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label flex items-center gap-1"><Scale size={12} /> Peso (kg)</label>
                <input type="number" step="0.001" className="input" placeholder="ex: 7.350"
                  value={form.weight_kg}
                  onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Ruler size={12} /> Alt. (cm)</label>
                <input type="number" step="0.1" className="input" placeholder="ex: 65.0"
                  value={form.height_cm}
                  onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Brain size={12} /> PC (cm)</label>
                <input type="number" step="0.1" className="input" placeholder="ex: 42.0"
                  value={form.head_circumference_cm}
                  onChange={e => setForm(f => ({ ...f, head_circumference_cm: e.target.value }))} />
              </div>
            </div>
            {saveErro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                <span className="shrink-0">⚠️</span> {saveErro}
              </div>
            )}
            <button onClick={save} disabled={saving || !form.recorded_at} className="btn-primary w-full py-2.5">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar medição'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* helper: extrai storage path de uma file_url (path simples ou URL legada) */
function extractStoragePath(fileUrl) {
  if (!fileUrl) return null
  if (fileUrl.startsWith('http')) {
    const match = fileUrl.match(/\/prescricoes\/(.+)/)
    return match ? match[1] : null
  }
  return fileUrl
}

/* ═══════════════════════════════════════════
   ABA 3 — RECEITAS MÉDICAS
═══════════════════════════════════════════ */
const PRESCRIPTION_STATUS = {
  active:   { label: 'Ativa',   color: 'bg-green-100 text-green-700'  },
  inactive: { label: 'Inativa', color: 'bg-slate-100 text-slate-500'  },
}

function TabReceitas({ patient }) {
  const { session } = useAuth()
  const [receitas,    setReceitas]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [uploadPct,   setUploadPct]   = useState(0)
  const [erro,        setErro]        = useState('')
  const [form, setForm] = useState({
    title: '', description: '',
    prescribed_at: new Date().toISOString().split('T')[0],
    expires_at: '', file: null, fileName: '',
  })

  const load = async () => {
    const { data } = await supabase.from('prescriptions')
      .select('*').eq('patient_id', patient.id)
      .order('prescribed_at', { ascending: false })
    const rows = (data ?? []).map(r => {
      if (!r.file_url) return r
      const storagePath = extractStoragePath(r.file_url)
      if (!storagePath) return r
      const { data: urlData } = supabase.storage
        .from('prescricoes')
        .getPublicUrl(storagePath)
      return { ...r, _publicUrl: urlData.publicUrl }
    })
    setReceitas(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [patient.id])

  const resetForm = () => setForm({
    title: '', description: '',
    prescribed_at: new Date().toISOString().split('T')[0],
    expires_at: '', file: null, fileName: '',
  })

  const onFileChange = (e) => {
    const f = e.target.files?.[0] ?? null
    setForm(prev => ({ ...prev, file: f, fileName: f?.name ?? '' }))
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    setErro('')
    setUploadPct(0)

    let fileUrl       = null
    let fileType      = null
    let uploadAviso   = null   // aviso não-bloqueante se o upload falhar

    /* ── 1. Upload para Supabase Storage (não bloqueia o save se falhar) ── */
    if (form.file) {
      try {
        const ext      = form.file.name.split('.').pop().toLowerCase()
        // Sanitiza o nome: remove acentos e substitui chars inválidos para o Storage
        const safeName = form.file.name
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${patient.id}/${Date.now()}_${safeName}`
        fileType   = ext === 'pdf' ? 'pdf' : 'image'

        setUploadPct(30)
        const { error: upErr } = await supabase.storage
          .from('prescricoes')
          .upload(path, form.file, { contentType: form.file.type, upsert: false })

        if (upErr) {
          // Upload falhou → prescrição será salva sem anexo
          uploadAviso = `⚠️ Arquivo não anexado (${upErr.message}).`
          fileUrl  = null
          fileType = null
        } else {
          setUploadPct(100)
          fileUrl = path   // salva o path; signed URL gerada no momento da abertura
        }
      } catch (e) {
        uploadAviso = `⚠️ Arquivo não anexado: ${e.message}`
      }
    }

    /* ── 2. Insert na tabela (separado do upload) ── */
    try {
      const { error } = await supabase.from('prescriptions').insert({
        patient_id:    patient.id,
        doctor_id:     session.user.id,
        title:         form.title.trim(),
        description:   form.description.trim() || null,
        prescribed_at: form.prescribed_at,
        expires_at:    form.expires_at || null,
        file_url:      fileUrl,
        file_type:     fileType,
        is_active:     true,
      })
      if (error) throw error

      setModal(false)
      resetForm()
      load()
      // Mostra aviso de upload fora do modal (se houver)
      if (uploadAviso) setErro(uploadAviso)
    } catch (err) {
      setErro(err.message ?? 'Erro ao salvar prescrição.')
    } finally {
      setSaving(false)
      setUploadPct(0)
    }
  }

  const toggleAtivo = async (r) => {
    await supabase.from('prescriptions').update({ is_active: !r.is_active }).eq('id', r.id)
    load()
  }

  const del = async (id) => {
    await supabase.from('prescriptions').delete().eq('id', id)
    setReceitas(r => r.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{receitas.length} prescrição{receitas.length !== 1 ? 'ões' : ''}</p>
        <button onClick={() => { resetForm(); setErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Nova prescrição
        </button>
      </div>

      {/* Aviso de upload falhado (exibido fora do modal) */}
      {erro && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1">
            <p>{erro}</p>
            {erro.includes('bucket') && (
              <p className="mt-1 text-xs text-amber-700">
                No Supabase: <strong>Storage → New bucket</strong> → nome: <code>prescricoes</code> → marcar <strong>Public</strong>
              </p>
            )}
          </div>
          <button onClick={() => setErro('')} className="shrink-0 text-amber-500 hover:text-amber-700">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : receitas.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma prescrição registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {receitas.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{r.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.is_active ? PRESCRIPTION_STATUS.active.color : PRESCRIPTION_STATUS.inactive.color
                    }`}>
                      {r.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                    <span>📅 {format(parseISO(r.prescribed_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    {r.expires_at && (
                      <span>⏱ Válida até {format(parseISO(r.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    )}
                  </div>
                  {r._publicUrl && (
                    <a href={r._publicUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                      <Paperclip size={12} />
                      {r.file_type === 'pdf' ? 'Abrir PDF' : 'Ver imagem'}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle ativo/inativo */}
                  <button onClick={() => toggleAtivo(r)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-slate-100"
                    title={r.is_active ? 'Desativar prescrição' : 'Reativar prescrição'}>
                    {r.is_active
                      ? <ToggleRight size={18} className="text-green-500" />
                      : <ToggleLeft  size={18} className="text-slate-400" />}
                  </button>
                  <button onClick={() => del(r.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal nova prescrição ── */}
      {modal && (
        <Modal title="Nova Prescrição Médica" onClose={() => { setModal(false); resetForm(); setErro('') }}>
          <div className="space-y-4">

            <div>
              <label className="label">Título *</label>
              <input className="input" placeholder="Ex: Omeprazol 10 mg/dia"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div>
              <label className="label">Descrição / Posologia</label>
              <textarea className="input resize-none" rows={3}
                placeholder="Dose, frequência, orientações…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data da prescrição</label>
                <input type="date" className="input"
                  value={form.prescribed_at}
                  onChange={e => setForm(f => ({ ...f, prescribed_at: e.target.value }))} />
              </div>
              <div>
                <label className="label">Válida até</label>
                <input type="date" className="input"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
            </div>

            {/* Upload de arquivo */}
            <div>
              <label className="label">Anexar PDF ou imagem</label>
              <label className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                ${form.file
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                <Upload size={16} className={form.file ? 'text-blue-500' : 'text-slate-400'} />
                <span className={`text-sm flex-1 truncate ${form.file ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                  {form.fileName || 'Clique para selecionar (PDF, JPG, PNG…)'}
                </span>
                {form.file && (
                  <button type="button"
                    onClick={e => { e.preventDefault(); setForm(f => ({ ...f, file: null, fileName: '' })) }}
                    className="text-slate-400 hover:text-red-500 shrink-0">
                    <X size={14} />
                  </button>
                )}
                <input type="file" accept=".pdf,image/*" className="sr-only" onChange={onFileChange} />
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Máx. 10 MB · PDF, JPG, PNG · salvo no Supabase Storage (bucket: <code>prescricoes</code>)
              </p>
            </div>

            {/* Barra de progresso do upload */}
            {saving && uploadPct > 0 && uploadPct < 100 && (
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            )}

            {/* Erro */}
            {erro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                <span className="shrink-0">⚠️</span> {erro}
              </div>
            )}

            <button onClick={save} disabled={saving || !form.title.trim()}
              className="btn-primary w-full py-2.5">
              {saving
                ? <><Loader2 size={15} className="animate-spin" />
                    {uploadPct > 0 && uploadPct < 100 ? `Enviando arquivo… ${uploadPct}%` : 'Salvando…'}
                  </>
                : 'Salvar prescrição'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA 4 — DICAS E ORIENTAÇÕES
═══════════════════════════════════════════ */
const CATEGORY_META = {
  nutrition: { label: 'Nutrição',        emoji: '🥗', color: 'bg-green-50 text-green-700 border-green-200'  },
  growth:    { label: 'Crescimento',     emoji: '📏', color: 'bg-blue-50 text-blue-700 border-blue-200'    },
  sleep:     { label: 'Sono',            emoji: '😴', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  hygiene:   { label: 'Higiene',         emoji: '🦷', color: 'bg-cyan-50 text-cyan-700 border-cyan-200'    },
  vaccines:  { label: 'Vacinas',         emoji: '💉', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  general:   { label: 'Geral',           emoji: '💡', color: 'bg-slate-50 text-slate-700 border-slate-200'  },
}

function TabDicas({ patient }) {
  const [tips,     setTips]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('all')

  useEffect(() => {
    supabase.from('tips')
      .select('id, title, content, category, image_url, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .then(({ data }) => { setTips(data ?? []); setLoading(false) })
  }, [])

  const tipsVisiveis = filtro === 'all'
    ? tips
    : tips.filter(t => t.category === filtro)

  const categoriesPresentes = ['all', ...new Set(tips.map(t => t.category))]

  return (
    <div className="space-y-4">
      {/* Info do paciente */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-blue-700">
          Paciente: <span className="font-bold">{patient.name}</span> · {calcIdade(patient.birthdate)}
        </p>
      </div>

      {/* Filtros por categoria */}
      {!loading && tips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoriesPresentes.map(cat => {
            const meta = CATEGORY_META[cat]
            return (
              <button key={cat} onClick={() => setFiltro(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                  ${filtro === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                {cat === 'all' ? '✨ Todas' : `${meta?.emoji} ${meta?.label}`}
              </button>
            )
          })}
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-32 animate-pulse bg-slate-100" />)}
        </div>
      ) : tipsVisiveis.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Lightbulb size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma dica publicada ainda</p>
          <p className="text-xs mt-1">As dicas criadas pelo médico aparecerão aqui</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tipsVisiveis.map(tip => {
            const meta = CATEGORY_META[tip.category] ?? CATEGORY_META.general
            return (
              <div key={tip.id} className="card overflow-hidden">
                {tip.image_url && (
                  <img src={tip.image_url} alt={tip.title}
                    className="w-full h-32 object-cover" />
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.color}`}>
                      {meta.emoji} {meta.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug">{tip.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{tip.content}</p>
                  {tip.published_at && (
                    <p className="text-xs text-slate-400">
                      {format(parseISO(tip.published_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Alerta fixo */}
      <div className="card p-4 border-red-200 bg-red-50">
        <h3 className="font-semibold text-red-700 text-sm mb-2">🚨 Sinais de alerta — procure atendimento</h3>
        <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
          <li>Febre acima de 38 °C em menores de 3 meses</li>
          <li>Recusa alimentar persistente ou vômitos frequentes</li>
          <li>Perda de peso ou ganho ponderal insuficiente</li>
          <li>Dificuldade respiratória ou cianose</li>
          <li>Convulsões ou alteração do nível de consciência</li>
        </ul>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA 0 — DADOS DE CADASTRO
═══════════════════════════════════════════ */

/* Tag Input reutilizável nesta página */
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  const add = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }
  const remove = tag => onChange(tags.filter(t => t !== tag))
  return (
    <div
      className="input flex flex-wrap gap-1.5 h-auto min-h-[42px] cursor-text py-2"
      onClick={e => e.currentTarget.querySelector('input')?.focus()}
    >
      {tags.map(tag => (
        <span key={tag}
          className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
          {tag}
          <button type="button" onClick={() => remove(tag)} className="hover:text-amber-600">
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? 'Digite e pressione Enter…' : ''}
        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent placeholder-slate-400"
      />
    </div>
  )
}

const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

function TabCadastro({ patient, onUpdate }) {
  /* ── parse notes ── */
  let notesData = {}
  if (patient.notes) {
    try { notesData = JSON.parse(patient.notes) }
    catch { notesData = { notas: patient.notes } }
  }

  const allergies = Array.isArray(patient.allergies)
    ? patient.allergies
    : patient.allergies ? patient.allergies.split(',').map(a => a.trim()) : []

  /* ── dados de nascimento (primeiro growth_record) ── */
  const [nascimento, setNascimento] = useState(null)
  useEffect(() => {
    // Busca o registro mais antigo do paciente — independente de fuso horário
    supabase.from('growth_records')
      .select('weight_kg, height_cm, head_circumference_cm, recorded_at, notes')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setNascimento(data ?? null))
  }, [patient.id])

  /* ── edição ── */
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState('')
  const [form, setForm] = useState({
    name:            patient.name        || '',
    birthdate:       patient.birthdate   || '',
    gender:          patient.gender      || '',
    blood_type:      patient.blood_type  || '',
    father_name:     notesData.pai       || '',
    mother_name:     notesData.mae       || '',
    notas:           notesData.notas     || '',
    birth_weight:    '',
    birth_height:    '',
    birth_head_circ: '',
  })
  const [editAllergies, setEditAllergies] = useState(allergies)

  const openEdit = () => {
    // Sincroniza form com dados atuais ao abrir
    let nd = {}
    if (patient.notes) { try { nd = JSON.parse(patient.notes) } catch { nd = { notas: patient.notes } } }
    const al = Array.isArray(patient.allergies)
      ? patient.allergies
      : patient.allergies ? patient.allergies.split(',').map(a => a.trim()) : []
    setForm({
      name:            patient.name       || '',
      birthdate:       patient.birthdate  || '',
      gender:          patient.gender     || '',
      blood_type:      patient.blood_type || '',
      father_name:     nd.pai   || '',
      mother_name:     nd.mae   || '',
      notas:           nd.notas || '',
      birth_weight:    nascimento?.weight_kg             != null ? String(nascimento.weight_kg)             : '',
      birth_height:    nascimento?.height_cm             != null ? String(nascimento.height_cm)             : '',
      birth_head_circ: nascimento?.head_circumference_cm != null ? String(nascimento.head_circumference_cm) : '',
    })
    setEditAllergies(al)
    setErro('')
    setEditing(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.birthdate) return
    setSaving(true)
    setErro('')
    try {
      const notesObj = {}
      if (form.father_name.trim()) notesObj.pai   = form.father_name.trim()
      if (form.mother_name.trim()) notesObj.mae   = form.mother_name.trim()
      if (form.notas.trim())       notesObj.notas = form.notas.trim()

      const { error } = await supabase.from('patients').update({
        name:       form.name.trim(),
        birthdate:  form.birthdate,
        gender:     form.gender     || null,
        blood_type: form.blood_type || null,
        allergies:  editAllergies.length ? editAllergies : null,
        notes:      Object.keys(notesObj).length ? JSON.stringify(notesObj) : null,
      }).eq('id', patient.id)

      if (error) throw error

      /* Dados antropométricos de nascimento → growth_records */
      const hasBirth = form.birth_weight || form.birth_height || form.birth_head_circ
      if (hasBirth && form.birthdate) {
        const payload = {
          patient_id:            patient.id,
          recorded_at:           form.birthdate,
          weight_kg:             form.birth_weight    ? parseFloat(form.birth_weight)    : null,
          height_cm:             form.birth_height    ? parseFloat(form.birth_height)    : null,
          head_circumference_cm: form.birth_head_circ ? parseFloat(form.birth_head_circ) : null,
          notes:                 'Dados de nascimento',
        }
        if (nascimento?.id) {
          await supabase.from('growth_records').update(payload).eq('id', nascimento.id)
        } else {
          await supabase.from('growth_records').insert(payload)
        }
      }

      setEditing(false)
      onUpdate()   // refetch do paciente no componente pai
    } catch (err) {
      setErro(err.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  /* ── seção de exibição ── */
  const Row = ({ label, value }) => (
    <div className="flex gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="w-40 shrink-0 text-xs text-slate-400 font-medium uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 flex-1">{value || <span className="text-slate-300 italic">—</span>}</span>
    </div>
  )

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── Modo exibição ── */}
      {!editing && (
        <>
          {/* Identificação */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 text-sm">Identificação</h3>
              <button onClick={openEdit}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                <Pencil size={13} /> Editar cadastro
              </button>
            </div>
            <Row label="Nome" value={patient.name} />
            <Row label="Data de nascimento"
              value={patient.birthdate
                ? format(parseISO(patient.birthdate), "dd/MM/yyyy", { locale: ptBR })
                : null} />
            <Row label="Idade" value={calcIdade(patient.birthdate)} />
            <Row label="Gênero"
              value={patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : null} />
            <Row label="Tipo sanguíneo"
              value={patient.blood_type
                ? <span className="bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded text-xs">{patient.blood_type}</span>
                : null} />
          </div>

          {/* Responsáveis */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Responsáveis</h3>
            <Row label="Pai / Responsável" value={notesData.pai} />
            <Row label="Mãe / Responsável" value={notesData.mae} />
          </div>

          {/* Dados de nascimento */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Dados Antropométricos de Nascimento</h3>
            {nascimento ? (
              <>
                <Row label="Peso" value={nascimento.weight_kg != null ? `${nascimento.weight_kg.toFixed(3)} kg` : null} />
                <Row label="Estatura" value={nascimento.height_cm != null ? `${nascimento.height_cm.toFixed(1)} cm` : null} />
                <Row label="Perímetro cefálico" value={nascimento.head_circumference_cm != null ? `${nascimento.head_circumference_cm.toFixed(1)} cm` : null} />
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">Dados de nascimento não registrados</p>
            )}
          </div>

          {/* Alergias */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Alergias e Intolerâncias</h3>
            {allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allergies.map(a => (
                  <span key={a} className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">{a}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Nenhuma alergia registrada</p>
            )}
          </div>

          {/* Observações clínicas */}
          {notesData.notas && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-700 text-sm mb-2">Observações Clínicas</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{notesData.notas}</p>
            </div>
          )}
        </>
      )}

      {/* ── Modo edição ── */}
      {editing && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Editar Cadastro</h3>
            <button onClick={() => setEditing(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>

          {/* Identificação */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Identificação</p>
            <div>
              <label className="label">Nome completo *</label>
              <input className="input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data de nascimento *</label>
                <input type="date" className="input"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.birthdate}
                  onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Gênero</label>
                <select className="input" value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option value="">— Selecione —</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Tipo sanguíneo</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_TYPES.map(bt => (
                  <label key={bt} className="relative cursor-pointer">
                    <input type="radio" value={bt} className="sr-only peer"
                      checked={form.blood_type === bt}
                      onChange={() => setForm(f => ({ ...f, blood_type: bt }))} />
                    <div className="text-center py-1.5 rounded-lg border-2 border-slate-200 text-xs font-semibold text-slate-600
                      peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-700
                      hover:border-slate-300 transition-all">
                      {bt}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Dados de Nascimento */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dados de Nascimento</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label flex items-center gap-1"><Scale size={12} /> Peso (kg)</label>
                <input type="number" step="0.001" min="0.3" max="8" className="input"
                  placeholder="ex: 3.250"
                  value={form.birth_weight}
                  onChange={e => setForm(f => ({ ...f, birth_weight: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Ruler size={12} /> Estatura (cm)</label>
                <input type="number" step="0.1" min="20" max="70" className="input"
                  placeholder="ex: 49.5"
                  value={form.birth_height}
                  onChange={e => setForm(f => ({ ...f, birth_height: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Brain size={12} /> PC (cm)</label>
                <input type="number" step="0.1" min="20" max="45" className="input"
                  placeholder="ex: 34.0"
                  value={form.birth_head_circ}
                  onChange={e => setForm(f => ({ ...f, birth_head_circ: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Responsáveis */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Responsáveis</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Pai / Responsável</label>
                <input className="input" placeholder="Nome completo"
                  value={form.father_name}
                  onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Mãe / Responsável</label>
                <input className="input" placeholder="Nome completo"
                  value={form.mother_name}
                  onChange={e => setForm(f => ({ ...f, mother_name: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Alergias */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alergias</p>
            <TagInput tags={editAllergies} onChange={setEditAllergies} />
            <div className="flex flex-wrap gap-1.5">
              {['Leite de vaca','Glúten','Ovo','Soja','Amendoim','Frutos do mar'].map(a =>
                !editAllergies.includes(a) && (
                  <button key={a} type="button"
                    onClick={() => setEditAllergies(p => [...p, a])}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                    <Plus size={10} /> {a}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observações Clínicas</p>
            <textarea className="input resize-none" rows={3}
              placeholder="Histórico clínico, condições relevantes…"
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>

          {erro && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <span className="shrink-0">⚠️</span> {erro}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditing(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button onClick={save} disabled={saving || !form.name.trim() || !form.birthdate}
              className="btn-primary flex-1">
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
                : <><Check size={15} /> Salvar alterações</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA — DIÁRIO DE FEZES (médico, read + add)
═══════════════════════════════════════════ */
const BRISTOL_DOC = [
  { tipo: 1, desc: 'Caroços duros e separados',             resumo: 'Constipação grave',  cor: 'bg-red-100 text-red-700 border-red-200'        },
  { tipo: 2, desc: 'Salsicha grumosa e irregular',           resumo: 'Constipação leve',   cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  { tipo: 3, desc: 'Salsicha com rachaduras na superfície',  resumo: 'Normal',             cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { tipo: 4, desc: 'Cilíndrica, macia e lisa',               resumo: 'Ideal',              cor: 'bg-green-100 text-green-700 border-green-200'   },
  { tipo: 5, desc: 'Pedaços macios com bordas definidas',    resumo: 'Diarreia leve',      cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { tipo: 6, desc: 'Pedaços fofos com bordas irregulares',   resumo: 'Diarreia moderada',  cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  { tipo: 7, desc: 'Totalmente líquido, sem partes sólidas', resumo: 'Diarreia grave',     cor: 'bg-red-100 text-red-700 border-red-200'         },
]
const CORES_DOC = [
  { value: 'marrom',   label: 'Marrom',       dot: 'bg-amber-800'  },
  { value: 'amarelo',  label: 'Amarelo',      dot: 'bg-yellow-400' },
  { value: 'verde',    label: 'Verde',        dot: 'bg-green-500'  },
  { value: 'vermelho', label: 'Vermelho',     dot: 'bg-red-500'    },
  { value: 'preto',    label: 'Preto',        dot: 'bg-gray-900'   },
  { value: 'branco',   label: 'Branco/Cinza', dot: 'bg-gray-300'   },
]

function TabFezes({ patient }) {
  const { session } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().slice(0, 16),
    bristol_type: null, color: 'marrom',
    has_blood: false, has_mucus: false, notes: '',
  })

  const load = () => {
    supabase.from('stool_records')
      .select('*').eq('patient_id', patient.id)
      .order('recorded_at', { ascending: false }).limit(60)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }
  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    recorded_at: new Date().toISOString().slice(0, 16),
    bristol_type: null, color: 'marrom',
    has_blood: false, has_mucus: false, notes: '',
  })

  const save = async () => {
    if (!form.recorded_at || !form.bristol_type) return
    setSaving(true); setSaveErro('')
    const { error } = await supabase.from('stool_records').insert({
      patient_id: patient.id,
      recorded_at: new Date(form.recorded_at).toISOString(),
      bristol_type: form.bristol_type,
      color: form.color || null,
      has_blood: form.has_blood, has_mucus: form.has_mucus,
      notes: form.notes || null,
      created_by: session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) { setSaveErro(error.message) }
    else { setModal(false); resetForm(); load() }
  }

  const del = async (id) => {
    await supabase.from('stool_records').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const porDia = entries.reduce((acc, e) => {
    const dia = format(parseISO(e.recorded_at), 'yyyy-MM-dd')
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(e); return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Registrar evacuação
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="card p-4 h-16 animate-pulse bg-slate-100" />)}</div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Droplets size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum registro de evacuação</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porDia).map(([dia, itens]) => (
            <div key={dia}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {format(parseISO(dia), "EEEE, dd/MM/yyyy", { locale: ptBR })}
              </p>
              <div className="space-y-2">
                {itens.map(e => {
                  const b = BRISTOL_DOC[e.bristol_type - 1]
                  const c = CORES_DOC.find(x => x.value === e.color)
                  return (
                    <div key={e.id} className="card p-4 flex items-start gap-3">
                      <span className="text-xl shrink-0">💩</span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {b && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${b.cor}`}>
                              Tipo {e.bristol_type} · {b.resumo}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{format(parseISO(e.recorded_at), 'HH:mm')}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {c && <span className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />{c.label}</span>}
                          {e.has_blood && <span className="bg-red-50 text-red-600 font-medium px-1.5 py-0.5 rounded">🩸 Sangue</span>}
                          {e.has_mucus && <span className="bg-yellow-50 text-yellow-700 font-medium px-1.5 py-0.5 rounded">Muco</span>}
                        </div>
                        {e.notes && <p className="text-xs text-slate-400 italic">{e.notes}</p>}
                      </div>
                      <button onClick={() => del(e.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Registrar Evacuação" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Data e hora *</label>
              <input type="datetime-local" className="input" value={form.recorded_at}
                onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo — Escala de Bristol *</label>
              <div className="space-y-2">
                {BRISTOL_DOC.map(b => (
                  <label key={b.tipo}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${form.bristol_type === b.tipo
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="btype" className="sr-only"
                      checked={form.bristol_type === b.tipo}
                      onChange={() => setForm(f => ({ ...f, bristol_type: b.tipo }))} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${b.cor}`}>
                      {b.tipo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 leading-snug">{b.desc}</p>
                      <p className={`text-xs font-semibold mt-0.5 ${b.cor.split(' ')[1]}`}>{b.resumo}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex flex-wrap gap-2">
                {CORES_DOC.map(c => (
                  <label key={c.value} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 cursor-pointer text-xs transition-all
                    ${form.color === c.value ? 'border-blue-400 bg-blue-50 font-medium' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="stool-color" className="sr-only"
                      checked={form.color === c.value}
                      onChange={() => setForm(f => ({ ...f, color: c.value }))} />
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />{c.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              {[
                { key: 'has_blood', label: '🩸 Sangue',  activeClass: 'border-red-400 bg-red-50'    },
                { key: 'has_mucus', label: 'Muco',        activeClass: 'border-yellow-400 bg-yellow-50' },
              ].map(({ key, label, activeClass }) => (
                <label key={key} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${form[key] ? activeClass : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" className="sr-only"
                    checked={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                    ${form[key] ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}>
                    {form[key] && <span className="text-xs font-bold">✓</span>}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Dor, esforço, frequência…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {saveErro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                <span className="shrink-0">⚠️</span> {saveErro}
              </div>
            )}
            <button onClick={save} disabled={saving || !form.bristol_type} className="btn-primary w-full py-2.5">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar registro'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════ */
const TABS = [
  { id: 'cadastro',  label: 'Cadastro',         icon: ClipboardList   },
  { id: 'diario',   label: 'Diário Alimentar', icon: UtensilsCrossed },
  { id: 'fezes',    label: 'Fezes',             icon: Droplets        },
  { id: 'graficos', label: 'Gráficos',          icon: TrendingUp      },
  { id: 'receitas', label: 'Receitas',          icon: FileText        },
  { id: 'dicas',    label: 'Dicas',             icon: Lightbulb       },
  { id: 'marcos',   label: 'Marcos',            icon: Milestone       },
  { id: 'vacinas',  label: 'Vacinas',           icon: Syringe         },
]

export default function PacienteDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const [patient,    setPatient]   = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [activeTab,  setActiveTab] = useState('cadastro')
  const [confirmDel, setConfirmDel] = useState(false)
  const [deletando,  setDeletando]  = useState(false)

  const handleDeletePaciente = async () => {
    setDeletando(true)
    try {
      await supabase.from('meals')         .delete().eq('patient_id', id)
      await supabase.from('stool_records') .delete().eq('patient_id', id)
      await supabase.from('growth_records').delete().eq('patient_id', id)
      await supabase.from('prescriptions') .delete().eq('patient_id', id)
      await supabase.from('patients')      .delete().eq('id', id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Erro ao excluir paciente:', err)
      setDeletando(false)
      setConfirmDel(false)
    }
  }

  const loadPatient = () => {
    supabase.from('patients').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) navigate('/dashboard', { replace: true })
        else setPatient(data)
        setLoading(false)
      })
  }

  useEffect(() => { loadPatient() }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  )
  if (!patient) return null

  const allergies = Array.isArray(patient.allergies)
    ? patient.allergies
    : patient.allergies ? patient.allergies.split(',').map(a => a.trim()) : []

  // Parseia notes como JSON (novo formato) ou texto puro (legado)
  let notesData = {}
  if (patient.notes) {
    try { notesData = JSON.parse(patient.notes) }
    catch { notesData = { notas: patient.notes } }
  }
  const nomePai  = notesData.pai   || null
  const nomeMae  = notesData.mae   || null
  const notasCli = notesData.notas || null

  const avatarColor = patient.gender === 'M' ? 'bg-blue-600'
                    : patient.gender === 'F' ? 'bg-pink-500' : 'bg-slate-500'
  const initials = patient.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex flex-col h-full">

      {/* Cabeçalho */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0">
            <ArrowLeft size={20} />
          </button>

          <div className={`w-14 h-14 rounded-2xl ${avatarColor} flex items-center justify-center shrink-0`}>
            <span className="text-white font-bold text-xl">{initials}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-bold text-slate-800 text-lg leading-tight truncate">{patient.name}</h1>
              <button
                onClick={() => setConfirmDel(true)}
                title="Excluir paciente"
                className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">{calcIdade(patient.birthdate)}</span>
              {patient.gender && (
                <span className="text-xs text-slate-400">
                  {patient.gender === 'M' ? '♂ Masculino' : '♀ Feminino'}
                </span>
              )}
              {patient.blood_type && (
                <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                  {patient.blood_type}
                </span>
              )}
              {allergies.map(a => (
                <span key={a} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
            {/* Responsáveis */}
            {(nomePai || nomeMae) && (
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                {nomePai && <span>👨 {nomePai}</span>}
                {nomeMae && <span>👩 {nomeMae}</span>}
              </div>
            )}
            {/* Observações clínicas */}
            {notasCli && (
              <p className="mt-1.5 text-xs text-slate-400 italic line-clamp-2">{notasCli}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 max-w-4xl mx-auto overflow-x-auto pb-1">
          {TABS.map(tab => {
            const Icon     = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-500 hover:bg-slate-100'}`}>
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'cadastro'  && <TabCadastro  patient={patient} onUpdate={loadPatient} />}
          {activeTab === 'diario'    && <TabDiario    patient={patient} />}
          {activeTab === 'fezes'     && <TabFezes     patient={patient} />}
          {activeTab === 'graficos'  && <TabGraficos  patient={patient} />}
          {activeTab === 'receitas'  && <TabReceitas  patient={patient} />}
          {activeTab === 'dicas'     && <TabDicas     patient={patient} />}
          {activeTab === 'marcos'    && <TabMarcos  birthdate={patient.birthdate} />}
          {activeTab === 'vacinas'   && <TabVacinas birthdate={patient.birthdate} />}
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-slate-800 text-lg">Excluir paciente?</h3>
              <p className="text-sm text-slate-500">
                Todos os dados de <strong>{patient.name}</strong> serão removidos permanentemente —
                refeições, fezes, gráficos, prescrições e cadastro.
              </p>
              <p className="text-xs text-red-500 font-medium">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmDel(false)}
                disabled={deletando}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePaciente}
                disabled={deletando}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {deletando
                  ? <><Loader2 size={15} className="animate-spin" /> Excluindo…</>
                  : <><Trash2 size={15} /> Excluir</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
