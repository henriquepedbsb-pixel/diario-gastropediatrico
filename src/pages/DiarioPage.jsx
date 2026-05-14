import { useEffect, useState } from 'react'
import { format, parseISO, differenceInMonths, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  UtensilsCrossed, FileText, Lightbulb, Droplets,
  Plus, Trash2, Loader2, Baby, X, Upload, Paperclip,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ─── helpers ─── */

/* Extrai o storage path de file_url (aceita path puro ou URL legada) */
function extractStoragePath(fileUrl) {
  if (!fileUrl) return null
  if (fileUrl.startsWith('http')) {
    const match = fileUrl.match(/\/prescricoes\/(.+)/)
    return match ? match[1] : null
  }
  return fileUrl
}

function calcIdade(birthdate) {
  if (!birthdate) return '—'
  const birth  = parseISO(birthdate)
  const years  = differenceInYears(new Date(), birth)
  const months = differenceInMonths(new Date(), birth)
  if (months < 1)  return '< 1 mês'
  if (months < 24) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}

/* ─── tipos de refeição (mesmo enum do banco) ─── */
const REFEICOES = {
  breakfast:       { label: 'Café da manhã',   emoji: '🌅' },
  morning_snack:   { label: 'Lanche da manhã', emoji: '🍎' },
  lunch:           { label: 'Almoço',          emoji: '🍽️' },
  afternoon_snack: { label: 'Lanche da tarde', emoji: '🍪' },
  dinner:          { label: 'Jantar',          emoji: '🌙' },
  supper:          { label: 'Ceia',            emoji: '🥛' },
}

/* ─── categorias de dicas ─── */
const CATEGORY_META = {
  nutrition: { label: 'Nutrição',    emoji: '🥗', color: 'bg-green-50 text-green-700 border-green-200'   },
  growth:    { label: 'Crescimento', emoji: '📏', color: 'bg-blue-50 text-blue-700 border-blue-200'     },
  sleep:     { label: 'Sono',        emoji: '😴', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  hygiene:   { label: 'Higiene',     emoji: '🦷', color: 'bg-cyan-50 text-cyan-700 border-cyan-200'     },
  vaccines:  { label: 'Vacinas',     emoji: '💉', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  general:   { label: 'Geral',       emoji: '💡', color: 'bg-slate-50 text-slate-700 border-slate-200'  },
}

/* ─── Modal reutilizável ─── */
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
   ABA 1 — DIÁRIO DE REFEIÇÕES
═══════════════════════════════════════════ */
function TabRefeicoes({ patient }) {
  const { session } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    meal_type: 'breakfast',
    eaten_at:  format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: '',
    notes: '',
    file: null,
    fileName: '',
  })

  const load = () => {
    supabase.from('meals')
      .select('*')
      .eq('patient_id', patient.id)
      .order('eaten_at', { ascending: false })
      .limit(60)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }

  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    meal_type: 'breakfast',
    eaten_at:  format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: '',
    notes: '',
    file: null,
    fileName: '',
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
      eaten_at:    new Date(form.eaten_at).toISOString(),
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

  // agrupa entradas por data
  const porDia = entries.reduce((acc, e) => {
    const dia = format(parseISO(e.eaten_at), 'yyyy-MM-dd')
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(e)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setSaveErro(''); setModal(true) }} className="btn-primary">
          <Plus size={15} /> Registrar refeição
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <UtensilsCrossed size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma refeição registrada</p>
          <p className="text-xs mt-1">Toque em "Registrar refeição" para começar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porDia).map(([dia, itens]) => (
            <div key={dia}>
              {/* separador de dia */}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                {format(parseISO(dia), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="space-y-2">
                {itens.map(e => {
                  const ref = REFEICOES[e.meal_type] ?? { label: e.meal_type, emoji: '🍴' }
                  return (
                    <div key={e.id} className="card overflow-hidden">
                      {e.photo_url && (
                        <div className="w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                          <img src={e.photo_url} alt="foto"
                            className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="p-4 flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">{ref.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-800 text-sm">{ref.label}</span>
                            <span className="text-xs text-slate-400 shrink-0">
                              {format(parseISO(e.eaten_at), 'HH:mm')}
                            </span>
                          </div>
                          {e.description && (
                            <p className="text-sm text-slate-600 mt-0.5">{e.description}</p>
                          )}
                          {e.notes && (
                            <p className="text-xs text-slate-400 italic mt-0.5">{e.notes}</p>
                          )}
                        </div>
                        <button onClick={() => del(e.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                          <Trash2 size={15} />
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
              <label className="label">O que comeu?</label>
              <input className="input" placeholder="Ex: papa de fruta, arroz com frango…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Aceitação, vômitos, reações, quantidade…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Foto */}
            <div>
              <label className="label">Foto da refeição (opcional)</label>
              <label className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                ${form.file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                <Upload size={16} className={form.file ? 'text-green-500' : 'text-slate-400'} />
                <span className={`text-sm flex-1 truncate ${form.file ? 'text-green-700 font-medium' : 'text-slate-400'}`}>
                  {form.fileName || 'Selecionar foto…'}
                </span>
                {form.file && (
                  <button type="button"
                    onClick={e => { e.preventDefault(); setForm(f => ({ ...f, file: null, fileName: '' })) }}
                    className="text-slate-400 hover:text-red-500">
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
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar refeição'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA 2 — RECEITAS (read-only para o pai)
═══════════════════════════════════════════ */
function TabReceitas({ patient }) {
  const [receitas, setReceitas] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('prescriptions')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('is_active', true)
      .order('prescribed_at', { ascending: false })
      .then(({ data }) => {
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
      })
  }, [patient.id])

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{receitas.length} prescrição{receitas.length !== 1 ? 'ões' : ''} ativa{receitas.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : receitas.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma prescrição ativa</p>
          <p className="text-xs mt-1">As prescrições emitidas pelo médico aparecem aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {receitas.map(r => (
            <div key={r.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800">{r.title}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Ativa
                </span>
              </div>
              {r.description && (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span>📅 {format(parseISO(r.prescribed_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                {r.expires_at && (
                  <span>⏱ Válida até {format(parseISO(r.expires_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                )}
              </div>
              {r._publicUrl && (
                <a href={r._publicUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
                  <Paperclip size={12} />
                  {r.file_type === 'pdf' ? 'Abrir PDF' : 'Ver imagem'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA 3 — DICAS DO MÉDICO
═══════════════════════════════════════════ */
function TabDicas() {
  const [tips,    setTips]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState('all')

  useEffect(() => {
    supabase.from('tips')
      .select('id, title, content, category, image_url, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .then(({ data }) => { setTips(data ?? []); setLoading(false) })
  }, [])

  const visíveis = filtro === 'all' ? tips : tips.filter(t => t.category === filtro)
  const categorias = ['all', ...new Set(tips.map(t => t.category))]

  return (
    <div className="space-y-4">
      {/* filtros */}
      {!loading && tips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categorias.map(cat => {
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

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse bg-slate-100" />)}
        </div>
      ) : visíveis.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Lightbulb size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma dica publicada</p>
          <p className="text-xs mt-1">O médico publicará orientações aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visíveis.map(tip => {
            const meta = CATEGORY_META[tip.category] ?? CATEGORY_META.general
            return (
              <div key={tip.id} className="card overflow-hidden">
                {tip.image_url && (
                  <img src={tip.image_url} alt={tip.title}
                    className="w-full h-36 object-cover" />
                )}
                <div className="p-4 space-y-2">
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border font-medium ${meta.color}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug">{tip.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{tip.content}</p>
                  {tip.published_at && (
                    <p className="text-xs text-slate-400">
                      {format(parseISO(tip.published_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* alerta fixo */}
      <div className="card p-4 border-red-200 bg-red-50">
        <h3 className="font-semibold text-red-700 text-sm mb-2">🚨 Sinais de alerta — procure atendimento</h3>
        <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
          <li>Febre acima de 38 °C em menores de 3 meses</li>
          <li>Recusa alimentar persistente ou vômitos frequentes</li>
          <li>Perda de peso ou ganho insuficiente</li>
          <li>Dificuldade respiratória ou cianose</li>
          <li>Convulsões ou alteração do nível de consciência</li>
        </ul>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA 4 — DIÁRIO DE FEZES (Escala de Bristol)
═══════════════════════════════════════════ */
const BRISTOL = [
  { tipo: 1, desc: 'Caroços duros e separados',          resumo: 'Constipação grave',  cor: 'bg-red-100 text-red-700 border-red-200'       },
  { tipo: 2, desc: 'Salsicha grumosa e irregular',        resumo: 'Constipação leve',   cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  { tipo: 3, desc: 'Salsicha com rachaduras na superfície', resumo: 'Normal',            cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { tipo: 4, desc: 'Cilíndrica, macia e lisa',            resumo: 'Ideal',              cor: 'bg-green-100 text-green-700 border-green-200'   },
  { tipo: 5, desc: 'Pedaços macios com bordas definidas', resumo: 'Diarreia leve',      cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { tipo: 6, desc: 'Pedaços fofos com bordas irregulares',resumo: 'Diarreia moderada', cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  { tipo: 7, desc: 'Totalmente líquido, sem partes sólidas', resumo: 'Diarreia grave', cor: 'bg-red-100 text-red-700 border-red-200'         },
]

const CORES_FEZES = [
  { value: 'marrom',  label: 'Marrom',       dot: 'bg-amber-800'  },
  { value: 'amarelo', label: 'Amarelo',      dot: 'bg-yellow-400' },
  { value: 'verde',   label: 'Verde',        dot: 'bg-green-500'  },
  { value: 'vermelho',label: 'Vermelho',     dot: 'bg-red-500'    },
  { value: 'preto',   label: 'Preto',        dot: 'bg-gray-900'   },
  { value: 'branco',  label: 'Branco/Cinza', dot: 'bg-gray-300 border border-gray-300' },
]

function BristolBadge({ tipo }) {
  const b = BRISTOL[tipo - 1]
  if (!b) return null
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${b.cor}`}>
      Tipo {tipo} · {b.resumo}
    </span>
  )
}

function TabFezes({ patient }) {
  const { session } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')
  const [form, setForm] = useState({
    recorded_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    bristol_type: null,
    color: 'marrom',
    has_blood: false,
    has_mucus: false,
    notes: '',
  })

  const load = () => {
    supabase.from('stool_records')
      .select('*')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: false })
      .limit(60)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }

  useEffect(load, [patient.id])

  const resetForm = () => setForm({
    recorded_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    bristol_type: null,
    color: 'marrom',
    has_blood: false,
    has_mucus: false,
    notes: '',
  })

  const save = async () => {
    if (!form.recorded_at || !form.bristol_type) return
    setSaving(true)
    setSaveErro('')
    const { error } = await supabase.from('stool_records').insert({
      patient_id:   patient.id,
      recorded_at:  new Date(form.recorded_at).toISOString(),
      bristol_type: form.bristol_type,
      color:        form.color || null,
      has_blood:    form.has_blood,
      has_mucus:    form.has_mucus,
      notes:        form.notes || null,
      created_by:   session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) { setSaveErro(error.message) }
    else { setModal(false); resetForm(); load() }
  }

  const del = async (id) => {
    await supabase.from('stool_records').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  // Agrupa por data
  const porDia = entries.reduce((acc, e) => {
    const dia = format(parseISO(e.recorded_at), 'yyyy-MM-dd')
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(e)
    return acc
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
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Droplets size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum registro de evacuação</p>
          <p className="text-xs mt-1">Toque em "Registrar evacuação" para começar</p>
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
                  const corMeta = CORES_FEZES.find(c => c.value === e.color)
                  return (
                    <div key={e.id} className="card p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">💩</span>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <BristolBadge tipo={e.bristol_type} />
                            <span className="text-xs text-slate-400 shrink-0">
                              {format(parseISO(e.recorded_at), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {corMeta && (
                              <span className="flex items-center gap-1">
                                <span className={`w-2.5 h-2.5 rounded-full inline-block ${corMeta.dot}`} />
                                {corMeta.label}
                              </span>
                            )}
                            {e.has_blood && (
                              <span className="bg-red-50 text-red-600 font-medium px-1.5 py-0.5 rounded">
                                🩸 Sangue
                              </span>
                            )}
                            {e.has_mucus && (
                              <span className="bg-yellow-50 text-yellow-700 font-medium px-1.5 py-0.5 rounded">
                                Muco
                              </span>
                            )}
                          </div>
                          {e.notes && (
                            <p className="text-xs text-slate-400 italic">{e.notes}</p>
                          )}
                        </div>
                        <button onClick={() => del(e.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                          <Trash2 size={15} />
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
        <Modal title="Registrar Evacuação" onClose={() => setModal(false)}>
          <div className="space-y-4">

            {/* Data e hora */}
            <div>
              <label className="label">Data e hora *</label>
              <input type="datetime-local" className="input"
                value={form.recorded_at}
                onChange={e => setForm(f => ({ ...f, recorded_at: e.target.value }))} />
            </div>

            {/* Escala de Bristol */}
            <div>
              <label className="label">Tipo de fezes — Escala de Bristol *</label>
              <div className="space-y-2">
                {BRISTOL.map(b => (
                  <label key={b.tipo}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${form.bristol_type === b.tipo
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="bristol" className="sr-only"
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

            {/* Cor */}
            <div>
              <label className="label">Cor</label>
              <div className="grid grid-cols-3 gap-2">
                {CORES_FEZES.map(c => (
                  <label key={c.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                      ${form.color === c.value
                        ? 'border-blue-400 bg-blue-50 font-medium'
                        : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="color" className="sr-only"
                      checked={form.color === c.value}
                      onChange={() => setForm(f => ({ ...f, color: c.value }))} />
                    <span className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Sangue e muco */}
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
                ${form.has_blood ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="checkbox" className="sr-only"
                  checked={form.has_blood}
                  onChange={e => setForm(f => ({ ...f, has_blood: e.target.checked }))} />
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                  ${form.has_blood ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300'}`}>
                  {form.has_blood && <span className="text-xs">✓</span>}
                </span>
                <span className="text-sm font-medium text-slate-700">🩸 Sangue</span>
              </label>
              <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
                ${form.has_mucus ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="checkbox" className="sr-only"
                  checked={form.has_mucus}
                  onChange={e => setForm(f => ({ ...f, has_mucus: e.target.checked }))} />
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                  ${form.has_mucus ? 'bg-yellow-400 border-yellow-400 text-white' : 'border-slate-300'}`}>
                  {form.has_mucus && <span className="text-xs">✓</span>}
                </span>
                <span className="text-sm font-medium text-slate-700">Muco</span>
              </label>
            </div>

            {/* Observações */}
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Dor, esforço, frequência, outros detalhes…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {saveErro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                <span className="shrink-0">⚠️</span> {saveErro}
              </div>
            )}

            <button onClick={save} disabled={saving || !form.bristol_type}
              className="btn-primary w-full py-2.5">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar registro'}
            </button>
            {!form.bristol_type && (
              <p className="text-xs text-center text-slate-400">Selecione o tipo de fezes para continuar</p>
            )}
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
  { id: 'refeicoes', label: 'Refeições', icon: UtensilsCrossed },
  { id: 'fezes',     label: 'Fezes',     icon: Droplets        },
  { id: 'receitas',  label: 'Receitas',  icon: FileText        },
  { id: 'dicas',     label: 'Dicas',     icon: Lightbulb       },
]

export default function DiarioPage() {
  const { paciente, profile } = useAuth()
  const [tab, setTab] = useState('refeicoes')

  /* Paciente não vinculado */
  if (!paciente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
          <Baby size={36} className="text-blue-300" />
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-base">Nenhum paciente vinculado</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Seu perfil ainda não está associado a nenhum paciente.
            Solicite ao Dr. Henrique Gomes que cadastre o seu filho informando o e-mail da sua conta.
          </p>
        </div>
        <a
          href="mailto:henriquepedbsb@gmail.com?subject=Solicitar%20vínculo%20de%20paciente&body=Olá%20Dr.%20Henrique%2C%20gostaria%20de%20vincular%20meu%20perfil%20ao%20paciente."
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          ✉️ Solicitar acesso ao médico
        </a>
        <p className="text-xs text-slate-400">
          Após o vínculo ser feito, basta sair e entrar novamente na conta.
        </p>
      </div>
    )
  }

  /* Avatar */
  const avatarColor = paciente.gender === 'M'
    ? 'bg-blue-100 text-blue-700'
    : paciente.gender === 'F'
    ? 'bg-pink-100 text-pink-700'
    : 'bg-slate-100 text-slate-600'

  const inicial = paciente.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="flex flex-col h-full">

      {/* Cabeçalho do paciente */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${avatarColor}`}>
              {inicial}
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">{paciente.name}</h1>
              <p className="text-sm text-slate-500">
                {calcIdade(paciente.birthdate)}
                {paciente.gender === 'M' ? ' · Masculino' : paciente.gender === 'F' ? ' · Feminino' : ''}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(t => {
              const Icon     = t.icon
              const isActive = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-500 hover:bg-slate-100'}`}>
                  <Icon size={15} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {tab === 'refeicoes' && <TabRefeicoes patient={paciente} />}
          {tab === 'fezes'     && <TabFezes     patient={paciente} />}
          {tab === 'receitas'  && <TabReceitas  patient={paciente} />}
          {tab === 'dicas'     && <TabDicas />}
        </div>
      </div>
    </div>
  )
}
