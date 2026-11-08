-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Correções de segurança (RLS + papel de médico)
-- Execute inteiro no Supabase: SQL Editor → New query → Run
-- Idempotente: pode ser executado mais de uma vez.
--
-- Corrige:
--   1. Qualquer usuário conseguia se tornar 'doctor' (papel gravado pelo
--      próprio navegador e alterável via profiles_update_own).
--      → papel agora só muda no servidor; convite de médico validado no banco.
--   2. medications, crying_records, food_introductions, diaper_records
--      estavam abertas (USING true) para qualquer usuário logado.
--      → médico: tudo · família: só o próprio filho.
--   3. depoimentos: qualquer usuário logado podia editar/apagar.
--      → só médico gerencia; leitura pública dos visíveis continua.
--   4. exam_records: INSERT da família restrito ao próprio filho.
--
-- IMPORTANTE: o código de convite NÃO fica neste arquivo (o repositório é
-- público). Depois de rodar, crie um código novo com o comando do final.
-- ══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- 1. PAPEL (role) PROTEGIDO
-- ──────────────────────────────────────────────────────────────────────

-- 1a. Códigos de convite de médico (guardados como hash SHA-256)
CREATE TABLE IF NOT EXISTS public.doctor_invite_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash   text        NOT NULL UNIQUE,
  label       text,
  max_uses    integer     NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses        integer     NOT NULL DEFAULT 0 CHECK (uses >= 0),
  active      boolean     NOT NULL DEFAULT true,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_invite_redemptions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id      uuid        NOT NULL REFERENCES public.doctor_invite_codes(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS ligada e SEM políticas = ninguém acessa pela API (só funções do servidor)
ALTER TABLE public.doctor_invite_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_invite_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doctor_invite_codes       FROM anon, authenticated;
REVOKE ALL ON public.doctor_invite_redemptions FROM anon, authenticated;

-- 1b. Trigger: usuário comum nunca define nem altera o próprio papel.
--     Liberado apenas para: SQL Editor / service_role (auth.uid() nulo)
--     e para a função redeem_doctor_invite (flag local da transação).
CREATE OR REPLACE FUNCTION public.fn_profiles_guard_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR current_setting('pedsuite.role_change', true) = 'allowed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'parent';
  ELSE
    NEW.id   := OLD.id;
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_role ON public.profiles;
CREATE TRIGGER trg_profiles_guard_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_guard_role();

-- 1c. Resgatar convite (chamada pelo app logo após o cadastro do médico)
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
    INSERT INTO public.profiles (id, role) VALUES (v_uid, 'doctor');
  END IF;
  PERFORM set_config('pedsuite.role_change', '', true);

  INSERT INTO public.doctor_invite_redemptions (code_id, user_id) VALUES (v_code, v_uid);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_doctor_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_doctor_invite(text) TO authenticated;

-- 1d. Criar código de convite — só pelo SQL Editor (não exposto à API)
CREATE OR REPLACE FUNCTION public.create_doctor_invite(
  p_code      text,
  p_max_uses  integer DEFAULT 1,
  p_label     text    DEFAULT NULL,
  p_expires   timestamptz DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_code IS NULL OR char_length(btrim(p_code)) < 10 THEN
    RAISE EXCEPTION 'Use um código com pelo menos 10 caracteres.';
  END IF;
  INSERT INTO public.doctor_invite_codes (code_hash, max_uses, label, expires_at)
  VALUES (encode(sha256(convert_to(upper(btrim(p_code)), 'UTF8')), 'hex'),
          GREATEST(p_max_uses, 1), p_label, p_expires)
  ON CONFLICT (code_hash) DO UPDATE
    SET max_uses = EXCLUDED.max_uses, label = EXCLUDED.label,
        expires_at = EXCLUDED.expires_at, active = true;
  RETURN 'Convite criado (' || GREATEST(p_max_uses, 1) || ' uso(s)).';
END;
$$;

REVOKE ALL ON FUNCTION public.create_doctor_invite(text, integer, text, timestamptz) FROM PUBLIC, anon, authenticated;


-- ──────────────────────────────────────────────────────────────────────
-- 2. TABELAS CLÍNICAS QUE ESTAVAM ABERTAS (USING true)
--    Remove TODAS as políticas atuais delas e recria no padrão do projeto.
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t   text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['medications', 'crying_records', 'food_introductions', 'diaper_records'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabela % não existe — pulando.', t;
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'patient_id'
    ) THEN
      RAISE EXCEPTION 'Tabela % não tem patient_id — revise antes de continuar.', t;
    END IF;

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
        USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor'))
        WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor'))
    $p$, t || '_doctor_all', t);

    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
        USING      (patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid()))
        WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid()))
    $p$, t || '_parent_all', t);
  END LOOP;
END $$;


-- ──────────────────────────────────────────────────────────────────────
-- 3. DEPOIMENTOS — só médico gerencia; visíveis continuam públicos
-- ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.depoimentos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "medico gerencia depoimentos" ON public.depoimentos;
    DROP POLICY IF EXISTS "depoimentos_doctor_all"      ON public.depoimentos;
    ALTER TABLE public.depoimentos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "depoimentos_doctor_all" ON public.depoimentos FOR ALL TO authenticated
      USING      (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor'));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────
-- 4. EXAMES — família só envia exame do próprio filho
--    (recria a política de INSERT da família com a regra explícita)
-- ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.exam_records') IS NOT NULL THEN
    DROP POLICY IF EXISTS "familia_insert_exames" ON public.exam_records;
    CREATE POLICY "familia_insert_exames" ON public.exam_records FOR INSERT TO authenticated
      WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid()));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL — confira cada linha
--   • "Conta de médico": devem ser SÓ contas suas. Se aparecer e-mail
--     desconhecido, me avise antes de qualquer outra coisa.
--   • "Política aberta": não deve aparecer nenhuma.
--   • "Tabela sem RLS": não deve aparecer nenhuma.
--   • "View": mostra se a view de exames da família respeita RLS.
-- ──────────────────────────────────────────────────────────────────────
SELECT 'Conta de médico' AS verificacao,
       COALESCE(u.email, p.id::text) || ' · criada em ' || to_char(u.created_at, 'DD/MM/YYYY') AS detalhe
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
 WHERE p.role = 'doctor'
UNION ALL
SELECT 'Política aberta (true)', tablename || ' · ' || policyname || ' · ' || cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true')
UNION ALL
SELECT 'Tabela sem RLS', c.relname
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
UNION ALL
SELECT 'View', c.relname || ' · security_invoker=' ||
       COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions) WHERE option_name = 'security_invoker'), 'off')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'v'
UNION ALL
SELECT 'Proteção do papel', CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_guard_role') THEN 'ativa ✓' ELSE 'FALTANDO' END;


-- ──────────────────────────────────────────────────────────────────────
-- DEPOIS DE RODAR: crie o novo código de convite (NÃO salve no GitHub)
-- Rode separado, trocando o texto por um código seu (≥ 10 caracteres):
--
--   SELECT public.create_doctor_invite('SEU-CODIGO-AQUI', 1, 'convite inicial');
--
-- O segundo número é quantas vezes o código pode ser usado.
-- O antigo GASTRO2024 deixa de funcionar com esta atualização.
-- ──────────────────────────────────────────────────────────────────────
