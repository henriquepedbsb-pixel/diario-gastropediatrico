-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Irmãos: uma conta de responsável acompanha várias crianças
-- Execute inteiro no Supabase: SQL Editor → New query → Run
-- Pré-requisito: convite-familia-migration.sql já aplicada.
-- Idempotente: pode ser executado mais de uma vez.
--
-- O que muda: o convite deixa de recusar contas que já acompanham outra
-- criança. As políticas de acesso da família já usam
-- "patient_id IN (filhos desta conta)", então funcionam para vários filhos.
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regprocedure('public.accept_patient_invite(text)') IS NULL THEN
    RAISE EXCEPTION 'Rode antes a convite-familia-migration.sql.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.accept_patient_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_inv  public.patient_invites%ROWTYPE;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para aceitar o convite.' USING ERRCODE = '28000';
  END IF;
  IF p_token IS NULL OR p_token !~ '^[0-9a-fA-F]{64}$' THEN
    RAISE EXCEPTION 'Convite inválido.';
  END IF;

  SELECT * INTO v_inv
    FROM public.patient_invites
   WHERE token_hash = public.invite_token_hash(p_token)
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido.';
  END IF;
  IF v_inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este convite já foi usado.';
  END IF;
  IF v_inv.revoked_at IS NOT NULL OR v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'Este convite expirou. Peça um novo ao médico.';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role = 'doctor' THEN
    RAISE EXCEPTION 'Contas de médico não podem aceitar convite de família.';
  END IF;
  IF v_role IS NULL THEN
    INSERT INTO public.profiles (id, role) VALUES (v_uid, 'parent');
  END IF;

  -- (irmãos permitidos: a mesma conta pode acompanhar várias crianças)

  UPDATE public.patients
     SET parent_id = v_uid, parent_email = NULL
   WHERE id = v_inv.patient_id AND parent_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este paciente já tem uma família vinculada.';
  END IF;

  UPDATE public.patient_invites
     SET used_at = now(), used_by = v_uid
   WHERE id = v_inv.id;

  RETURN v_inv.patient_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_patient_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_patient_invite(text) TO authenticated;


-- VERIFICAÇÃO — deve mostrar "irmãos permitidos ✓"
SELECT 'Convite' AS verificacao,
       CASE WHEN pg_get_functiondef('public.accept_patient_invite(text)'::regprocedure)
                 LIKE '%já acompanha outra criança%'
            THEN 'AINDA BLOQUEIA IRMÃOS' ELSE 'irmãos permitidos ✓' END AS detalhe;
