import { useState, useEffect } from 'react'
import { Star, Plus, Trash2, Eye, EyeOff, MessageSquareQuote, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            size={20}
            className={n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  )
}

const EMPTY = { autor: '', texto: '', nota: 5, data_avaliacao: '' }

export default function DepoimentosPage() {
  const [lista,    setLista]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [erro,     setErro]     = useState(null)
  const [showForm, setShowForm] = useState(false)

  const carregar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('depoimentos')
      .select('*')
      .order('created_at', { ascending: false })
    setLista(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const salvar = async (e) => {
    e.preventDefault()
    if (!form.autor.trim() || !form.texto.trim()) return
    setSaving(true)
    setErro(null)
    const { error } = await supabase.from('depoimentos').insert({
      autor:          form.autor.trim(),
      texto:          form.texto.trim(),
      nota:           form.nota,
      data_avaliacao: form.data_avaliacao || null,
      visivel:        true,
    })
    setSaving(false)
    if (error) { setErro(error.message); return }
    setForm(EMPTY)
    setShowForm(false)
    carregar()
  }

  const toggleVisivel = async (dep) => {
    await supabase.from('depoimentos').update({ visivel: !dep.visivel }).eq('id', dep.id)
    carregar()
  }

  const excluir = async (id) => {
    if (!confirm('Excluir este depoimento?')) return
    await supabase.from('depoimentos').delete().eq('id', id)
    carregar()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">

      {/* Avaliações Doctoralia */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <MessageSquareQuote size={16} className="text-yellow-500" />
          <h2 className="font-semibold text-slate-700 text-sm">Avaliações na Doctoralia</h2>
        </div>
        <div className="p-4">
          <img
            src="/depoimentos.png"
            alt="Avaliações na Doctoralia"
            className="w-full rounded-lg border border-slate-100 shadow-sm"
          />
        </div>
        <div className="px-5 pb-5">
          <a
            href="https://www.doctoralia.com.br/adicionar-opiniao/henrique-gomes-3#/opiniao"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors text-sm font-medium border border-teal-100"
          >
            <Star size={14} className="fill-teal-500 text-teal-500" />
            Link para nova avaliação na Doctoralia
            <ExternalLink size={13} className="opacity-60" />
          </a>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center">
            <MessageSquareQuote size={18} className="text-yellow-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Depoimentos</h1>
            <p className="text-xs text-slate-500">Avaliações exibidas no currículo</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={salvar} className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Novo depoimento</h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome do paciente / responsável *</label>
            <input
              className="input w-full"
              placeholder="Ex: Maria S."
              value={form.autor}
              onChange={e => setForm(f => ({ ...f, autor: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Texto da avaliação *</label>
            <textarea
              className="input w-full min-h-[100px] resize-none"
              placeholder="Cole aqui o texto copiado da Doctoralia…"
              value={form.texto}
              onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
            />
          </div>

          <div className="flex gap-6 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nota</label>
              <StarRating value={form.nota} onChange={n => setForm(f => ({ ...f, nota: n }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data da avaliação</label>
              <input
                type="date"
                className="input"
                value={form.data_avaliacao}
                onChange={e => setForm(f => ({ ...f, data_avaliacao: e.target.value }))}
              />
            </div>
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquareQuote size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum depoimento ainda.</p>
          <p className="text-xs text-slate-400 mt-1">Clique em "Adicionar" para incluir avaliações da Doctoralia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(dep => (
            <div key={dep.id}
              className={`card p-4 flex gap-4 ${!dep.visivel ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{dep.autor}</span>
                  {dep.data_avaliacao && (
                    <span className="text-xs text-slate-400">
                      {new Date(dep.data_avaliacao).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={13}
                      className={n <= dep.nota ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'} />
                  ))}
                </div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{dep.texto}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => toggleVisivel(dep)}
                  title={dep.visivel ? 'Ocultar do currículo' : 'Exibir no currículo'}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                  {dep.visivel ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => excluir(dep.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
