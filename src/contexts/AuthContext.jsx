import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Mapeia qualquer variação de role do banco para os valores que o app entende
const ROLE_MAP = {
  medico:      'medico',
  doctor:      'medico',
  doutor:      'medico',
  pai:         'pai',
  parent:      'pai',
  responsavel: 'pai',
}

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(null)
  const [profile,  setProfile]  = useState(null)
  const [paciente, setPaciente] = useState(null)
  const [loading,  setLoading]  = useState(true)   // começa true — só false depois da 1ª verificação
  const duranteSignup    = useRef(false)
  const perfilCarregado  = useRef(null)   // userId do último perfil setado manualmente

  /* ─── busca perfil no banco ─── */
  const carregarPerfil = async (userId, userEmail) => {
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.log('[Auth] perfil bruto:', prof, '| erro:', error)

      if (error || !prof) return

      const roleRaw = (prof.role ?? prof.funcao ?? '').toLowerCase()
      const role    = ROLE_MAP[roleRaw] ?? roleRaw

      console.log('[Auth] role mapeado:', roleRaw, '→', role)

      const profileFinal = { ...prof, role }
      setProfile(profileFinal)

      if (role === 'pai') {
        // 1ª tentativa: já vinculado por parent_id
        let { data: pac } = await supabase
          .from('patients')
          .select('*')
          .eq('parent_id', userId)
          .maybeSingle()

        // 2ª tentativa: médico cadastrou o e-mail mas responsável ainda não tinha conta
        if (!pac && userEmail) {
          try {
            const { data: pendente } = await supabase
              .from('patients')
              .select('*')
              .eq('parent_email', userEmail.toLowerCase())
              .is('parent_id', null)
              .maybeSingle()

            if (pendente) {
              // Limpa pending_parent_email do notes ao vincular
              let updatedNotes = null
              try {
                const notesObj = pendente.notes ? JSON.parse(pendente.notes) : {}
                delete notesObj.pending_parent_email
                updatedNotes = Object.keys(notesObj).length ? JSON.stringify(notesObj) : null
              } catch { updatedNotes = null }

              await supabase
                .from('patients')
                .update({ parent_id: userId, parent_email: null, notes: updatedNotes })
                .eq('id', pendente.id)
              pac = { ...pendente, parent_id: userId, parent_email: null, notes: updatedNotes }
              console.log('[Auth] auto-vínculo por e-mail para paciente', pendente.id)
            }
          } catch (linkErr) {
            console.warn('[Auth] verificação de parent_email falhou:', linkErr.message)
          }
        }

        setPaciente(pac ?? null)
      }
    } catch (err) {
      console.error('[Auth] carregarPerfil erro:', err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ─── único listener de auth ─── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('[Auth]', event, sess?.user?.email ?? 'sem sessão')

      if (!sess || event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setPaciente(null)
        setLoading(false)
        return
      }

      setSession(sess)

      if (!duranteSignup.current) {
        if (perfilCarregado.current === sess.user.id) {
          // Perfil já setado manualmente durante o signup — só atualiza a sessão
          perfilCarregado.current = null
          setSession(sess)
        } else {
          // Login normal ou sessão restaurada → busca perfil no banco
          setLoading(true)
          setProfile(null)
          setSession(sess)
          carregarPerfil(sess.user.id, sess.user.email)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── login ─── */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  /* ─── cadastro médico ─── */
  const signUpMedico = async ({ email, password, full_name, codigoConvite }) => {
    if (codigoConvite?.trim() !== 'GASTRO2024')
      throw new Error('Código de acesso inválido.')

    duranteSignup.current = true
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('Confirme seu e-mail para ativar a conta.')

      const uid = data.user.id
      const { error: pe } = await supabase
        .from('profiles')
        .insert({ id: uid, role: 'medico', full_name })
      if (pe) throw pe

      perfilCarregado.current = uid
      setSession(data.session)
      setProfile({ id: uid, role: 'medico', full_name })
      setLoading(false)
      return data
    } finally {
      duranteSignup.current = false
    }
  }

  /* ─── cadastro pai/responsável ─── */
  const signUpPai = async ({ email, password, full_name }) => {
    duranteSignup.current = true
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('Confirme seu e-mail para ativar a conta.')

      const uid = data.user.id

      const { error: pe } = await supabase
        .from('profiles')
        .insert({ id: uid, role: 'pai', full_name })
      if (pe) throw pe

      // Verifica vínculo pendente — isolado para não bloquear o cadastro se falhar
      let pac = null
      try {
        const { data: pendente } = await supabase
          .from('patients')
          .select('*')
          .eq('parent_email', email.toLowerCase())
          .is('parent_id', null)
          .maybeSingle()

        if (pendente) {
          // Limpa pending_parent_email do notes ao vincular
          let updatedNotes = null
          try {
            const notesObj = pendente.notes ? JSON.parse(pendente.notes) : {}
            delete notesObj.pending_parent_email
            updatedNotes = Object.keys(notesObj).length ? JSON.stringify(notesObj) : null
          } catch { updatedNotes = null }

          await supabase
            .from('patients')
            .update({ parent_id: uid, parent_email: null, notes: updatedNotes })
            .eq('id', pendente.id)
          pac = { ...pendente, parent_id: uid, parent_email: null, notes: updatedNotes }
          console.log('[Auth] vínculo automático no cadastro, paciente:', pendente.id)
        }
      } catch (linkErr) {
        console.warn('[Auth] verificação de vínculo pendente falhou:', linkErr.message)
      }

      // Atualiza todo o estado de uma vez e libera o loading
      perfilCarregado.current = uid   // sinaliza que o próximo evento de auth pode ser ignorado
      setSession(data.session)
      setProfile({ id: uid, role: 'pai', full_name })
      setPaciente(pac)
      setLoading(false)
      return data
    } finally {
      duranteSignup.current = false
    }
  }

  /* ─── logout ─── */
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session, profile, paciente, loading,
      signIn, signOut, signUpMedico, signUpPai,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
