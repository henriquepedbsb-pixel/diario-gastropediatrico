import { useState, useEffect } from 'react'
import { FileSearch, Users, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import TabExamesMedico from '../components/paciente/TabExamesMedico'

/* Página global de exames: escolhe o paciente e reutiliza a mesma
   lista da aba "Exames" do paciente (TabExamesMedico). */
export default function Exames() {
  const [pacientes,  setPacientes]  = useState([])
  const [loadingPac, setLoadingPac] = useState(true)
  const [erroPac,    setErroPac]    = useState('')
  const [pacienteId, setPacienteId] = useState('')

  useEffect(() => {
    let ativo = true
    async function fetchPacientes() {
      setLoadingPac(true)
      const { data, error } = await supabase.from('patients').select('id, name').order('name')
      if (!ativo) return
      if (error) setErroPac('Não foi possível carregar os pacientes.')
      else if (data?.length) {
        setPacientes(data)
        if (data.length === 1) setPacienteId(data[0].id)
      }
      setLoadingPac(false)
    }
    fetchPacientes()
    return () => { ativo = false }
  }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileSearch size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="page-title">Exames</h1>
            <p className="text-sm text-slate-500">Transcrição assistida por IA · revisão obrigatória do médico</p>
          </div>
        </div>

        <div className="card p-4">
          <label className="label flex items-center gap-1.5" htmlFor="exames-paciente">
            <Users size={15} className="text-blue-600" /> Paciente
          </label>
          {loadingPac ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
              <Loader2 size={16} className="animate-spin" /> Carregando pacientes…
            </div>
          ) : erroPac ? (
            <p className="text-sm text-red-600">{erroPac}</p>
          ) : (
            <select id="exames-paciente" value={pacienteId} onChange={e => setPacienteId(e.target.value)} className="input">
              <option value="">Selecione o paciente…</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {pacienteId && <TabExamesMedico patient={{ id: pacienteId }} />}
      </div>
    </div>
  )
}
