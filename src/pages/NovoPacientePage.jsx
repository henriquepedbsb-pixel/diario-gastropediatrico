import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Baby, Users, Scale, X, Plus, Loader2, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

/* ── Tag Input para alergias ── */
function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')

  const add = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  const remove = (tag) => onChange(tags.filter(t => t !== tag))

  return (
    <div
      className="input flex flex-wrap gap-1.5 h-auto min-h-[42px] cursor-text py-2"
      onClick={e => e.currentTarget.querySelector('input')?.focus()}
    >
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            className="hover:text-amber-600"
          >
            <X size={11} />
          </button>
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
        className="flex-1 min-w-[140px] outline-none text-sm bg-transparent placeholder-slate-400"
      />
    </div>
  )
}

/* ── Campo auxiliar ── */
function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint  && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function NovoPacientePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [allergies, setAllergies] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState('')

  const onSubmit = async (values) => {
    setLoading(true)
    setErro('')
    try {
      // ── Tenta resolver o UUID do responsável pelo e-mail ──
      const emailResp = values.parent_email?.trim().toLowerCase() || null
      let parentId    = null

      if (emailResp) {
        const { data: uid } = await supabase
          .rpc('get_user_id_by_email', { email_input: emailResp })
        parentId = uid ?? null
      }

      // ── Monta notes: dados dos pais + pending_parent_email se necessário ──
      const notesObj = {}
      if (values.father_name?.trim()) notesObj.pai  = values.father_name.trim()
      if (values.mother_name?.trim()) notesObj.mae  = values.mother_name.trim()
      if (values.notes?.trim())       notesObj.notas = values.notes.trim()
      if (emailResp && !parentId)     notesObj.pending_parent_email = emailResp
      const notesJson = Object.keys(notesObj).length ? JSON.stringify(notesObj) : null

      // ── Insere o paciente ──
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert({
          name:         values.name.trim(),
          birthdate:    values.birthdate,
          gender:       values.gender    || null,
          blood_type:   values.blood_type || null,
          allergies:    allergies.length  ? allergies : null,
          notes:        notesJson,
          parent_id:    parentId,          // UUID do responsável se já tem conta, null se não
          parent_email: parentId ? null : emailResp,  // coluna dedicada para busca eficiente
        })
        .select()
        .single()
      if (patientError) throw patientError

      // ── Insere dados de nascimento em growth_records (se preenchidos) ──
      const temDadosNascimento =
        values.birth_weight || values.birth_height || values.birth_head_circ

      if (temDadosNascimento) {
        const { error: growthError } = await supabase
          .from('growth_records')
          .insert({
            patient_id:             patient.id,
            recorded_at:            values.birthdate,
            weight_kg:              values.birth_weight     ? parseFloat(values.birth_weight)     : null,
            height_cm:              values.birth_height     ? parseFloat(values.birth_height)     : null,
            head_circumference_cm:  values.birth_head_circ  ? parseFloat(values.birth_head_circ)  : null,
            recorded_by:            session.user.id,
            notes:                  'Dados de nascimento',
          })
        if (growthError) throw growthError
      }

      navigate(`/dashboard/pacientes/${patient.id}`)
    } catch (err) {
      setErro(err.message ?? 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Novo Paciente</h1>
          <p className="text-sm text-slate-500">Preencha os dados da criança</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Identificação ── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <Baby size={15} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-700">Identificação</h2>
          </div>

          {/* Nome */}
          <Field label="Nome completo *" error={errors.name?.message}>
            <input
              className="input"
              placeholder="Nome da criança"
              {...register('name', { required: 'Nome obrigatório' })}
            />
          </Field>

          {/* Data de nascimento + gênero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de nascimento *" error={errors.birthdate?.message}>
              <input
                type="date"
                className="input"
                max={new Date().toISOString().split('T')[0]}
                {...register('birthdate', { required: 'Data obrigatória' })}
              />
            </Field>

            <Field label="Gênero">
              <select className="input" {...register('gender')}>
                <option value="">— Selecione —</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </Field>
          </div>

          {/* Tipo sanguíneo */}
          <Field label="Tipo sanguíneo">
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_TYPES.map(bt => (
                <label key={bt} className="relative cursor-pointer">
                  <input
                    type="radio"
                    value={bt}
                    className="sr-only peer"
                    {...register('blood_type')}
                  />
                  <div className="text-center py-2 rounded-lg border-2 border-slate-200 text-sm font-semibold text-slate-600
                    peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-700
                    hover:border-slate-300 transition-all">
                    {bt}
                  </div>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* ── Responsáveis ── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users size={15} className="text-purple-600" />
            </div>
            <h2 className="font-semibold text-slate-700">Responsáveis</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome do pai / responsável">
              <input
                className="input"
                placeholder="Nome completo"
                {...register('father_name')}
              />
            </Field>
            <Field label="Nome da mãe / responsável">
              <input
                className="input"
                placeholder="Nome completo"
                {...register('mother_name')}
              />
            </Field>
          </div>

          {/* E-mail do responsável para vínculo no app */}
          <Field
            label="E-mail do responsável no app"
            hint="Se o responsável já tiver conta, será vinculado automaticamente. Caso contrário, o vínculo ocorre no primeiro login."
            error={errors.parent_email?.message}
          >
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                className="input pl-9"
                placeholder="email@responsavel.com"
                {...register('parent_email', {
                  pattern: { value: /\S+@\S+\.\S+/, message: 'E-mail inválido' },
                })}
              />
            </div>
          </Field>
        </div>

        {/* ── Dados de Nascimento ── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <Scale size={15} className="text-green-600" />
            </div>
            <h2 className="font-semibold text-slate-700">Dados Antropométricos de Nascimento</h2>
          </div>
          <p className="text-xs text-slate-400 -mt-1">
            Serão salvos automaticamente como primeiro registro no gráfico de crescimento
          </p>

          <div className="grid grid-cols-3 gap-4">
            <Field
              label="Peso de nascimento (kg)"
              error={errors.birth_weight?.message}
            >
              <input
                type="number"
                step="0.001"
                min="0.3"
                max="8"
                className="input"
                placeholder="ex: 3.250"
                {...register('birth_weight', {
                  min: { value: 0.3, message: 'Mínimo 0,3 kg' },
                  max: { value: 8,   message: 'Máximo 8 kg' },
                })}
              />
            </Field>

            <Field
              label="Estatura de nascimento (cm)"
              error={errors.birth_height?.message}
            >
              <input
                type="number"
                step="0.1"
                min="20"
                max="70"
                className="input"
                placeholder="ex: 49.5"
                {...register('birth_height', {
                  min: { value: 20, message: 'Mínimo 20 cm' },
                  max: { value: 70, message: 'Máximo 70 cm' },
                })}
              />
            </Field>

            <Field
              label="Perímetro cefálico (cm)"
              error={errors.birth_head_circ?.message}
            >
              <input
                type="number"
                step="0.1"
                min="20"
                max="45"
                className="input"
                placeholder="ex: 34.0"
                {...register('birth_head_circ', {
                  min: { value: 20, message: 'Mínimo 20 cm' },
                  max: { value: 45, message: 'Máximo 45 cm' },
                })}
              />
            </Field>
          </div>
        </div>

        {/* ── Alergias ── */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-700 pb-2 border-b border-slate-100">
            Alergias e Intolerâncias
          </h2>
          <Field
            label="Alergias conhecidas"
            hint="Digite cada alergia e pressione Enter para adicionar"
          >
            <TagInput tags={allergies} onChange={setAllergies} />
          </Field>

          {/* Atalhos comuns */}
          <div className="flex flex-wrap gap-2">
            {['Leite de vaca', 'Glúten', 'Ovo', 'Soja', 'Amendoim', 'Frutos do mar'].map(a => (
              !allergies.includes(a) && (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAllergies(prev => [...prev, a])}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                >
                  <Plus size={11} /> {a}
                </button>
              )
            ))}
          </div>
        </div>

        {/* ── Observações ── */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-700 pb-2 border-b border-slate-100 mb-4">
            Observações Clínicas
          </h2>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder="Histórico clínico, condições relevantes, observações gerais…"
            {...register('notes')}
          />
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <span className="shrink-0">⚠️</span> {erro}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 py-3"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Salvando…</>
              : 'Cadastrar Paciente'}
          </button>
        </div>
      </form>
    </div>
  )
}
