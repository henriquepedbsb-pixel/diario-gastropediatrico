import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Lightbulb, Plus, Trash2, Loader2, X,
  Eye, EyeOff, Pencil, CheckCircle2, Clock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ─── Metadados de categoria ─── */
const CATEGORIES = [
  { value: 'nutrition', label: 'Nutrição',    emoji: '🥗' },
  { value: 'growth',    label: 'Crescimento', emoji: '📏' },
  { value: 'sleep',     label: 'Sono',        emoji: '😴' },
  { value: 'hygiene',   label: 'Higiene',     emoji: '🦷' },
  { value: 'vaccines',  label: 'Vacinas',     emoji: '💉' },
  { value: 'general',   label: 'Geral',       emoji: '💡' },
]

const catMeta = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

/* ─── Modal ─── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
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

/* ─── Chip de categoria ─── */
function CategoriaBadge({ cat }) {
  const meta = catMeta[cat] ?? { label: cat, emoji: '💡' }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
      {meta.emoji} {meta.label}
    </span>
  )
}

const FORM_EMPTY = {
  title:    '',
  content:  '',
  category: 'general',
  image_url: '',
  is_published: false,
}

export default function DicasPage() {
  const { session } = useAuth()

  const [tips,      setTips]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)   // false | 'new' | tip object (edit)
  const [form,      setForm]      = useState(FORM_EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [saveErro,  setSaveErro]  = useState('')
  const [filtro,    setFiltro]    = useState('all')   // 'all' | 'published' | 'draft'

  /* ─── Carrega dicas ─── */
  const load = () => {
    setLoading(true)
    supabase.from('tips')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTips(data ?? [])
        setLoading(false)
      })
  }

  useEffect(load, [])

  /* ─── Abre modal novo ─── */
  const abrirNovo = () => {
    setForm(FORM_EMPTY)
    setSaveErro('')
    setModal('new')
  }

  /* ─── Abre modal edição ─── */
  const abrirEdicao = (tip) => {
    setForm({
      title:        tip.title       ?? '',
      content:      tip.content     ?? '',
      category:     tip.category    ?? 'general',
      image_url:    tip.image_url   ?? '',
      is_published: tip.is_published ?? false,
    })
    setSaveErro('')
    setModal(tip)   // guarda o objeto inteiro para saber o id
  }

  /* ─── Salvar (criar ou editar) ─── */
  const salvar = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setSaveErro('Título e conteúdo são obrigatórios.')
      return
    }
    setSaving(true)
    setSaveErro('')

    const payload = {
      title:        form.title.trim(),
      content:      form.content.trim(),
      category:     form.category,
      image_url:    form.image_url.trim() || null,
      is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
      doctor_id:    session?.user?.id ?? null,
    }

    let error
    if (modal === 'new') {
      ;({ error } = await supabase.from('tips').insert(payload))
    } else {
      // edição — não sobrescreve published_at se já estava publicado
      const jaPublicado = modal.is_published && modal.published_at
      ;({ error } = await supabase.from('tips')
        .update({
          ...payload,
          published_at: form.is_published
            ? (jaPublicado ? modal.published_at : new Date().toISOString())
            : null,
        })
        .eq('id', modal.id))
    }

    setSaving(false)
    if (error) {
      setSaveErro(error.message)
    } else {
      setModal(false)
      load()
    }
  }

  /* ─── Toggle publicar/despublicar ─── */
  const togglePublish = async (tip) => {
    const novoStatus = !tip.is_published
    await supabase.from('tips').update({
      is_published: novoStatus,
      published_at: novoStatus ? new Date().toISOString() : null,
    }).eq('id', tip.id)
    setTips(prev => prev.map(t =>
      t.id === tip.id
        ? { ...t, is_published: novoStatus, published_at: novoStatus ? new Date().toISOString() : null }
        : t
    ))
  }

  /* ─── Excluir ─── */
  const excluir = async (id) => {
    if (!confirm('Excluir esta dica permanentemente?')) return
    await supabase.from('tips').delete().eq('id', id)
    setTips(prev => prev.filter(t => t.id !== id))
  }

  /* ─── Filtro ─── */
  const tipsVisiveis = tips.filter(t => {
    if (filtro === 'published') return  t.is_published
    if (filtro === 'draft')     return !t.is_published
    return true
  })

  const nPublicadas = tips.filter(t =>  t.is_published).length
  const nRascunhos  = tips.filter(t => !t.is_published).length

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dicas &amp; Orientações</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {nPublicadas} publicada{nPublicadas !== 1 ? 's' : ''} · {nRascunhos} rascunho{nRascunhos !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirNovo} className="btn-primary">
          <Plus size={15} /> Nova dica
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { id: 'all',       label: 'Todas'      },
          { id: 'published', label: '✅ Publicadas' },
          { id: 'draft',     label: '📝 Rascunhos' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
              ${filtro === f.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : tipsVisiveis.length === 0 ? (
        <div className="card p-14 text-center text-slate-400">
          <Lightbulb size={40} className="mx-auto mb-3 opacity-25" />
          <p className="font-medium">
            {filtro === 'all' ? 'Nenhuma dica cadastrada' : filtro === 'published' ? 'Nenhuma dica publicada' : 'Nenhum rascunho'}
          </p>
          <p className="text-xs mt-1">Clique em "Nova dica" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tipsVisiveis.map(tip => (
            <div key={tip.id} className={`card p-5 space-y-3 ${!tip.is_published ? 'opacity-70' : ''}`}>
              <div className="flex items-start gap-3">
                {/* status icon */}
                <div className={`mt-0.5 shrink-0 ${tip.is_published ? 'text-green-500' : 'text-slate-300'}`}>
                  {tip.is_published
                    ? <CheckCircle2 size={18} />
                    : <Clock size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CategoriaBadge cat={tip.category} />
                    {tip.is_published
                      ? <span className="text-xs text-green-600 font-medium">Publicada</span>
                      : <span className="text-xs text-slate-400 font-medium">Rascunho</span>}
                  </div>
                  <h3 className="font-semibold text-slate-800 leading-snug">{tip.title}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tip.content}</p>
                  {tip.published_at && (
                    <p className="text-xs text-slate-400 mt-1">
                      Publicada em {format(parseISO(tip.published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => abrirEdicao(tip)}
                    title="Editar"
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => togglePublish(tip)}
                    title={tip.is_published ? 'Despublicar' : 'Publicar'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      tip.is_published
                        ? 'text-green-500 hover:text-amber-500 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}>
                    {tip.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button onClick={() => excluir(tip.id)}
                    title="Excluir"
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {tip.image_url && (
                <img src={tip.image_url} alt={tip.title}
                  className="w-full h-40 object-cover rounded-lg border border-slate-100" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar / editar */}
      {modal && (
        <Modal
          title={modal === 'new' ? 'Nova Dica' : 'Editar Dica'}
          onClose={() => setModal(false)}
        >
          <div className="space-y-4">

            {/* Título */}
            <div>
              <label className="label">Título *</label>
              <input className="input" placeholder="Ex: Como introduzir alimentos sólidos"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Categoria */}
            <div>
              <label className="label">Categoria</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <label key={cat.value} className="relative cursor-pointer">
                    <input type="radio" value={cat.value} className="sr-only peer"
                      checked={form.category === cat.value}
                      onChange={() => setForm(f => ({ ...f, category: cat.value }))} />
                    <div className="text-center py-2 px-1 rounded-lg border-2 border-slate-200 text-xs font-medium text-slate-600
                      peer-checked:border-blue-400 peer-checked:bg-blue-50 peer-checked:text-blue-700
                      hover:border-slate-300 transition-all">
                      {cat.emoji} {cat.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Conteúdo */}
            <div>
              <label className="label">Conteúdo *</label>
              <textarea className="input resize-none" rows={6}
                placeholder="Escreva aqui a orientação clínica completa…"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>

            {/* URL da imagem */}
            <div>
              <label className="label">URL da imagem (opcional)</label>
              <input className="input" placeholder="https://exemplo.com/imagem.jpg"
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
              {form.image_url && (
                <img src={form.image_url} alt="preview"
                  className="mt-2 w-full h-32 object-cover rounded-lg border border-slate-200"
                  onError={e => { e.target.style.display = 'none' }} />
              )}
            </div>

            {/* Publicar imediatamente */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
              <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.is_published ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <input type="checkbox" className="sr-only"
                checked={form.is_published}
                onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {form.is_published ? 'Publicar agora' : 'Salvar como rascunho'}
                </p>
                <p className="text-xs text-slate-400">
                  {form.is_published
                    ? 'Ficará visível para todos os responsáveis'
                    : 'Só você verá — não aparece no app dos pais'}
                </p>
              </div>
            </label>

            {saveErro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                <span className="shrink-0">⚠️</span> {saveErro}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={salvar} disabled={saving} className="btn-primary flex-1">
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
                  : modal === 'new' ? 'Criar dica' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
