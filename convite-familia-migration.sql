-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Convite da família por link / QR code
-- Execute inteiro no Supabase: SQL Editor → New query → Run
-- Pré-requisito: multi-medico-freemium-migration.sql já aplicada.
-- Idempotente: pode ser executado mais de uma vez.
--
-- Fluxo:
--   1. Médico dono do paciente gera convite → recebe o link UMA vez
--      (o banco guarda só o hash do código; gerar de novo invalida o anterior)
--   2. Família abre o link → vê o primeiro nome da criança e o médico
--   3. Família cria conta ou entra → aceita → fica vinculada ao paciente
--
-- Regras: convite vale 7 dias e é de uso único; paciente já vinculado não
-- aceita convite; conta de médico não aceita convite; nesta versão cada
-- conta de responsável acompanha uma criança (irmãos: próxima etapa).
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regprocedure('public.doctor_owns_patient(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Rode antes a multi-medico-freemium-migration.sql.';
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────
-- 1. TABELA
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at     timestamptz,
  used_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_patient_invites_patient ON public.patient_invites (patient_id);

-- Acesso só pelas funções abaixo; médico pode consultar os convites dos seus pacientes
ALTER TABLE public.patient_invites ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.patient_invites FROM anon, authenticated;

DROP POLICY IF EXISTS "invites_doctor_select" ON public.patient_invites;
CREATE POLICY "invites_doctor_select" ON public.patient_invites FOR SELECT TO authenticated
  USING (public.doctor_owns_patient(patient_id));

CREATE OR REPLACE FUNCTION public.invite_token_hash(p_token text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT encode(sha256(convert_to(lower(btrim(p_token)), 'UTF8')), 'hex');
$$;
REVOKE ALL ON FUNCTION public.invite_token_hash(text) FROM PUBLIC, anon, authenticated;


-- ──────────────────────────────────────────────────────────────────────
-- 2. MÉDICO GERA CONVITE (retorna o código uma única vez)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_patient_invite(p_patient uuid)
RETURNS TABLE (token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_exp   timestamptz := now() + interval '7 days';
BEGIN
  IF NOT public.doctor_owns_patient(p_patient) THEN
    RAISE EXCEPTION 'Paciente não encontrado.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient AND parent_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Este paciente já tem uma família vinculada.';
  END IF;

  -- Invalida convites anteriores ainda não usados
  UPDATE public.patient_invites
     SET revoked_at = now()
   WHERE patient_id = p_patient AND used_at IS NULL AND revoked_at IS NULL;

  -- 2 UUIDs aleatórios = 244 bits; só letras/números (bom para link e QR)
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO public.patient_invites (patient_id, doctor_id, token_hash, expires_at)
  VALUES (p_patient, auth.uid(), public.invite_token_hash(v_token), v_exp);

  RETURN QUERY SELECT v_token, v_exp;
END;
$$;

REVOKE ALL ON FUNCTION public.create_patient_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_patient_invite(uuid) TO authenticated;


-- ──────────────────────────────────────────────────────────────────────
-- 3. INFORMAÇÕES DO CONVITE (página pública do link)
--    Mostra só o primeiro nome da criança e o nome do médico.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_info(p_token text)
RETURNS TABLE (status text, child_first_name text, doctor_name text, expires_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-fA-F]{64}$' THEN
    RETURN QUERY SELECT 'invalido'::text, NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT i.*, p.name AS child_name, p.parent_id, pr.full_name AS doc_name
    INTO r
    FROM public.patient_invites i
    JOIN public.patients p  ON p.id = i.patient_id
    LEFT JOIN public.profiles pr ON pr.id = i.doctor_id
   WHERE i.token_hash = public.invite_token_hash(p_token);

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalido'::text, NULL::text, NULL::text, NULL::timestamptz;
  ELSIF r.used_at IS NOT NULL OR r.parent_id IS NOT NULL THEN
    RETURN QUERY SELECT 'usado'::text, NULL::text, NULL::text, NULL::timestamptz;
  ELSIF r.revoked_at IS NOT NULL OR r.expires_at < now() THEN
    RETURN QUERY SELECT 'expirado'::text, NULL::text, NULL::text, NULL::timestamptz;
  ELSE
    RETURN QUERY SELECT 'valido'::text,
                        split_part(btrim(r.child_name), ' ', 1),
                        r.doc_name,
                        r.expires_at;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_info(text) TO anon, authenticated;


-- ──────────────────────────────────────────────────────────────────────
-- 4. FAMÍLIA ACEITA O CONVITE (precisa estar logada)
-- ──────────────────────────────────────────────────────────────────────
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

  IF EXISTS (SELECT 1 FROM public.patients WHERE parent_id = v_uid AND id <> v_inv.patient_id) THEN
    RAISE EXCEPTION 'Esta conta já acompanha outra criança. Por enquanto, use outro e-mail para este convite.';
  END IF;

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


-- ──────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO
-- ──────────────────────────────────────────────────────────────────────
SELECT 'Função' AS verificacao, p.proname AS detalhe
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('create_patient_invite', 'invite_info', 'accept_patient_invite')
UNION ALL
SELECT 'Tabela', 'patient_invites · RLS ' || CASE WHEN relrowsecurity THEN 'ligada ✓' ELSE 'DESLIGADA' END
  FROM pg_class WHERE oid = 'public.patient_invites'::regclass;
