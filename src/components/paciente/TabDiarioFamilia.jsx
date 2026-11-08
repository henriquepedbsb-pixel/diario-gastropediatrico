import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, CheckCircle2, Undo2, NotebookPen, MessageCircleQuestion, Info } from 'lucide-react'
import { useDiarioFamilia, TAGS_DIARIO } from '../../hooks/useDiarioFamilia'

/* ─────────────────────────────────────────────────────────────
   Visão do MÉDICO do "Meu Diário" da família.
   Mostra apenas anotações compartilhadas (RLS). O médico não
   edita o texto — só marca "conversado na consulta".
───────────────────────────────────────────────────────────── */

const fmtQuando = (iso) => {
  try { return format(parseISO(iso), "EEE, dd/MM/yyyy · HH:mm", { locale: ptBR }) } catch { return '—' }
}

export default function TabDiarioFamilia({ patient }) {
  const { entradas, fotos, loading, erro, fetchEntradas, marcarConversado } = useDiarioFamilia()
  const [filtro,   setFiltro]   = useState('pendentes')
  const [salvando, setSalvando] = useState(null)
  const [acaoErro, setAcaoErro] = useState('')

  useEffect(() => {
    if (patient?.id) fetchEntradas(patient.id)
  }, [patient?.id, fetchEntradas])

  const pendentes = useMemo(
    () => entradas.filter(e => e.ask_at_visit && !e.discussed_at),
    [entradas],
  )

  /* Sem dúvidas pendentes → abre direto em "Todas" */
  useEffect(() => {
    if (!loading && entradas.length > 0 && pendentes.length === 0) setFiltro('todas')
  }, [loading, entradas.length, pendentes.length])

  const visiveis = filtro === 'pendentes' ? pendentes : entradas

  const alternar = async (e) => {
    setSalvando(e.id); setAcaoErro('')
    try { await marcarConversado(e.id, !e.discussed_at) }
    catch (err) { setAcaoErro(err.message) }
    finally { setSalvando(null) }
  }

  return (
    <div className="space-y-4">

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 leading-relaxed">
          Anotações escritas pela família e compartilhadas com você. As marcadas como
          "só para mim" não aparecem aqui. A família vê o aviso de que este espaço
          não é lido em tempo real.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'pendentes', label: `❓ Dúvidas pendentes (${pendentes.length})` },
          { id: 'todas',     label: `Todas (${entradas.length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${filtro === f.id ? 'bg-marinho text-white border-marinho' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {(erro || acaoErro) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{erro || acaoErro}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          {filtro === 'pendentes'
            ? <MessageCircleQuestion size={36} className="mx-auto mb-3 opacity-30" />
            : <NotebookPen size={36} className="mx-auto mb-3 opacity-30" />}
          <p className="font-medium">
            {filtro === 'pendentes' ? 'Nenhuma dúvida pendente' : 'A família ainda não compartilhou anotações'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 items-start">
          {visiveis.map(e => {
            const tag     = TAGS_DIARIO[e.tag] ?? TAGS_DIARIO.observacao
            const fotoUrl = e.photo_path ? fotos[e.photo_path] : null
            return (
              <div key={e.id}
                className={`card p-4 space-y-2.5 ${e.ask_at_visit && !e.discussed_at ? 'border-l-4 border-l-amber-400' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`badge ${tag.cor}`}>{tag.emoji} {tag.label}</span>
                  <span className="text-xs text-slate-400 capitalize">{fmtQuando(e.entry_at)}</span>
                </div>

                <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">{e.content}</p>

                {e.photo_path && (
                  fotoUrl ? (
                    <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="block w-fit">
                      <img src={fotoUrl} alt="Foto enviada pela família"
                        className="h-28 w-28 object-cover rounded-xl border border-slate-200" />
                    </a>
                  ) : (
                    <div className="h-28 w-28 rounded-xl bg-slate-100 animate-pulse" />
                  )
                )}

                {(e.ask_at_visit || e.discussed_at) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {e.discussed_at ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                        <CheckCircle2 size={13} /> Conversado em {format(parseISO(e.discussed_at), 'dd/MM/yyyy')}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700">❓ Quer conversar na consulta</span>
                    )}
                    <button onClick={() => alternar(e)} disabled={salvando === e.id}
                      className={e.discussed_at
                        ? 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50'
                        : 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:scale-95 disabled:opacity-50'}>
                      {salvando === e.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : e.discussed_at ? <Undo2 size={13} /> : <CheckCircle2 size={13} />}
                      {e.discussed_at ? 'Desfazer' : 'Marcar como conversado'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
