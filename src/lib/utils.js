/* ── Helpers de verificação de role ── */

const ROLES_MEDICO = ['medico', 'médico', 'doctor', 'Doutor', 'doutor']
const ROLES_PAI    = ['pai', 'mae', 'mãe', 'parent', 'responsavel', 'responsável', 'guardian']

export const isDoctor = (role) => ROLES_MEDICO.includes(role)
export const isPai    = (role) => ROLES_PAI.includes(role)

/* Normaliza qualquer variação para 'medico' | 'pai' | null */
export const normalizeRole = (role) => {
  if (!role) return null
  const r = role.trim()
  if (ROLES_MEDICO.includes(r)) return 'medico'
  if (ROLES_PAI.includes(r))    return 'pai'
  return null
}
