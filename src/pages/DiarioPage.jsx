import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { markPatientActivity } from '../lib/utils'
import { format, parseISO, differenceInMonths, differenceInYears, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  UtensilsCrossed, FileText, Lightbulb, Droplets,
  Plus, Trash2, Loader2, Baby, X, Upload, Paperclip,
  Milestone, Syringe, Clock, Send, CheckCircle, XCircle,
  ClipboardList, Pencil, Check, Camera,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TabMarcos             from '../components/paciente/TabMarcos'
import TabVacinas            from '../components/paciente/TabVacinas'
import TabSintomas           from '../components/paciente/TabSintomas'
import TabSono               from '../components/paciente/TabSono'
import TabAmamentacao        from '../components/paciente/TabAmamentacao'
import TabIdadeCorrigida     from '../components/paciente/TabIdadeCorrigida'
import TabAlertas            from '../components/paciente/TabAlertas'
import TabDocumentos         from '../components/paciente/TabDocumentos'
import TabCalculadora        from '../components/paciente/TabCalculadora'
import TabFAQ                from '../components/paciente/TabFAQ'
import TabGraficoFezes       from '../components/paciente/TabGraficoFezes'
import TabFraldas            from '../components/paciente/TabFraldas'
import TabIntroducaoAlimentar from '../components/paciente/TabIntroducaoAlimentar'
import TabMedicamentos       from '../components/paciente/TabMedicamentos'
import TabChoro              from '../components/paciente/TabChoro'
import TabTimeline           from '../components/paciente/TabTimeline'

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
      markPatientActivity(patient.id, 'Refeição registrada')
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

      {/* dica fixa — treinamento evacuatório */}
      <div className="card p-4 border-blue-200 bg-blue-50 space-y-3">
        <h3 className="font-semibold text-blue-800 text-sm">💡 Orientações para melhorar a evacuação</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">🪑</span>
            <span>Use banco ou escada para apoio dos pés (calcanhar apoiado) e tampa redutora de assento para o vaso sanitário.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⏰</span>
            <span>Estabeleça um horário fixo para evacuar — geralmente 20–30 minutos após o jantar, mesmo que a criança não sinalize vontade. Se sinalizar antes ou depois, encaminhe-a ao banheiro.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">📵</span>
            <span>Sem celular nem distrações. A criança precisa ter consciência do que está fazendo. Não espere mais de 5 minutos. Não brigue — incentive dizendo que na próxima vez dará certo.</span>
          </li>
        </ul>
      </div>

      {/* Orientação sobre compressas */}
      <div className="card overflow-hidden border-cyan-200">
        <div className="px-4 py-3 bg-cyan-50 border-b border-cyan-200">
          <h3 className="font-semibold text-cyan-800 text-sm">🧊 Quando usar compressa fria ou quente?</h3>
          <p className="text-xs text-cyan-600 mt-0.5">Orientação geral — sempre siga a recomendação do seu médico.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            {
              situacao: '💉 Após vacinação',
              tipo: 'fria',
              instrucao: 'Aplique compressa fria (pano úmido gelado ou bolsa de gelo envolto em tecido) no local da injeção por 10–15 minutos. Reduz dor e inchaço local. Evite calor nas primeiras 24h.',
            },
            {
              situacao: '🤕 Após trauma / pancada / hematoma',
              tipo: 'fria-depois-quente',
              instrucao: 'Primeiras 48h: compressa fria por 15–20 min, 3–4x ao dia — reduz inflamação e inchaço. Após 48–72h: compressa morna por 15–20 min — melhora circulação e acelera a reabsorção do hematoma.',
            },
            {
              situacao: '🌡️ Febre',
              tipo: 'fria',
              instrucao: 'Pano úmido morno (não gelado) na testa, axilas e virilhas. Nunca use gelo diretamente na pele. O objetivo é aliviar o desconforto, não "baixar" mecanicamente a temperatura.',
            },
            {
              situacao: '🦟 Picada de inseto / alergia local',
              tipo: 'fria',
              instrucao: 'Compressa fria por 10–15 minutos alivia coceira, ardor e inchaço. Evite coçar. Procure atendimento se aparecer inchaço progressivo, falta de ar ou reação generalizada.',
            },
            {
              situacao: '😣 Cólica / dor abdominal leve',
              tipo: 'quente',
              instrucao: 'Compressa morna ou bolsa de água quente (temperatura suportável, nunca quente demais) sobre o abdômen por 15–20 minutos. Ajuda a relaxar a musculatura. Não use em dores intensas, febre ou abdômen rígido.',
            },
            {
              situacao: '💪 Dor muscular após esforço',
              tipo: 'fria-depois-quente',
              instrucao: 'Imediatamente após: compressa fria (15–20 min) para reduzir inflamação. Após 48h ou em dores crônicas: compressa morna para relaxar a musculatura e melhorar a circulação.',
            },
            {
              situacao: '👁️ Olho inchado / trauma ocular leve',
              tipo: 'fria',
              instrucao: 'Compressa fria com pano limpo e úmido, suavemente sobre o olho fechado, por 10 minutos. Nunca aplique pressão. Se houver dor intensa, perda de visão ou ferimento, procure atendimento imediato.',
            },
          ].map(item => (
            <div key={item.situacao} className="px-4 py-3 flex items-start gap-3">
              <span className={`shrink-0 mt-0.5 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap
                ${item.tipo === 'fria'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : item.tipo === 'quente'
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-purple-100 text-purple-700 border border-purple-300'}`}>
                {item.tipo === 'fria' ? '🧊 Fria' : item.tipo === 'quente' ? '🔥 Quente' : '🔀 Fria→Quente'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-snug">{item.situacao}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.instrucao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    else { setModal(false); resetForm(); load(); markPatientActivity(patient.id, 'Fezes registradas') }
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

      {/* Orientações de treinamento evacuatório */}
      <div className="card p-4 bg-blue-50 border-blue-200 space-y-3">
        <h3 className="font-semibold text-blue-800 text-sm">💡 Orientações para melhorar a evacuação</h3>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">🪑</span>
            <span>Use banco ou escada para apoio dos pés (calcanhar apoiado) e tampa redutora de assento para o vaso sanitário.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⏰</span>
            <span>Estabeleça um horário fixo para evacuar — geralmente 20–30 minutos após o jantar, mesmo que a criança não sinalize vontade. Se sinalizar antes ou depois, encaminhe-a ao banheiro.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">📵</span>
            <span>Sem celular nem distrações. A criança precisa ter consciência do que está fazendo. Não espere mais de 5 minutos. Não brigue — incentive dizendo que na próxima vez dará certo.</span>
          </li>
        </ul>
      </div>

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
   SEM PACIENTE — solicitação de cadastro
═══════════════════════════════════════════ */
function SemPacienteScreen({ profile }) {
  const { session } = useAuth()
  const [status,  setStatus]  = useState(null)   // null=carregando | 'none' | 'pending' | 'approved' | 'rejected'
  const [reqData, setReqData] = useState(null)
  const [form,    setForm]    = useState({ child_name: '', child_birthdate: '', child_gender: '', notes: '' })
  const [sending, setSending] = useState(false)
  const [erro,    setErro]    = useState('')

  const loadRequest = async () => {
    const { data } = await supabase
      .from('patient_requests')
      .select('*')
      .eq('parent_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setReqData(data)
    setStatus(data ? data.status : 'none')
  }

  useEffect(() => { loadRequest() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!form.child_name.trim()) { setErro('Informe o nome da criança.'); return }
    setSending(true); setErro('')
    const { error } = await supabase.from('patient_requests').insert({
      parent_id:       session.user.id,
      parent_name:     profile?.full_name  || null,
      parent_email:    session.user.email,
      child_name:      form.child_name.trim(),
      child_birthdate: form.child_birthdate || null,
      child_gender:    form.child_gender    || null,
      notes:           form.notes.trim()    || null,
    })
    setSending(false)
    if (error) { setErro(error.message); return }
    await loadRequest()
  }

  /* ── Carregando ── */
  if (status === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-blue-400 animate-spin" />
      </div>
    )
  }

  /* ── Aguardando aprovação ── */
  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 p-8 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center">
          <Clock size={36} className="text-amber-400" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">Solicitação enviada!</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs leading-relaxed">
            Aguardando aprovação do Dr. Henrique Gomes para o paciente{' '}
            <strong>{reqData?.child_name}</strong>.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 max-w-xs text-left space-y-1">
          <p className="font-semibold">📋 Próximos passos</p>
          <p className="leading-relaxed">
            Assim que o médico aprovar, clique em <strong>Verificar aprovação</strong> ou recarregue
            a página para acessar o diário do seu filho(a).
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          🔄 Verificar aprovação
        </button>
      </div>
    )
  }

  /* ── Aprovado (paciente ainda não carregado na sessão) ── */
  if (status === 'approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 p-8 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">Solicitação aprovada!</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs leading-relaxed">
            O Dr. Henrique aprovou o cadastro de <strong>{reqData?.child_name}</strong>.
            Recarregue a página para acessar o diário.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          🔄 Abrir diário
        </button>
      </div>
    )
  }

  /* ── Rejeitado ── */
  if (status === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 p-8 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center">
          <XCircle size={36} className="text-red-400" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">Solicitação não aprovada</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Entre em contato com o consultório para mais informações.
          </p>
        </div>
        <a
          href="mailto:henriquepedbsb@gmail.com"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          ✉️ Contatar o médico
        </a>
      </div>
    )
  }

  /* ── Formulário de solicitação (status === 'none') ── */
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <div className="w-full max-w-sm">

        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Baby size={36} className="text-blue-400" />
          </div>
          <p className="font-bold text-slate-800 text-xl">Solicitar cadastro</p>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
            Preencha os dados do seu filho(a). O Dr. Henrique Gomes receberá uma notificação para aprovar.
          </p>
        </div>

        {/* Formulário */}
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Nome da criança *</label>
            <input
              className="input"
              placeholder="Nome completo"
              value={form.child_name}
              onChange={e => setForm(f => ({ ...f, child_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data de nascimento</label>
              <input
                type="date"
                className="input"
                max={new Date().toISOString().split('T')[0]}
                value={form.child_birthdate}
                onChange={e => setForm(f => ({ ...f, child_birthdate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Gênero</label>
              <select
                className="input"
                value={form.child_gender}
                onChange={e => setForm(f => ({ ...f, child_gender: e.target.value }))}
              >
                <option value="">—</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Alergias, condições relevantes…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {erro && (
            <p className="text-xs text-red-500 flex items-center gap-1">⚠️ {erro}</p>
          )}

          <button
            onClick={submit}
            disabled={sending || !form.child_name.trim()}
            className="btn-primary w-full"
          >
            {sending
              ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
              : <><Send size={15} /> Solicitar cadastro</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   ABA — CADASTRO (responsável)
═══════════════════════════════════════════ */
const BLOOD_TYPES_LIST = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

function TagInputCad({ tags, onChange }) {
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
        <span key={tag} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
          {tag}
          <button type="button" onClick={() => remove(tag)} className="hover:text-amber-600"><X size={11} /></button>
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

function TabCadastroPai({ patient, onUpdate }) {
  const navigate = useNavigate()
  /* Parse notes JSON */
  let nd = {}
  if (patient.notes) { try { nd = JSON.parse(patient.notes) } catch { nd = { notas: patient.notes } } }

  const allergiesInit = Array.isArray(patient.allergies)
    ? patient.allergies
    : patient.allergies ? patient.allergies.split(',').map(a => a.trim()) : []

  const [nascimento,    setNascimento]    = useState(null)
  const [editing,       setEditing]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [erro,          setErro]          = useState('')
  const [editAllergies, setEditAllergies] = useState(allergiesInit)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${patient.id}/photo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('patient-photos')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(path)
      await supabase.from('patients').update({ photo_url: publicUrl }).eq('id', patient.id)
      onUpdate()
    } catch (err) {
      console.error('Erro ao enviar foto:', err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    await supabase.from('patients').update({ photo_url: null }).eq('id', patient.id)
    onUpdate()
  }
  const [form, setForm] = useState({
    blood_type:      patient.blood_type || '',
    father_name:     nd.pai   || '',
    mother_name:     nd.mae   || '',
    notas:           nd.notas || '',
    birth_weight:    '',
    birth_height:    '',
    birth_head_circ: '',
  })

  const loadNascimento = () =>
    supabase.from('growth_records')
      .select('id, weight_kg, height_cm, head_circumference_cm')
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: true })
      .limit(1).maybeSingle()
      .then(({ data }) => setNascimento(data ?? null))

  useEffect(() => { loadNascimento() }, [patient.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Sincroniza ao abrir edição */
  const openEdit = () => {
    let n = {}
    if (patient.notes) { try { n = JSON.parse(patient.notes) } catch { n = { notas: patient.notes } } }
    const al = Array.isArray(patient.allergies)
      ? patient.allergies
      : patient.allergies ? patient.allergies.split(',').map(a => a.trim()) : []
    setForm({
      blood_type:      patient.blood_type || '',
      father_name:     n.pai   || '',
      mother_name:     n.mae   || '',
      notas:           n.notas || '',
      birth_weight:    nascimento?.weight_kg             != null ? String(nascimento.weight_kg)             : '',
      birth_height:    nascimento?.height_cm             != null ? String(nascimento.height_cm)             : '',
      birth_head_circ: nascimento?.head_circumference_cm != null ? String(nascimento.head_circumference_cm) : '',
    })
    setEditAllergies(al)
    setErro('')
    setEditing(true)
  }

  const save = async () => {
    setSaving(true); setErro('')
    try {
      /* Preserva campos existentes (ex: pending_parent_email removido) */
      let base = {}
      if (patient.notes) { try { base = JSON.parse(patient.notes) } catch { base = {} } }
      delete base.pending_parent_email
      if (form.father_name.trim()) base.pai   = form.father_name.trim(); else delete base.pai
      if (form.mother_name.trim()) base.mae   = form.mother_name.trim(); else delete base.mae
      if (form.notas.trim())       base.notas = form.notas.trim();       else delete base.notas

      const { error } = await supabase.from('patients').update({
        blood_type: form.blood_type || null,
        allergies:  editAllergies.length ? editAllergies : null,
        notes:      Object.keys(base).length ? JSON.stringify(base) : null,
      }).eq('id', patient.id)
      if (error) throw error

      /* Dados antropométricos de nascimento → growth_records */
      const hasBirth = form.birth_weight || form.birth_height || form.birth_head_circ
      if (hasBirth && patient.birthdate) {
        const payload = {
          patient_id:            patient.id,
          recorded_at:           patient.birthdate,
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
        await loadNascimento()
      }

      setEditing(false)
      onUpdate()   // re-fetcha o paciente no AuthContext
    } catch (err) {
      setErro(err.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const Row = ({ label, value }) => (
    <div className="flex gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="w-36 shrink-0 text-xs text-slate-400 font-medium uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 flex-1">{value || <span className="text-slate-300 italic">—</span>}</span>
    </div>
  )

  /* ── Modo exibição ── */
  if (!editing) return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Botão retornar */}
      <button
        onClick={() => navigate('/diario?tab=refeicoes')}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
      >
        ← Retornar ao menu principal
      </button>

      {/* Foto do paciente */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700 text-sm">Foto</h3>
          <button onClick={openEdit}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            <Pencil size={13} /> Completar cadastro
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
            {patient.photo_url ? (
              <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-2xl font-bold
                ${patient.gender === 'M' ? 'bg-blue-100 text-blue-700' : patient.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
                {patient.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
              <Camera size={13} />
              {uploadingPhoto ? 'Enviando…' : patient.photo_url ? 'Trocar foto' : 'Adicionar foto'}
              <input type="file" accept="image/*" className="hidden"
                onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            </label>
            {patient.photo_url && (
              <button onClick={handleRemovePhoto}
                className="text-xs text-red-500 hover:text-red-700 text-left transition-colors">
                Remover foto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dados fixos (somente leitura) */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Dados da Criança</h3>
        <Row label="Nome" value={patient.name} />
        <Row label="Data de nascimento"
          value={patient.birthdate
            ? format(new Date(patient.birthdate + 'T12:00:00'), 'dd/MM/yyyy')
            : null} />
        <Row label="Gênero"
          value={patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : null} />
        <Row label="Tipo sanguíneo"
          value={patient.blood_type
            ? <span className="bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded text-xs">{patient.blood_type}</span>
            : null} />
      </div>

      {/* Dados de nascimento */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Dados Antropométricos de Nascimento</h3>
        {nascimento ? (
          <>
            <Row label="Peso"
              value={nascimento.weight_kg != null ? `${nascimento.weight_kg.toFixed(3)} kg` : null} />
            <Row label="Estatura"
              value={nascimento.height_cm != null ? `${nascimento.height_cm.toFixed(1)} cm` : null} />
            <Row label="Perímetro cefálico"
              value={nascimento.head_circumference_cm != null ? `${nascimento.head_circumference_cm.toFixed(1)} cm` : null} />
          </>
        ) : (
          <p className="text-sm text-slate-400 italic">
            Não registrados — clique em <strong>Completar cadastro</strong> para adicionar
          </p>
        )}
      </div>

      {/* Alergias */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Alergias e Intolerâncias</h3>
        {allergiesInit.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allergiesInit.map(a => (
              <span key={a} className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">{a}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Nenhuma alergia registrada</p>
        )}
      </div>

      {/* Responsáveis e obs */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Informações Complementares</h3>
        </div>
        <Row label="Pai / Responsável" value={nd.pai} />
        <Row label="Mãe / Responsável" value={nd.mae} />
        {nd.notas && <Row label="Observações" value={nd.notas} />}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-700 leading-relaxed">
          ℹ️ Nome, data de nascimento e gênero são definidos pelo médico.
          Tipo sanguíneo, alergias e dados dos responsáveis podem ser completados por você.
        </p>
      </div>
    </div>
  )

  /* ── Modo edição ── */
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Completar Cadastro</h3>
          <button onClick={() => setEditing(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Tipo sanguíneo */}
        <div>
          <label className="label">Tipo sanguíneo</label>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD_TYPES_LIST.map(bt => (
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
          {form.blood_type && (
            <button type="button" onClick={() => setForm(f => ({ ...f, blood_type: '' }))}
              className="mt-1.5 text-xs text-slate-400 hover:text-slate-600 underline">
              Limpar seleção
            </button>
          )}
        </div>

        {/* Alergias */}
        <div>
          <label className="label">Alergias e intolerâncias</label>
          <TagInputCad tags={editAllergies} onChange={setEditAllergies} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['Leite de vaca', 'Glúten', 'Ovo', 'Soja', 'Amendoim', 'Frutos do mar'].map(a =>
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

        {/* Dados de nascimento */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dados de Nascimento</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Peso (kg)</label>
              <input type="number" step="0.001" min="0.3" max="8" className="input"
                placeholder="ex: 3.250"
                value={form.birth_weight}
                onChange={e => setForm(f => ({ ...f, birth_weight: e.target.value }))} />
            </div>
            <div>
              <label className="label">Estatura (cm)</label>
              <input type="number" step="0.1" min="20" max="70" className="input"
                placeholder="ex: 49.5"
                value={form.birth_height}
                onChange={e => setForm(f => ({ ...f, birth_height: e.target.value }))} />
            </div>
            <div>
              <label className="label">Perímetro Cefálico (cm)</label>
              <input type="number" step="0.1" min="20" max="45" className="input"
                placeholder="ex: 34.0"
                value={form.birth_head_circ}
                onChange={e => setForm(f => ({ ...f, birth_head_circ: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Responsáveis */}
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

        {/* Observações */}
        <div>
          <label className="label">Observações sobre a criança</label>
          <textarea className="input resize-none" rows={3}
            placeholder="Informações relevantes sobre o seu filho(a)…"
            value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
        </div>

        {erro && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <span className="shrink-0">⚠️</span> {erro}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving
              ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
              : <><Check size={15} /> Salvar alterações</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   PAINEL RESUMO — visão geral do diário
═══════════════════════════════════════════ */
const BRISTOL_RESUMO = ['','Constipação grave','Constipação leve','Normal','Ideal','Diarreia leve','Diarreia moderada','Diarreia grave']
const BRISTOL_COR    = ['','text-red-600','text-orange-500','text-yellow-600','text-green-600','text-yellow-600','text-orange-500','text-red-600']

function TabResumo({ patient, onNavigate }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pid = patient.id
    Promise.all([
      supabase.from('meals').select('eaten_at,description,meal_type').eq('patient_id', pid).order('eaten_at', { ascending: false }).limit(1),
      supabase.from('stool_records').select('recorded_at,bristol_type,color').eq('patient_id', pid).order('recorded_at', { ascending: false }).limit(1),
      supabase.from('symptom_records').select('recorded_at,symptoms,severity').eq('patient_id', pid).order('recorded_at', { ascending: false }).limit(1),
      supabase.from('sleep_records').select('sleep_start,duration_minutes,quality').eq('patient_id', pid).order('sleep_start', { ascending: false }).limit(1),
      supabase.from('breastfeeding_records').select('recorded_at,duration_minutes,side').eq('patient_id', pid).order('recorded_at', { ascending: false }).limit(1),
      supabase.from('medications').select('name,dose').eq('patient_id', pid).eq('is_active', true),
      supabase.from('food_introductions').select('food_name,introduced_at,reaction').eq('patient_id', pid).order('introduced_at', { ascending: false }).limit(1),
      supabase.from('crying_records').select('recorded_at,duration_min,intensity').eq('patient_id', pid).order('recorded_at', { ascending: false }).limit(3),
    ]).then(([meal, stool, symp, sleep, bf, meds, food, crying]) => {
      setData({
        meal:   meal.data?.[0]   ?? null,
        stool:  stool.data?.[0]  ?? null,
        symp:   symp.data?.[0]   ?? null,
        sleep:  sleep.data?.[0]  ?? null,
        bf:     bf.data?.[0]     ?? null,
        meds:   meds.data        ?? [],
        food:   food.data?.[0]   ?? null,
        crying: crying.data      ?? [],
      })
      setLoading(false)
    })
  }, [patient.id])

  const ago = (dateStr) => {
    if (!dateStr) return null
    try {
      return formatDistanceToNow(parseISO(dateStr), { locale: ptBR, addSuffix: true })
    } catch { return null }
  }

  if (loading) return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card h-28 animate-pulse bg-slate-100" />
      ))}
    </div>
  )

  const cards = [
    {
      tab:   'refeicoes',
      emoji: '🍽️',
      title: 'Refeições',
      cor:   'border-l-orange-400 bg-orange-50/40',
      iconCor: 'bg-orange-100 text-orange-600',
      content: data.meal ? (
        <>
          <p className="text-sm font-semibold text-slate-700 truncate">
            {data.meal.meal_type ?? 'Refeição'}
          </p>
          <p className="text-xs text-slate-500 truncate">{data.meal.description ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{ago(data.meal.eaten_at)}</p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum registro</p>,
    },
    {
      tab:   'fezes',
      emoji: '💧',
      title: 'Intestinal',
      cor:   'border-l-blue-400 bg-blue-50/40',
      iconCor: 'bg-blue-100 text-blue-600',
      content: data.stool ? (
        <>
          <p className={`text-sm font-semibold ${BRISTOL_COR[data.stool.bristol_type] ?? 'text-slate-700'}`}>
            Tipo {data.stool.bristol_type} · {BRISTOL_RESUMO[data.stool.bristol_type]}
          </p>
          <p className="text-xs text-slate-500 capitalize">{data.stool.color ?? ''}</p>
          <p className="text-xs text-slate-400 mt-1">{ago(data.stool.recorded_at)}</p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum registro</p>,
    },
    {
      tab:   'sintomas',
      emoji: '⚠️',
      title: 'Sintomas',
      cor:   'border-l-red-400 bg-red-50/40',
      iconCor: 'bg-red-100 text-red-600',
      content: data.symp ? (
        <>
          <p className="text-sm font-semibold text-slate-700 truncate">
            {Array.isArray(data.symp.symptoms) ? data.symp.symptoms.slice(0,2).join(', ') : '—'}
          </p>
          <p className="text-xs text-slate-500 capitalize">Severidade: {data.symp.severity ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{ago(data.symp.recorded_at)}</p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum registro</p>,
    },
    {
      tab:   'sono',
      emoji: '🌙',
      title: 'Sono',
      cor:   'border-l-indigo-400 bg-indigo-50/40',
      iconCor: 'bg-indigo-100 text-indigo-600',
      content: data.sleep ? (
        <>
          <p className="text-sm font-semibold text-slate-700">
            {data.sleep.duration_minutes ? `${Math.round(data.sleep.duration_minutes / 60 * 10) / 10}h` : '—'}
          </p>
          <p className="text-xs text-slate-500 capitalize">Qualidade: {data.sleep.quality ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{ago(data.sleep.sleep_start)}</p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum registro</p>,
    },
    {
      tab:   'amamentacao',
      emoji: '🤱',
      title: 'Amamentação',
      cor:   'border-l-pink-400 bg-pink-50/40',
      iconCor: 'bg-pink-100 text-pink-600',
      content: data.bf ? (
        <>
          <p className="text-sm font-semibold text-slate-700">
            {data.bf.duration_minutes ? `${data.bf.duration_minutes} min` : '—'}
          </p>
          <p className="text-xs text-slate-500 capitalize">{data.bf.side ?? ''}</p>
          <p className="text-xs text-slate-400 mt-1">{ago(data.bf.recorded_at)}</p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum registro</p>,
    },
    {
      tab:   'medicamentos',
      emoji: '💊',
      title: 'Medicamentos',
      cor:   'border-l-violet-400 bg-violet-50/40',
      iconCor: 'bg-violet-100 text-violet-600',
      content: data.meds.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-slate-700">
            {data.meds.length} ativo{data.meds.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {data.meds.slice(0, 2).map(m => m.name).join(', ')}
            {data.meds.length > 2 ? ` +${data.meds.length - 2}` : ''}
          </p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum ativo</p>,
    },
    {
      tab:   'introducao',
      emoji: '🌱',
      title: 'Introdução Alim.',
      cor:   'border-l-green-400 bg-green-50/40',
      iconCor: 'bg-green-100 text-green-600',
      content: data.food ? (
        <>
          <p className="text-sm font-semibold text-slate-700 truncate">{data.food.food_name}</p>
          <p className={`text-xs font-medium capitalize ${
            data.food.reaction === 'aceito' ? 'text-green-600'
            : data.food.reaction === 'alergia' ? 'text-red-600'
            : 'text-slate-500'}`}>
            {data.food.reaction ?? '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">{ago(data.food.introduced_at)}</p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum alimento</p>,
    },
    {
      tab:   'choro',
      emoji: '😢',
      title: 'Choro / Cólica',
      cor:   'border-l-amber-400 bg-amber-50/40',
      iconCor: 'bg-amber-100 text-amber-600',
      content: data.crying.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-slate-700">
            {data.crying.length} episódio{data.crying.length !== 1 ? 's' : ''} recentes
          </p>
          <p className="text-xs text-slate-500">
            Último: {data.crying[0].intensity ?? '—'} · {data.crying[0].duration_min ? `${data.crying[0].duration_min} min` : ''}
          </p>
          <p className="text-xs text-slate-400 mt-1">{ago(data.crying[0].recorded_at)}</p>
        </>
      ) : <p className="text-sm text-slate-400">Nenhum episódio</p>,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Saudação */}
      <div className="card p-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0">
        <p className="text-xs font-medium opacity-80 mb-1">Visão geral do diário</p>
        <p className="text-2xl font-bold leading-snug">{patient.name}</p>
        <p className="text-sm opacity-80 mt-0.5">{calcIdade(patient.birthdate)}</p>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <button key={card.tab} onClick={() => onNavigate(card.tab)}
            className={`card p-4 text-left border-l-4 ${card.cor} hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98]`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${card.iconCor}`}>
                {card.emoji}
              </span>
              <span className="text-sm font-semibold text-slate-700 leading-tight">{card.title}</span>
            </div>
            <div className="space-y-1 min-h-[3.5rem]">
              {card.content}
            </div>
          </button>
        ))}
      </div>

      {/* Atalho rápido */}
      <div className="card p-3 border-dashed border-slate-200 bg-slate-50/50 text-center">
        <p className="text-xs text-slate-400">Toque em qualquer card para abrir a seção completa</p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   WRAPPER — Hábito + Evolução Intestinal
═══════════════════════════════════════════ */
function TabIntestinal({ patient }) {
  const [subTab, setSubTab] = useState('habito')
  const SUBTABS = [
    { id: 'habito',   label: '📋 Hábito'    },
    { id: 'evolucao', label: '📊 Evolução'  },
    { id: 'fraldas',  label: '🍼 Fraldas'   },
  ]
  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {SUBTABS.map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
              ${subTab === s.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {s.label}
          </button>
        ))}
      </div>
      {subTab === 'habito'   && <TabFezes        patient={patient} />}
      {subTab === 'evolucao' && <TabGraficoFezes patient={patient} />}
      {subTab === 'fraldas'  && <TabFraldas      patient={patient} />}
    </div>
  )
}

/* ═══════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════ */
const TABS = [
  { id: 'cadastro',  label: 'Cadastro',  icon: ClipboardList   },
  { id: 'refeicoes', label: 'Refeições', icon: UtensilsCrossed },
  { id: 'fezes',     label: 'Intestinal', icon: Droplets       },
  { id: 'receitas',  label: 'Receitas',  icon: FileText        },
  { id: 'dicas',     label: 'Dicas',     icon: Lightbulb       },
  { id: 'marcos',    label: 'Marcos',    icon: Milestone       },
  { id: 'vacinas',   label: 'Vacinas',   icon: Syringe         },
]

export default function DiarioPage() {
  const { paciente, profile, refreshPaciente } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab    = searchParams.get('tab') || 'resumo'
  const setTab = (t) => setSearchParams({ tab: t }, { replace: true })



  /* Paciente não vinculado — formulário de solicitação */
  if (!paciente) {
    return <SemPacienteScreen profile={profile} />
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
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl shrink-0 overflow-hidden ${!paciente.photo_url ? avatarColor : ''}`}>
              {paciente.photo_url ? (
                <img src={paciente.photo_url} alt={paciente.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold">
                  {inicial}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">{paciente.name}</h1>
              <p className="text-sm text-slate-500">
                {calcIdade(paciente.birthdate)}
                {paciente.gender === 'M' ? ' · Masculino' : paciente.gender === 'F' ? ' · Feminino' : ''}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Conteúdo principal — largura total */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {tab === 'resumo'         && <TabResumo         patient={paciente} onNavigate={setTab} />}
          {tab === 'cadastro'       && <TabCadastroPai    patient={paciente} onUpdate={refreshPaciente} />}
          {tab === 'refeicoes'      && <TabRefeicoes      patient={paciente} />}
          {tab === 'fezes'          && <TabIntestinal      patient={paciente} />}
          {tab === 'receitas'       && <TabReceitas       patient={paciente} />}
          {tab === 'dicas'          && <TabDicas />}
          {tab === 'marcos'         && <TabMarcos         birthdate={paciente.birthdate} />}
          {tab === 'vacinas'        && <TabVacinas        birthdate={paciente.birthdate} patientId={paciente.id} />}
          {tab === 'sintomas'       && <TabSintomas       patient={paciente} />}
          {tab === 'sono'           && <TabSono           patient={paciente} />}
          {tab === 'amamentacao'    && <TabAmamentacao    patient={paciente} />}
          {tab === 'idadecorrigida' && <TabIdadeCorrigida patient={paciente} />}
          {tab === 'alertas'        && <TabAlertas />}
          {tab === 'documentos'     && <TabDocumentos     patient={paciente} />}
          {tab === 'calculadora'    && <TabCalculadora />}
          {tab === 'faq'            && <TabFAQ />}
          {tab === 'medicamentos'   && <TabMedicamentos        patient={paciente} />}
          {tab === 'introducao'     && <TabIntroducaoAlimentar patient={paciente} />}
          {tab === 'choro'          && <TabChoro               patient={paciente} />}
          {tab === 'graficosfezes'  && <TabIntestinal          patient={paciente} />}
          {tab === 'timeline'       && <TabTimeline            patient={paciente} />}
        </div>
      </div>
    </div>
  )
}
