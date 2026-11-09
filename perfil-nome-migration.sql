-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — profiles.full_name é obrigatório: funções passam a preenchê-lo
-- Execute inteiro no Supabase: SQL Editor → New query → Run (idempotente)
-- Pré-requisito: irmaos-migration.sql e security-hardening-migration.sql.
--
-- accept_patient_invite e redeem_doctor_invite criam o perfil quando a conta
-- ainda não tem um (caso raro). Como profiles.full_name é NOT NULL em
-- produção, esse caminho falharia. Agora usam o nome do cadastro da conta
-- (metadados), senão a parte do e-mail antes do @.
-- ══════════════════════════════════════════════════════════════════════

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
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (v_uid, 'parent', COALESCE(NULLIF(btrim((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_uid)), ''), (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = v_uid), 'Usuário'));
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


CREATE OR REPLACE FUNCTION public.redeem_doctor_invite(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão não encontrada.' USING ERRCODE = '28000';
  END IF;
  IF p_code IS NULL OR char_length(btrim(p_code)) < 6 THEN
    RETURN false;
  END IF;

  SELECT id INTO v_code
    FROM public.doctor_invite_codes
   WHERE code_hash = encode(sha256(convert_to(upper(btrim(p_code)), 'UTF8')), 'hex')
     AND active
     AND uses < max_uses
     AND (expires_at IS NULL OR expires_at > now())
   FOR UPDATE;

  IF v_code IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.doctor_invite_codes SET uses = uses + 1 WHERE id = v_code;

  PERFORM set_config('pedsuite.role_change', 'allowed', true);
  UPDATE public.profiles SET role = 'doctor' WHERE id = v_uid;
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, role, full_name)
      VALUES (v_uid, 'doctor', COALESCE(NULLIF(btrim((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_uid)), ''), (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = v_uid), 'Usuário'));
  END IF;
  PERFORM set_config('pedsuite.role_change', '', true);

  INSERT INTO public.doctor_invite_redemptions (code_id, user_id) VALUES (v_code, v_uid);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_doctor_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_doctor_invite(text) TO authenticated;


-- VERIFICAÇÃO — as duas devem mostrar "preenche nome ✓"
SELECT p.proname AS verificacao,
       CASE WHEN pg_get_functiondef(p.oid) LIKE '%full_name%' THEN 'preenche nome ✓' ELSE 'SEM NOME' END AS detalhe
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname IN ('accept_patient_invite', 'redeem_doctor_invite');
