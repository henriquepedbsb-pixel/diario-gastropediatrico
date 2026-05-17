import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, UserPlus, Baby, Users,
  FileText, Lightbulb, TrendingUp,
  ChevronRight, Activity, Clock, Bell, CheckCircle, XCircle, Loader2,
} from 'lucide-react'
import { differenceInMonths, differenceInYears, parseISO, format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'

function saudacao() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}
import { useAuth } from '../contexts/AuthContext'

/* ── Calcula idade legível ── */
function calcAge(birthdate) {
  if (!birthdate) return '—'
  const birth  = parseISO(birthdate)
  const years  = differenceInYears(new Date(), birth)
  const months = differenceInMonths(new Date(), birth)
  if (months < 1)  return '< 1 mês'
  if (months < 24) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}

/* ── Cor do avatar por gênero ── */
const avatarStyle = {
  M: 'bg-blue-100 text-blue-700',
  F: 'bg-pink-100 text-pink-700',
  default: 'bg-slate-100 text-slate-600',
}

/* ── Skeleton ── */
function Skeleton({ className = 'h-20' }) {
  return <div className={`card animate-pulse bg-slate-100 ${className}`} />
}

/* ── Cartão KPI ── */
function KpiCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`card p-5 text-left flex items-start gap-4 transition-all
        ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </button>
  )
}

/* ── Card de paciente ── */
function PatientCard({ patient, onClick }) {
  const cor      = avatarStyle[patient.gender] ?? avatarStyle.default
  const initials = patient.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const allergies = Array.isArray(patient.allergies)
    ? patient.allergies
    : patient.allergies ? patient.allergies.split(',').map(a => a.trim()) : []

  const hasNewActivity = patient.last_activity_at && (
    !patient.last_doctor_seen_at ||
    new Date(patient.last_activity_at) > new Date(patient.last_doctor_seen_at)
  )
  const activityAgo = patient.last_activity_at
    ? formatDistanceToNow(new Date(patient.last_activity_at), { locale: ptBR, addSuffix: true })
    : null

  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-[0.98] ${
        hasNewActivity ? 'ring-2 ring-orange-300 ring-offset-1' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${cor}`}>
            {initials}
          </div>
          {hasNewActivity && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-400 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{patient.name}</p>
          <p className="text-sm text-slate-500">
            {calcAge(patient.birthdate)}
            {patient.gender === 'M' ? ' · Masculino' : patient.gender === 'F' ? ' · Feminino' : ''}
          </p>
          {hasNewActivity ? (
            <p className="text-xs text-orange-500 font-medium mt-0.5">
              🔔 Nova atividade {activityAgo}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {patient.blood_type && (
                <span className="text-xs bg-red-50 text-red-600 font-semibold px-1.5 py-0.5 rounded">
                  {patient.blood_type}
                </span>
              )}
              {allergies.slice(0, 2).map(a => (
                <span key={a} className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                  {a}
                </span>
              ))}
              {allergies.length > 2 && (
                <span className="text-xs text-slate-400">+{allergies.length - 2}</span>
              )}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-slate-300 shrink-0" />
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════ */
export default function HomePage() {
  const navigate  = useNavigate()
  const { profile } = useAuth()

  const [patients,     setPatients]     = useState([])
  const [prescCount,   setPrescCount]   = useState(null)
  const [tipsCount,    setTipsCount]    = useState(null)
  const [recentTips,   setRecentTips]   = useState([])
  const [pendingReqs,  setPendingReqs]  = useState([])
  const [approvingId,  setApprovingId]  = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const [
        { data: pats },
        { count: presc },
        { count: tips },
        { data: latestTips },
        { data: reqs },
      ] = await Promise.all([
        supabase.from('patients').select('*').order('name'),
        supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tips').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('tips')
          .select('id, title, category, published_at')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(3),
        supabase.from('patient_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ])

      // Pacientes com nova atividade sobem para o topo
      const sorted = (pats ?? []).sort((a, b) => {
        const aNew = a.last_activity_at && (!a.last_doctor_seen_at || new Date(a.last_activity_at) > new Date(a.last_doctor_seen_at))
        const bNew = b.last_activity_at && (!b.last_doctor_seen_at || new Date(b.last_activity_at) > new Date(b.last_doctor_seen_at))
        if (aNew && !bNew) return -1
        if (!aNew && bNew) return 1
        return (a.name ?? '').localeCompare(b.name ?? '')
      })
      setPatients(sorted)
      setPrescCount(presc ?? 0)
      setTipsCount(tips ?? 0)
      setRecentTips(latestTips ?? [])
      setPendingReqs(reqs ?? [])
      setLoading(false)
    }

    fetchAll()
  }, [])

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  /* ── Aprovar solicitação de cadastro ── */
  const approveRequest = async (req) => {
    setApprovingId(req.id)
    try {
      // 1. Cria o paciente vinculado ao responsável
      const { data: patient, error: patErr } = await supabase
        .from('patients')
        .insert({
          name:        req.child_name,
          birthdate:   req.child_birthdate  || null,
          gender:      req.child_gender     || null,
          notes:       req.notes            || null,
          parent_id:   req.parent_id,
          parent_email: null,
        })
        .select()
        .single()
      if (patErr) throw patErr

      // 2. Marca solicitação como aprovada
      await supabase
        .from('patient_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', req.id)

      // 3. Atualiza estado local
      setPendingReqs(prev => prev.filter(r => r.id !== req.id))
      setPatients(prev => [...prev, patient].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      console.error('Erro ao aprovar solicitação:', err)
      alert('Erro ao aprovar: ' + (err.message ?? err))
    } finally {
      setApprovingId(null)
    }
  }

  /* ── Rejeitar solicitação ── */
  const rejectRequest = async (req) => {
    await supabase
      .from('patient_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', req.id)
    setPendingReqs(prev => prev.filter(r => r.id !== req.id))
  }

  /* ── Dicas: metadados de categoria ── */
  const CAT = {
    nutrition: { emoji: '🥗', label: 'Nutrição'    },
    growth:    { emoji: '📏', label: 'Crescimento' },
    sleep:     { emoji: '😴', label: 'Sono'        },
    hygiene:   { emoji: '🦷', label: 'Higiene'     },
    vaccines:  { emoji: '💉', label: 'Vacinas'     },
    general:   { emoji: '💡', label: 'Geral'       },
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* ── Boas-vindas ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">
            {saudacao()}{profile?.full_name ? `, ${profile.full_name.startsWith('Dr') ? profile.full_name.split(' ').slice(0, 2).join(' ') : `Dr. ${profile.full_name.split(' ')[0]}`}` : ''} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => navigate('/dashboard/pacientes/novo')} className="btn-primary">
          <UserPlus size={16} /> Novo Paciente
        </button>
      </div>

      {/* ── Solicitações de cadastro pendentes ── */}
      {!loading && pendingReqs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Bell size={15} className="text-amber-600" />
            </div>
            <h2 className="section-header text-amber-700 flex items-center gap-2">
              Solicitações de cadastro
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingReqs.length}
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {pendingReqs.map(req => (
              <div key={req.id} className="card p-4 border-l-4 border-amber-400 bg-amber-50/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{req.child_name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {req.child_birthdate
                        ? `Nasc.: ${format(new Date(req.child_birthdate + 'T12:00:00'), 'dd/MM/yyyy')} · `
                        : ''}
                      {req.child_gender === 'M' ? 'Masculino' : req.child_gender === 'F' ? 'Feminino' : 'Gênero não informado'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Responsável: <span className="font-medium">{req.parent_name || req.parent_email || '—'}</span>
                      {req.parent_email && req.parent_name ? ` · ${req.parent_email}` : ''}
                      {' · '}
                      {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-slate-500 mt-1.5 italic bg-white border border-slate-100 rounded-lg px-2.5 py-1.5">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      onClick={() => rejectRequest(req)}
                      disabled={approvingId === req.id}
                      className="inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      <XCircle size={13} /> Recusar
                    </button>
                    <button
                      onClick={() => approveRequest(req)}
                      disabled={approvingId === req.id}
                      className="inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {approvingId === req.id
                        ? <><Loader2 size={12} className="animate-spin" /> Aprovando…</>
                        : <><CheckCircle size={13} /> Aprovar</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <KpiCard
              icon={Users}
              label="Pacientes"
              value={patients.length}
              sub={patients.length === 0 ? 'Nenhum cadastrado' : 'cadastrados'}
              color="bg-blue-100 text-blue-600"
              onClick={() => document.getElementById('sec-pacientes')?.scrollIntoView({ behavior: 'smooth' })}
            />
            <KpiCard
              icon={FileText}
              label="Prescrições ativas"
              value={prescCount ?? '—'}
              sub="em andamento"
              color="bg-green-100 text-green-600"
            />
            <KpiCard
              icon={Lightbulb}
              label="Dicas publicadas"
              value={tipsCount ?? '—'}
              sub="visíveis aos responsáveis"
              color="bg-amber-100 text-amber-600"
              onClick={() => navigate('/dashboard/dicas')}
            />
          </>
        )}
      </div>

      {/* ── Acesso rápido ── */}
      <div>
        <h2 className="section-header mb-3">Acesso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/dashboard/pacientes/novo')}
            className="card p-4 flex items-center gap-3 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <UserPlus size={17} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Novo paciente</p>
              <p className="text-xs text-slate-400">Cadastrar uma criança</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/dashboard/dicas')}
            className="card p-4 flex items-center gap-3 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Lightbulb size={17} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Publicar dica</p>
              <p className="text-xs text-slate-400">Orientações para os pais</p>
            </div>
          </button>

          <button
            onClick={() => document.getElementById('sec-pacientes')?.scrollIntoView({ behavior: 'smooth' })}
            className="card p-4 flex items-center gap-3 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
              <Activity size={17} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Ver pacientes</p>
              <p className="text-xs text-slate-400">Lista completa</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Dicas recentes ── */}
      {(loading || recentTips.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-header">Dicas recentes</h2>
            <button
              onClick={() => navigate('/dashboard/dicas')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todas <ChevronRight size={13} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {recentTips.map(tip => {
                const meta = CAT[tip.category] ?? CAT.general
                return (
                  <button
                    key={tip.id}
                    onClick={() => navigate('/dashboard/dicas')}
                    className="card w-full p-3.5 flex items-center gap-3 text-left hover:shadow-sm hover:border-slate-300 transition-all"
                  >
                    <span className="text-xl shrink-0">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{tip.title}</p>
                      <p className="text-xs text-slate-400">
                        {meta.label} · {tip.published_at
                          ? format(parseISO(tip.published_at), "dd/MM/yyyy", { locale: ptBR })
                          : '—'}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                      Publicada
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Lista de pacientes ── */}
      <div id="sec-pacientes">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-header">
            Pacientes
            {!loading && (
              <span className="ml-2 text-xs font-normal text-slate-400 normal-case">
                {patients.length} cadastrado{patients.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              {search ? <Search size={26} /> : <Users size={26} />}
            </div>
            <p className="font-medium">
              {search ? `Nenhum resultado para "${search}"` : 'Nenhum paciente cadastrado'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/dashboard/pacientes/novo')}
                className="btn-primary mt-4"
              >
                <Baby size={16} /> Cadastrar primeiro paciente
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <PatientCard
                key={p.id}
                patient={p}
                onClick={() => navigate(`/dashboard/pacientes/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
