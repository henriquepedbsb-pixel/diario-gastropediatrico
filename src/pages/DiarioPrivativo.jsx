import { useState, useEffect } from 'react'
import { Lock, Users, Loader2, Save } from 'lucide-react'
import { useDiarioPrivativo } from '../hooks/useDiarioPrivativo'
import { supabase } from '../lib/supabase'

const fmtBR = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function DiarioPrivativo() {
  const [pacientes,  setPacientes]  = useState([])
  const [loadingPac, setLoadingPac] = useState(true)
  const [pacienteId, setPacienteId] = useState('')
  const [texto,      setTexto]      = useState('')
  const [salvando,   setSalvando]   = useState(false)

  const { notas, loading, erro, fetchNotas, adicionarNota } = useDiarioPrivativo()

  useEffect(() => {
    async function fetchPacientes() {
      setLoadingPac(true)
      const { data, error } = await supabase.from('patients').select('id, name').order('name')
      if (!error && data?.length) setPacientes(data)
      setLoadingPac(false)
    }
    fetchPacientes()
  }, [])

  useEffect(() => {
    if (pacienteId) fetchNotas(pacienteId)
  }, [pacienteId, fetchNotas])

  async function handleSalvar() {
    setSalvando(true)
    try {
      await adicionarNota(pacienteId, texto)
      setTexto('')
      await fetchNotas(pacienteId)
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Lock className="w-5 h-5 text-violet-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Diário Privativo</h1>
            <p className="text-sm text-slate-500">Visível somente para você — a família nunca tem acesso</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
              <Users className="w-4 h-4 text-violet-600" /> Paciente
            </label>
            {loadingPac ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando pacientes...
              </div>
            ) : (
              <select value={pacienteId} onChange={e => setPacienteId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">Selecione o paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {pacienteId && (
            <div>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4}
                placeholder="Nova anotação privativa..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button onClick={handleSalvar} disabled={salvando || !texto.trim()}
                className="mt-2 w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Anotação
              </button>
            </div>
          )}
        </div>

        {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{erro}</div>}

        {pacienteId && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : notas.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-6">Nenhuma anotação ainda.</p>
            ) : (
              notas.map(n => (
                <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-2">{fmtBR(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}
