import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ─────────────────────────────────────────────────────────────
   Plano do médico logado (função my_plan() no Supabase).
   O limite de verdade é aplicado no banco (trigger em patients);
   aqui é só para mostrar uso e evitar formulário inútil.
───────────────────────────────────────────────────────────── */

export const PLANOS = {
  free:     { nome: 'Grátis',   cor: 'bg-slate-100 text-slate-700'  },
  starter:  { nome: 'Starter',  cor: 'bg-blue-100 text-blue-700'    },
  clinica:  { nome: 'Clínica',  cor: 'bg-violet-100 text-violet-700' },
  cortesia: { nome: 'Cortesia', cor: 'bg-amber-100 text-amber-800'  },
}

/* Link de checkout (Hotmart) — configure VITE_HOTMART_CHECKOUT_URL na Vercel */
export const CHECKOUT_URL = import.meta.env.VITE_HOTMART_CHECKOUT_URL || ''

export function usePlano() {
  const [plano,   setPlano]   = useState(null)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('my_plan')
      // Sem a função (migration ainda não aplicada) → não bloqueia nada
      if (error || !data?.length) { setPlano(null); return }
      const p = data[0]
      setPlano({
        id:        p.plan,
        nome:      PLANOS[p.plan]?.nome ?? p.plan,
        status:    p.status,
        limite:    p.patient_limit,            // null = ilimitado
        usados:    p.patients_used ?? 0,
        venceEm:   p.current_period_end,
      })
    } catch {
      setPlano(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const ilimitado     = !plano || plano.limite == null
  const podeCadastrar = ilimitado || plano.usados < plano.limite

  return { plano, loading, ilimitado, podeCadastrar, recarregar: carregar }
}
