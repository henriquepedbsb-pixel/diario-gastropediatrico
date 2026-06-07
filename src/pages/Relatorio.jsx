import { useState, useEffect } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileText, Calendar, Users, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { RelatorioPDF } from '../components/pdf/RelatorioPDF'
import { useRelatorio } from '../hooks/useRelatorio'
import { supabase } from '../lib/supabase'

const toISO     = (d)   => d.toISOString().slice(0, 10)
const hoje      = ()    => toISO(new Date())
const diasAtras = (n)   => { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d) }
const fmtBR     = (iso) => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}` }
const slugify   = (s)   =>
  (s || 'paciente').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

const PRESETS = [
  { label: '7 dias',  dias: 7  },
  { label: '14 dias', dias: 14 },
  { label: '30 dias', dias: 30 },
  { label: '60 dias', dias: 60 },
]

function StatCard({ numero, label, cor }) {
  const temas = {
    sky:     'bg-sky-50     border-sky-200     text-sky-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    orange:  'bg-orange-50  border-orange-200  text-orange-700',
    violet:  'bg-violet-50  border-violet-200  text-violet-700',
  }
  return (
    <div className={`rounded-xl border p-4 text-center ${temas[cor]}`}>
      <div className="text-2xl font-bold">{numero}</div>
      <div className="text-xs mt-1 opacity-75 leading-tight">{label}</div>
    </div>
  )
}

function ModuloRow({ icone, label, contagem, simples }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm w-5 text-center">{icone}</span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      {simples ? (
        <span className="text-xs text-emerald-600 font-medium">✓</span>
      ) : (
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
          contagem > 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {contagem} reg.
        </span>
      )}
    </div>
  )
}

export default function Relatorio() {
  const [pacientes,   setPacientes]   = useState([])
  const [loadingPac,  setLoadingPac]  = useState(true)
  const [pacienteId,  setPacienteId]  = useState('')
  const [dataInicio,  setDataInicio]  = useState(diasAtras(14))
  const [dataFim,     setDataFim]     = useState(hoje())
  const [presetAtivo, setPresetAtivo] = useState(14)

  const { dados, loading, erro, buscarDados, limpar } = useRelatorio()

  useEffect(() => {
    async function fetchPacientes() {
      setLoadingPac(true)
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, birthdate')
        .order('name', { ascending: true })
      if (!error && data?.length) {
        setPacientes(data)
        if (data.length === 1) setPacienteId(data[0].id)
      }
      setLoadingPac(false)
    }
    fetchPacientes()
  }, [])

  function aplicarPreset(dias) {
    setDataInicio(diasAtras(dias))
    setDataFim(hoje())
    setPresetAtivo(dias)
    limpar()
  }

  function handleDataChange(campo, valor) {
    campo === 'inicio' ? setDataInicio(valor) : setDataFim(valor)
    setPresetAtivo(null)
  }

  function handlePacienteChange(id) {
    setPacienteId(id)
    limpar()
  }

  const nomeArquivo = dados
    ? `relatorio-${slugify(dados.paciente?.name)}-${dataInicio}-a-${dataFim}.pdf`
    : 'relatorio-preconsulta.pdf'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <FileText className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Relatório Pré-Consulta</h1>
            <p className="text-sm text-slate-500">Gere o PDF para a próxima consulta</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
              <Users className="w-4 h-4 text-sky-600" />
              Paciente
            </label>
            {loadingPac ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando pacientes...
              </div>
            ) : pacientes.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Nenhum paciente encontrado em <code className="font-mono text-xs">patients</code>.
                Se os pacientes estão em <code className="font-mono text-xs">pacientes</code>, avise para ajustar.
              </p>
            ) : (
              <select
                value={pacienteId}
                onChange={e => handlePacienteChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="">Selecione o paciente...</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Período
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map(p => (
                <button
                  key={p.dias}
                  type="button"
                  onClick={() => aplicarPreset(p.dias)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    presetAtivo === p.dias
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-sky-400 hover:text-sky-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">De</label>
                <input
                  type="date"
                  value={dataInicio}
                  max={dataFim}
                  onChange={e => handleDataChange('inicio', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Até</label>
                <input
                  type="date"
                  value={dataFim}
                  min={dataInicio}
                  max={hoje()}
                  onChange={e => handleDataChange('fim', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => buscarDados({ pacienteId, dataInicio, dataFim })}
            disabled={!pacienteId || !dataInicio || !dataFim || loading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Buscando dados...</>
              : <><FileText className="w-4 h-4" />Buscar Dados</>
            }
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Erro ao buscar dados</p>
              <p className="text-sm text-red-600 mt-0.5">{erro}</p>
            </div>
          </div>
        )}

        {dados && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard numero={dados.stats.totalRegistros}  label="Registros"        cor="sky" />
              <StatCard numero={dados.stats.diasComRegistro} label="Dias monitorados" cor="emerald" />
              <StatCard numero={dados.sintomas.length}       label="Sintomas"         cor="orange" />
              <StatCard numero={dados.sono.length}           label="Sono"             cor="violet" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">O que será incluído no PDF</h2>
              <ModuloRow icone="👤" label={dados.paciente.name}                         simples />
              <ModuloRow icone="📅" label={`${fmtBR(dataInicio)} a ${fmtBR(dataFim)}`} simples />
              <ModuloRow icone="🔴" label="Sintomas"    contagem={dados.sintomas.length} />
              <ModuloRow icone="🌙" label="Sono"        contagem={dados.sono.length} />
              <ModuloRow icone="🍼" label="Amamentação" contagem={dados.amamentacao.length} />
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 text-center">
              <p className="text-sm font-medium text-sky-800 mb-1">Relatório pronto para download</p>
              <p className="text-xs text-sky-600 mb-4">
                {dados.stats.totalRegistros} registro{dados.stats.totalRegistros !== 1 ? 's' : ''} em{' '}
                {dados.stats.diasComRegistro} dia{dados.stats.diasComRegistro !== 1 ? 's' : ''} monitorado{dados.stats.diasComRegistro !== 1 ? 's' : ''}
              </p>
              <PDFDownloadLink
                document={<RelatorioPDF dados={dados} />}
                fileName={nomeArquivo}
              >
                {({ loading: pdfLoading }) => (
                  <button
                    type="button"
                    disabled={pdfLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
                  >
                    {pdfLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando PDF...</>
                      : <><Download className="w-4 h-4" />Baixar PDF</>
                    }
                  </button>
                )}
              </PDFDownloadLink>
              <button
                type="button"
                onClick={limpar}
                className="ml-3 inline-flex items-center gap-1.5 px-4 py-3 text-slate-500 hover:text-slate-700 text-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Novo relatório
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
