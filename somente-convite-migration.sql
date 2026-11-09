-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Vínculo da família SOMENTE por convite
-- Execute inteiro no Supabase: SQL Editor → New query → Run
-- Pré-requisito: convite-familia-migration.sql já aplicada.
-- Idempotente: pode ser executado mais de uma vez.
--
-- Antes: quem criasse conta com o e-mail cadastrado no paciente ficava
-- vinculado automaticamente. Como a confirmação de e-mail está desligada,
-- alguém poderia criar conta com o e-mail de outra pessoa e assumir o
-- acesso à criança. Agora o vínculo acontece só por:
--   • convite (link/QR) gerado pelo médico, ou
--   • pedido de cadastro feito pela família e aprovado pelo médico.
--
--   1. patients: família vê/edita só filhos com parent_id = ela mesma
--      (sem o atalho "parent_email = meu e-mail")
--   2. Remove get_user_id_by_email (devolvia o ID de qualquer conta a partir
--      do e-mail — não é mais usado pelo app)
--   3. Relatório: pacientes que ainda aguardam a família (enviar convite)
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regprocedure('public.accept_patient_invite(text)') IS NULL THEN
    RAISE EXCEPTION 'Rode antes a convite-familia-migration.sql.';
  END IF;
END $$;

-- 1. Políticas da família em patients
DROP POLICY IF EXISTS "patients_parent_link"   ON public.patients;
DROP POLICY IF EXISTS "patients_parent_select" ON public.patients;

CREATE POLICY "patients_parent_select" ON public.patients FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- (edição pela família continua em "parent_update_own_patient": parent_id = auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'patients'
                    AND policyname = 'parent_update_own_patient') THEN
    CREATE POLICY "parent_update_own_patient" ON public.patients FOR UPDATE TO authenticated
      USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());
  END IF;
END $$;

-- 2. Remove get_user_id_by_email (todas as versões)
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN SELECT p.oid::regprocedure
             FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'get_user_id_by_email' LOOP
    EXECUTE format('DROP FUNCTION %s', f);
  END LOOP;
END $$;


-- 3. VERIFICAÇÃO
--   • "Política com e-mail": não deve aparecer nenhuma
--   • "Aguardando família": pacientes sem responsável — gere o convite
--     no cabeçalho de cada um (botão "Convidar família")
SELECT 'Política com e-mail' AS verificacao, tablename || ' · ' || policyname AS detalhe
  FROM pg_policies
 WHERE schemaname = 'public'
   AND (COALESCE(qual, '') || COALESCE(with_check, '')) ILIKE '%email%'
UNION ALL
SELECT 'Função get_user_id_by_email',
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_id_by_email')
            THEN 'AINDA EXISTE' ELSE 'removida ✓' END
UNION ALL
SELECT 'Aguardando família', name || COALESCE(' · e-mail anotado: ' || parent_email, '')
  FROM public.patients
 WHERE parent_id IS NULL;
