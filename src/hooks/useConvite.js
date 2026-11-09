import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ─────────────────────────────────────────────────────────────
   Convite da família por link / QR code
   Funções no Supabase: create_patient_invite · invite_info · accept_patient_invite
   O código do convite só existe no link (o banco guarda o hash).
───────────────────────────────────────────────────────────── */

export const linkDoConvite = (token) => `${window.location.origin}/convite/${token}`

/* Mensagens do banco → texto para a tela (sem detalhes técnicos) */
function mensagem(err, padrao) {
  const m = err?.message || ''
  if (/function .* does not exist|Could not find the function/i.test(m)) {
    return 'O convite ainda não está ativado no servidor. Avise o consultório.'
  }
  return m || padrao
}

export function useConvite() {
  const gerarConvite = useCallback(async (patientId) => {
    const { data, error } = await supabase.rpc('create_patient_invite', { p_patient: patientId })
    if (error || !data?.length) throw new Error(mensagem(error, 'Não foi possível gerar o convite.'))
    const { token, expires_at } = data[0]
    return { token, expiraEm: expires_at, link: linkDoConvite(token) }
  }, [])

  const infoConvite = useCallback(async (token) => {
    const { data, error } = await supabase.rpc('invite_info', { p_token: token })
    if (error) throw new Error(mensagem(error, 'Não foi possível abrir o convite.'))
    const r = data?.[0] ?? { status: 'invalido' }
    return { status: r.status, crianca: r.child_first_name, medico: r.doctor_name, expiraEm: r.expires_at }
  }, [])

  const aceitarConvite = useCallback(async (token) => {
    const { data, error } = await supabase.rpc('accept_patient_invite', { p_token: token })
    if (error) throw new Error(mensagem(error, 'Não foi possível aceitar o convite.'))
    return data
  }, [])

  return { gerarConvite, infoConvite, aceitarConvite }
}
