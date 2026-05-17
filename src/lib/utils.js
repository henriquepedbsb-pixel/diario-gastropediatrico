import { supabase } from './supabase'

/* Marca atividade do responsável no paciente (substitui trigger do banco) */
export const markPatientActivity = (patientId) => {
  supabase.from('patients')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', patientId)
    .then(() => {}) // fire and forget
}

/* ── Helpers de verificação de role ──
   Banco armazena: 'doctor' | 'parent'
   App usa internamente: 'medico' | 'pai'
   Ambos são aceitos em qualquer verificação.
── */

const ROLES_MEDICO = ['doctor', 'medico', 'médico', 'Doutor', 'doutor']
const ROLES_PAI    = ['parent', 'pai', 'mae', 'mãe', 'responsavel', 'responsável', 'guardian']

export const isDoctor = (role) => !!role && ROLES_MEDICO.includes(role.trim())
export const isPai    = (role) => !!role && ROLES_PAI.includes(role.trim())

/* Normaliza qualquer variação para 'medico' | 'pai' | null */
export const normalizeRole = (role) => {
  if (!role) return null
  const r = role.trim()
  if (ROLES_MEDICO.includes(r)) return 'medico'
  if (ROLES_PAI.includes(r))    return 'pai'
  return null
}
