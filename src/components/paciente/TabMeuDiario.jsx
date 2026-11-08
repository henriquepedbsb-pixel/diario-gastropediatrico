import { useState, useEffect, useRef, useMemo } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Trash2, Loader2, X, Pencil, Lock, Users, BellRing, Check,
  CheckCircle2, ImagePlus, Siren, NotebookPen, MessageCircleQuestion,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useDiarioFamilia, TAGS_DIARIO, hojeLocal, lembreteAtivo } from '../../hooks/useDiarioFamilia'

/* ─── Modal (padrão do projeto) ─── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} aria-label="Fechar"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/* ─── Aviso fixo: não é canal de urgência ─── */
export function AvisoNaoUrgencia() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <Siren size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 leading-relaxed">
        <strong>Este diário não é lido em tempo real.</strong> Em caso de urgência,
        procure o pronto-socorro mais próximo ou ligue <strong>192 (SAMU)</strong>.
      </p>
    </div>
  )
}

const fmtQuando = (iso) => {
  try { return format(parseISO(iso), "EEE, dd/MM · HH:mm", { locale: ptBR }) } catch { return '—' }
}
const fmtDia = (ymd) => {
  try { return format(parseISO(ymd), 'dd/MM/yyyy') } catch { return ymd ?? '—' }
}

const FILTROS = [
  { id: 'todas',    label: 'Todas'             },
  { id: 'duvidas',  label: '❓ Para a consulta' },
  { id: 'privadas', label: '🔒 Só minhas'       },
]

const formVazio = () => ({
  content:      '',
  tag:          'observacao',
  ask_at_visit: false,
  visibility:   'shared',
  entry_at:     format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  remind_on:    '',
})

export default function TabMeuDiario({ patient }) {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null

  const {
    entradas, fotos, loading, erro,
    fetchEntradas, salvarEntrada, apagarEntrada, marcarLembrete,
  } = useDiarioFamilia()

  const [filtro,     setFiltro]     = useState('todas')
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [form,       setForm]       = useState(formVazio())
  const [fotoNova,   setFotoNova]   = useState(null)
  const [preview,    setPreview]    = useState(null)
  const [tirarFoto,  setTirarFoto]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveErro,   setSaveErro]   = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [acaoErro,   setAcaoErro]   = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (patient?.id) fetchEntradas(patient.id)
  }, [patient?.id, fetchEntradas])

  /* Libera a pré-visualização local da foto */
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const lembretes = useMemo(() => entradas.filter(lembreteAtivo), [entradas])
  const perguntas = useMemo(
    () => entradas.filter(e => e.ask_at_visit && e.visibility === 'shared' && !e.discussed_at),
    [entradas],
  )
  const visiveis = useMemo(() => {
    if (filtro === 'duvidas')  return perguntas
    if (filtro === 'privadas') return entradas.filter(e => e.visibility === 'private')
    return entradas
  }, [filtro, entradas, perguntas])

  /* ─── Abrir modal ─── */
  const limparFoto = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null); setFotoNova(null); setTirarFoto(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const abrirNova = () => {
    setEditando(null); setForm(formVazio()); limparFoto(); setSaveErro(''); setModal(true)
  }

  const abrirEdicao = (e) => {
    setEditando(e)
    setForm({
      content:      e.content ?? '',
      tag:          e.tag ?? 'observacao',
      ask_at_visit: !!e.ask_at_visit,
      visibility:   e.visibility ?? 'shared',
      entry_at:     e.entry_at ? format(parseISO(e.entry_at), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      remind_on:    e.remind_on ?? '',
    })
    limparFoto(); setSaveErro(''); setModal(true)
  }

  const fecharModal = () => { if (!saving) { setModal(false); limparFoto() } }

  /* ─── Campos com regras ─── */
  const escolherTag = (tag) => setForm(f => ({
    ...f, tag,
    // Dúvida já vem marcada para a consulta (e compartilhada)
    ...(tag === 'duvida' ? { ask_at_visit: true, visibility: 'shared' } : {}),
  }))

  const escolherVisibilidade = (visibility) => setForm(f => ({
    ...f, visibility,
    ask_at_visit: visibility === 'private' ? false : f.ask_at_visit,
  }))

  const handleFile = (ev) => {
    const file = ev.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setSaveErro('Envie uma foto (JPG ou PNG).'); return }
    if (preview) URL.revokeObjectURL(preview)
    setFotoNova(file); setPreview(URL.createObjectURL(file)); setTirarFoto(false); setSaveErro('')
  }

  const save = async () => {
    setSaving(true); setSaveErro('')
    try {
      await salvarEntrada(patient.id, form, {
        fotoNova,
        removerFotoAtual: tirarFoto,
        original: editando,
      })
      setModal(false); limparFoto()
      await fetchEntradas(patient.id)
    } catch (err) {
      setSaveErro(err.message)
    } finally {
      setSaving(false)
    }
  }

  const del = async (e) => {
    setAcaoErro('')
    try { await apagarEntrada(e); setConfirmDel(null) }
    catch (err) { setAcaoErro(err.message) }
  }

  const concluirLembrete = async (id, feito) => {
    setAcaoErro('')
    try { await marcarLembrete(id, feito) } catch (err) { setAcaoErro(err.message) }
  }

  const fotoAtualUrl = editando?.photo_path && !tirarFoto ? fotos[editando.photo_path] : null
  const caracteres   = form.content.length

  return (
    <div className="space-y-4">

      <AvisoNaoUrgencia />

      {/* ─── Lembretes de hoje ─── */}
      {lembretes.length > 0 && (
        <div className="card p-4 border-l-4 border-l-amber-400 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <BellRing size={14} className="text-amber-500" /> Seus lembretes
          </p>
          {lembretes.map(e => (
            <div key={e.id} className="flex items-start gap-3">
              <p className="flex-1 min-w-0 text-sm text-slate-700 break-words line-clamp-2">{e.content}</p>
              <button onClick={() => concluirLembrete(e.id, true)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:scale-95">
                <Check size={13} /> Feito
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Para a próxima consulta ─── */}
      {perguntas.length > 0 && (
        <button onClick={() => setFiltro('duvidas')}
          className="w-full card p-4 text-left flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.99]">
          <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <MessageCircleQuestion size={18} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-slate-800">
              {perguntas.length} {perguntas.length === 1 ? 'dúvida guardada' : 'dúvidas guardadas'} para a próxima consulta
            </span>
            <span className="block text-xs text-slate-500">O médico vê esta lista antes de te atender</span>
          </span>
        </button>
      )}

      {/* ─── Cabeçalho + filtros ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                ${filtro === f.id ? 'bg-marinho text-white border-marinho' : 'bg-white text-slate-600 border-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={abrirNova} className="btn-primary shrink-0">
          <Plus size={15} /> Nova anotação
        </button>
      </div>

      {(erro || acaoErro) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{erro || acaoErro}</div>
      )}

      {/* ─── Lista ─── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <NotebookPen size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {filtro === 'todas' ? 'Seu diário ainda está em branco' : 'Nada por aqui'}
          </p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            {filtro === 'todas'
              ? 'Escreva o que quiser: algo que você notou, uma conquista ou uma dúvida para levar à consulta.'
              : 'Toque em "Todas" para ver o restante do diário.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiveis.map(e => {
            const tag      = TAGS_DIARIO[e.tag] ?? TAGS_DIARIO.observacao
            const minha    = !!userId && e.created_by === userId
            const fotoUrl  = e.photo_path ? fotos[e.photo_path] : null
            const lembrete = e.remind_on
            return (
              <div key={e.id} className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className={`badge ${tag.cor}`}>{tag.emoji} {tag.label}</span>
                    {e.visibility === 'private' ? (
                      <span className="badge bg-slate-100 text-slate-500"><Lock size={11} className="mr-1" /> Só para mim</span>
                    ) : (
                      <span className="badge bg-blue-50 text-blue-700"><Users size={11} className="mr-1" /> Com o médico</span>
                    )}
                  </div>
                  {minha && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => abrirEdicao(e)} aria-label="Editar anotação"
                        className="p-1.5 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                        <Pencil size={14} />
                      </button>
                      {confirmDel === e.id ? (
                        <>
                          <button onClick={() => del(e)}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white active:scale-95">
                            Apagar
                          </button>
                          <button onClick={() => setConfirmDel(null)}
                            className="px-2 py-1 rounded-full text-xs font-semibold text-slate-500 hover:bg-slate-100">
                            Não
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDel(e.id)} aria-label="Apagar anotação"
                          className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">{e.content}</p>

                {e.photo_path && (
                  fotoUrl ? (
                    <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="block w-fit">
                      <img src={fotoUrl} alt="Foto da anotação"
                        className="h-28 w-28 object-cover rounded-xl border border-slate-200" />
                    </a>
                  ) : (
                    <div className="h-28 w-28 rounded-xl bg-slate-100 animate-pulse" />
                  )
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
                  <span className="capitalize">{fmtQuando(e.entry_at)}</span>

                  {e.ask_at_visit && !e.discussed_at && (
                    <span className="text-amber-700 font-semibold">❓ Para a próxima consulta</span>
                  )}
                  {e.discussed_at && (
                    <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                      <CheckCircle2 size={12} /> Conversado na consulta em {format(parseISO(e.discussed_at), 'dd/MM')}
                    </span>
                  )}

                  {lembrete && (
                    e.reminder_done ? (
                      <button onClick={() => concluirLembrete(e.id, false)} disabled={!minha}
                        title={minha ? 'Reabrir lembrete' : undefined}
                        className="inline-flex items-center gap-1 text-slate-400">
                        <Check size={12} /> Lembrete de {fmtDia(lembrete)} concluído
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1 font-semibold ${lembrete <= hojeLocal() ? 'text-amber-600' : 'text-slate-500'}`}>
                        <BellRing size={12} /> Lembrete {fmtDia(lembrete)}
                      </span>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modal nova / editar ─── */}
      {modal && (
        <Modal title={editando ? 'Editar anotação' : 'Nova anotação'} onClose={fecharModal}>
          <div className="space-y-4">

            <div>
              <label className="label" htmlFor="diario-texto">O que você quer anotar?</label>
              <textarea id="diario-texto" rows={6} autoFocus maxLength={5000}
                className="input resize-y min-h-[8rem]"
                placeholder="Ex.: Hoje ele mamou melhor depois do banho. Quero perguntar se posso oferecer água."
                value={form.content}
                onChange={ev => setForm(f => ({ ...f, content: ev.target.value }))} />
              <p className={`text-[11px] text-right mt-1 ${caracteres > 4800 ? 'text-amber-600' : 'text-slate-400'}`}>
                {caracteres}/5000
              </p>
            </div>

            <div>
              <p className="label">Tipo</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TAGS_DIARIO).map(([id, t]) => (
                  <button key={id} type="button" onClick={() => escolherTag(id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all active:scale-95
                      ${form.tag === id ? 'border-marinho bg-blue-50 text-noite' : 'border-slate-200 text-slate-600 bg-white'}`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label">Quem pode ver</p>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
                <button type="button" onClick={() => escolherVisibilidade('shared')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all
                    ${form.visibility === 'shared' ? 'bg-white text-noite shadow-sm' : 'text-slate-500'}`}>
                  <Users size={13} /> Eu e o médico
                </button>
                <button type="button" onClick={() => escolherVisibilidade('private')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all
                    ${form.visibility === 'private' ? 'bg-white text-noite shadow-sm' : 'text-slate-500'}`}>
                  <Lock size={13} /> Só eu
                </button>
              </div>
              {form.visibility === 'private' && (
                <p className="text-xs text-slate-500 mt-1.5">
                  O médico não vê esta anotação e ela não entra no relatório da consulta.
                </p>
              )}
            </div>

            <label className={`flex items-start gap-3 p-3 rounded-xl border transition-colors
              ${form.visibility === 'private' ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-amber-200 bg-amber-50/60 cursor-pointer'}`}>
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-amber-500"
                disabled={form.visibility === 'private'}
                checked={form.ask_at_visit}
                onChange={ev => setForm(f => ({ ...f, ask_at_visit: ev.target.checked }))} />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Quero perguntar isso na próxima consulta</span>
                <span className="block text-xs text-slate-500">
                  {form.visibility === 'private'
                    ? 'Para guardar como dúvida, escolha "Eu e o médico".'
                    : 'Fica numa lista que o médico vê antes da consulta.'}
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="diario-quando">Quando aconteceu</label>
                <input id="diario-quando" type="datetime-local" className="input"
                  value={form.entry_at}
                  max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  onChange={ev => setForm(f => ({ ...f, entry_at: ev.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="diario-lembrete">Me lembrar em (opcional)</label>
                <input id="diario-lembrete" type="date" className="input"
                  value={form.remind_on}
                  min={hojeLocal()}
                  onChange={ev => setForm(f => ({ ...f, remind_on: ev.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 -mt-1">
              {[
                { label: 'Amanhã',      dias: 1 },
                { label: 'Em 3 dias',   dias: 3 },
                { label: 'Em 1 semana', dias: 7 },
              ].map(op => (
                <button key={op.dias} type="button"
                  onClick={() => setForm(f => ({ ...f, remind_on: format(addDays(new Date(), op.dias), 'yyyy-MM-dd') }))}
                  className="px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 active:scale-95">
                  🔔 {op.label}
                </button>
              ))}
              {form.remind_on && (
                <button type="button" onClick={() => setForm(f => ({ ...f, remind_on: '' }))}
                  className="px-3 py-1 rounded-full text-xs font-semibold text-slate-400 hover:text-slate-600">
                  Sem lembrete
                </button>
              )}
            </div>

            <div>
              <p className="label">Foto (opcional)</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              {preview || fotoAtualUrl ? (
                <div className="flex items-center gap-3">
                  <img src={preview || fotoAtualUrl} alt="Pré-visualização"
                    className="h-20 w-20 object-cover rounded-xl border border-slate-200" />
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="text-xs font-semibold text-blue-600 hover:underline text-left">Trocar foto</button>
                    <button type="button"
                      onClick={() => { limparFoto(); if (editando?.photo_path) setTirarFoto(true) }}
                      className="text-xs font-semibold text-red-500 hover:underline text-left">Remover foto</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:bg-slate-50">
                  <ImagePlus size={17} /> Tirar foto ou escolher da galeria
                </button>
              )}
            </div>

            {saveErro && <p className="text-sm text-red-500">{saveErro}</p>}

            <button onClick={save} disabled={saving || !form.content.trim()} className="btn-primary w-full py-3">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar anotação'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
