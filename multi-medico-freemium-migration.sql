-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Multi-médico + Freemium (planos)
-- Execute inteiro no Supabase: SQL Editor → New query → Run
-- Pré-requisito: security-hardening-migration.sql já aplicada.
-- Idempotente: pode ser executado mais de uma vez.
--
--   1. patients.doctor_id — cada paciente pertence a um médico
--      (pacientes atuais → o único médico existente hoje)
--   2. Funções auxiliares is_doctor / is_admin / doctor_owns_patient
--   3. Todas as políticas "médico vê tudo" → "médico vê só os seus"
--   4. Pedidos de cadastro, dicas e depoimentos no modelo multi-médico
--   5. Planos (doctor_subscriptions) + limite aplicado no banco
--   6. Storage: fim das políticas abertas; arquivos seguem o dono do paciente
--
-- Planos: free = 1 paciente · starter = 30 · clinica = ilimitado ·
--         cortesia = ilimitado (conta do administrador)
-- ══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- 0. PRÉ-CHECAGEM — exige exatamente 1 médico hoje (o dono do sistema)
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  n_doctors int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_guard_role') THEN
    RAISE EXCEPTION 'Rode antes a security-hardening-migration.sql.';
  END IF;

  SELECT count(*) INTO n_doctors FROM public.profiles WHERE role = 'doctor';

  -- Só exige 1 médico enquanto ainda não houver administrador definido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
  ) AND n_doctors <> 1 THEN
    RAISE EXCEPTION 'Esperado exatamente 1 médico para atribuir os pacientes atuais; encontrados %.', n_doctors;
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────
-- 1. PROFILES.is_admin (protegido pelo mesmo trigger do papel)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Coluna do médico dono (preenchida na seção 3; criada aqui porque as
-- funções da seção 2 já a referenciam)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES auth.users(id);

-- O administrador é o único médico existente na primeira execução
UPDATE public.profiles SET is_admin = true
 WHERE role = 'doctor'
   AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin);

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
    NEW.role     := 'parent';
    NEW.is_admin := false;
  ELSE
    NEW.id       := OLD.id;
    NEW.role     := OLD.role;
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;


-- ──────────────────────────────────────────────────────────────────────
-- 2. FUNÇÕES AUXILIARES (SECURITY DEFINER: rápidas e sem recursão de RLS)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor' AND is_admin);
$$;

CREATE OR REPLACE FUNCTION public.doctor_owns_patient(p_patient uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_doctor()
     AND EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient AND doctor_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_doctor()                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin()                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.doctor_owns_patient(uuid)  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_doctor()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctor_owns_patient(uuid) TO authenticated;


-- ──────────────────────────────────────────────────────────────────────
-- 3. PATIENTS.doctor_id
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES auth.users(id);

UPDATE public.patients
   SET doctor_id = (SELECT id FROM public.profiles WHERE role = 'doctor' AND is_admin LIMIT 1)
 WHERE doctor_id IS NULL;

ALTER TABLE public.patients ALTER COLUMN doctor_id SET DEFAULT auth.uid();
ALTER TABLE public.patients ALTER COLUMN doctor_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON public.patients (doctor_id);

-- Família não pode trocar o médico do filho; médico não pode "doar" paciente
CREATE OR REPLACE FUNCTION public.fn_patients_guard_doctor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
    NEW.doctor_id := OLD.doctor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_guard_doctor ON public.patients;
CREATE TRIGGER trg_patients_guard_doctor
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.fn_patients_guard_doctor();

DROP POLICY IF EXISTS "patients_doctor_all" ON public.patients;
CREATE POLICY "patients_doctor_all" ON public.patients FOR ALL TO authenticated
  USING      (public.is_doctor() AND doctor_id = auth.uid())
  WITH CHECK (public.is_doctor() AND doctor_id = auth.uid());


-- ──────────────────────────────────────────────────────────────────────
-- 4. TABELAS POR PACIENTE — médico só acessa pacientes dele
--    Troca a política de médico de cada tabela pela versão por dono.
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('breastfeeding_records',  'breastfeeding_doctor_all'),
      ('growth_records',         'growth_doctor_all'),
      ('meals',                  'meals_doctor_all'),
      ('patient_documents',      'documents_doctor_all'),
      ('prescriptions',          'prescriptions_doctor_all'),
      ('sleep_records',          'sleep_doctor_all'),
      ('stool_records',          'stool_doctor_all'),
      ('symptom_records',        'symptom_doctor_all'),
      ('medications',            'medications_doctor_all'),
      ('crying_records',         'crying_records_doctor_all'),
      ('food_introductions',     'food_introductions_doctor_all'),
      ('diaper_records',         'diaper_records_doctor_all'),
      ('exam_records',           'medico_full_access_exames'),
      ('private_clinical_notes', 'medico_only_private_notes')
    ) AS v(tabela, politica)
  LOOP
    IF to_regclass('public.' || r.tabela) IS NULL THEN
      RAISE NOTICE 'Tabela % não existe — pulando.', r.tabela;
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.politica, r.tabela);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
        USING      (public.doctor_owns_patient(patient_id))
        WITH CHECK (public.doctor_owns_patient(patient_id))
    $p$, r.politica, r.tabela);
  END LOOP;
END $$;

-- Meu Diário: médico dono + só anotações compartilhadas
DROP POLICY IF EXISTS "fje_doctor_select" ON public.family_journal_entries;
DROP POLICY IF EXISTS "fje_doctor_update" ON public.family_journal_entries;
CREATE POLICY "fje_doctor_select" ON public.family_journal_entries FOR SELECT TO authenticated
  USING (visibility = 'shared' AND public.doctor_owns_patient(patient_id));
CREATE POLICY "fje_doctor_update" ON public.family_journal_entries FOR UPDATE TO authenticated
  USING      (visibility = 'shared' AND public.doctor_owns_patient(patient_id))
  WITH CHECK (visibility = 'shared' AND public.doctor_owns_patient(patient_id));


-- ──────────────────────────────────────────────────────────────────────
-- 5. PEDIDOS DE CADASTRO (patient_requests)
--    doctor_id preenchido → vai para aquele médico (futuro convite/QR)
--    sem doctor_id        → vai para o administrador
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.patient_requests ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "doctor_update_request"     ON public.patient_requests;
DROP POLICY IF EXISTS "doctor_delete_request"     ON public.patient_requests;
DROP POLICY IF EXISTS "parent_select_own_request" ON public.patient_requests;
DROP POLICY IF EXISTS "doctor_select_request"     ON public.patient_requests;

CREATE POLICY "parent_select_own_request" ON public.patient_requests FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "doctor_select_request" ON public.patient_requests FOR SELECT TO authenticated
  USING (public.is_doctor() AND (doctor_id = auth.uid() OR (doctor_id IS NULL AND public.is_admin())));

CREATE POLICY "doctor_update_request" ON public.patient_requests FOR UPDATE TO authenticated
  USING      (public.is_doctor() AND (doctor_id = auth.uid() OR (doctor_id IS NULL AND public.is_admin())))
  WITH CHECK (public.is_doctor() AND (doctor_id = auth.uid() OR (doctor_id IS NULL AND public.is_admin())));

CREATE POLICY "doctor_delete_request" ON public.patient_requests FOR DELETE TO authenticated
  USING (public.is_doctor() AND (doctor_id = auth.uid() OR (doctor_id IS NULL AND public.is_admin())));


-- ──────────────────────────────────────────────────────────────────────
-- 6. DICAS — cada médico gerencia as suas; família vê as do médico dela
-- ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.tips') IS NOT NULL THEN
    ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES auth.users(id);
    UPDATE public.tips
       SET doctor_id = (SELECT id FROM public.profiles WHERE role = 'doctor' AND is_admin LIMIT 1)
     WHERE doctor_id IS NULL;
    ALTER TABLE public.tips ALTER COLUMN doctor_id SET DEFAULT auth.uid();

    DROP POLICY IF EXISTS "tips_doctor_all"                   ON public.tips;
    DROP POLICY IF EXISTS "tips_authenticated_read_published" ON public.tips;

    CREATE POLICY "tips_doctor_all" ON public.tips FOR ALL TO authenticated
      USING      (public.is_doctor() AND doctor_id = auth.uid())
      WITH CHECK (public.is_doctor() AND doctor_id = auth.uid());

    CREATE POLICY "tips_authenticated_read_published" ON public.tips FOR SELECT TO authenticated
      USING (is_published = true AND doctor_id IN (
        SELECT doctor_id FROM public.patients WHERE parent_id = auth.uid()
      ));
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────
-- 7. DEPOIMENTOS — conteúdo do site do administrador
-- ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.depoimentos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "depoimentos_doctor_all" ON public.depoimentos;
    DROP POLICY IF EXISTS "depoimentos_admin_all"  ON public.depoimentos;
    CREATE POLICY "depoimentos_admin_all" ON public.depoimentos FOR ALL TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;


-- ──────────────────────────────────────────────────────────────────────
-- 8. PLANOS — doctor_subscriptions
--    Só o servidor escreve (SQL Editor / webhook Hotmart com service_role).
--    Médico lê o próprio plano.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_subscriptions (
  doctor_id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                    text        NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free', 'starter', 'clinica', 'cortesia')),
  status                  text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'past_due', 'canceled')),
  current_period_end      timestamptz,
  hotmart_subscriber_code text,
  hotmart_transaction     text,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.doctor_subscriptions FROM anon, authenticated;

DROP POLICY IF EXISTS "subs_doctor_select_own" ON public.doctor_subscriptions;
CREATE POLICY "subs_doctor_select_own" ON public.doctor_subscriptions FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

-- Administrador: cortesia (ilimitado)
INSERT INTO public.doctor_subscriptions (doctor_id, plan)
SELECT id, 'cortesia' FROM public.profiles WHERE role = 'doctor' AND is_admin
ON CONFLICT (doctor_id) DO NOTHING;

-- Limite efetivo: plano pago vencido/cancelado volta ao limite do grátis
CREATE OR REPLACE FUNCTION public.doctor_patient_limit(p_doctor uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN s.plan = 'cortesia' THEN NULL
    WHEN s.plan IS NULL OR s.plan = 'free' THEN 1
    WHEN s.status <> 'active' THEN 1
    WHEN s.current_period_end IS NOT NULL AND s.current_period_end < now() THEN 1
    WHEN s.plan = 'starter' THEN 30
    WHEN s.plan = 'clinica' THEN NULL
    ELSE 1
  END
  FROM (SELECT 1) AS one
  LEFT JOIN public.doctor_subscriptions s ON s.doctor_id = p_doctor;
$$;

-- Resumo do plano para a tela do médico
CREATE OR REPLACE FUNCTION public.my_plan()
RETURNS TABLE (plan text, status text, patient_limit integer, patients_used integer, current_period_end timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(s.plan, 'free'),
         COALESCE(s.status, 'active'),
         public.doctor_patient_limit(auth.uid()),
         (SELECT count(*)::int FROM public.patients WHERE doctor_id = auth.uid()),
         s.current_period_end
    FROM (SELECT 1) AS one
    LEFT JOIN public.doctor_subscriptions s ON s.doctor_id = auth.uid()
   WHERE public.is_doctor();
$$;

REVOKE ALL ON FUNCTION public.doctor_patient_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_plan()                  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_plan() TO authenticated;

-- Limite aplicado no banco: não dá para burlar pelo navegador
CREATE OR REPLACE FUNCTION public.fn_patients_enforce_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_used  int;
BEGIN
  IF NEW.doctor_id IS NULL THEN
    RETURN NEW;  -- o NOT NULL da coluna barra depois
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('patients_limit_' || NEW.doctor_id::text));

  v_limit := public.doctor_patient_limit(NEW.doctor_id);
  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_used FROM public.patients WHERE doctor_id = NEW.doctor_id;
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Seu plano permite até % paciente(s). Faça o upgrade para cadastrar mais.', v_limit
      USING ERRCODE = 'P0001', HINT = 'PLAN_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_enforce_limit ON public.patients;
CREATE TRIGGER trg_patients_enforce_limit
  BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.fn_patients_enforce_limit();


-- ──────────────────────────────────────────────────────────────────────
-- 9. STORAGE — arquivos seguem as mesmas regras dos dados
--    Remove as políticas abertas (inclusive as 4 "ardbe8" sem filtro de
--    bucket, que liberavam QUALQUER arquivo para qualquer usuário logado)
--    e recria por bucket: médico dono do paciente / família do paciente.
--
--    Caminhos usados pelo app (pasta = id do paciente):
--      exames-pacientes   {patient}/arquivo        (privado, signed URL)
--      diario-familia     {patient}/arquivo        (privado, signed URL)
--      patient-documents  {patient}/arq · fraldas/{patient}/arq
--      fotos-refeicoes    {patient}/arquivo
--      patient-photos     {patient}/photo.ext
--      prescricoes        {patient}/arquivo
-- ──────────────────────────────────────────────────────────────────────

-- Id do paciente a partir do caminho do arquivo
CREATE OR REPLACE FUNCTION public.storage_patient_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  f   text[] := storage.foldername(p_name);
  pid text;
BEGIN
  pid := CASE WHEN f[1] = 'fraldas' THEN f[2] ELSE f[1] END;
  IF pid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN pid::uuid;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_owns_patient(p_patient uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_patient IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient AND parent_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.parent_owns_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_owns_patient(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_patient_id(text)  TO authenticated;

-- 9a. Remove políticas antigas de Storage (lista exata do export de produção)
DO $$
DECLARE
  nome text;
BEGIN
  FOREACH nome IN ARRAY ARRAY[
    'allow authenticated uploads ardbe8_0', 'allow authenticated uploads ardbe8_1',
    'allow authenticated uploads ardbe8_2', 'allow authenticated uploads ardbe8_3',
    'Authenticated users can delete patient photos', 'Authenticated users can update patient photos',
    'Authenticated users can upload patient photos', 'Public read patient photos',
    'Medicos podem ler prescricoes',
    'delete patient photos', 'read patient photos', 'update patient photos', 'upload patient photos',
    'diario_familia_doctor_select',
    'familia_select_exames_storage', 'familia_upload_exames_storage',
    'medico_delete_exames_storage', 'medico_select_exames_storage', 'medico_upload_exames_storage',
    'fotos-refeicoes: leitura publica', 'fotos-refeicoes: upload autenticado',
    'fotos: leitura', 'fotos: upload',
    'fotos_refeicoes_delete', 'fotos_refeicoes_insert', 'fotos_refeicoes_select', 'fotos_refeicoes_update',
    'meal-photos: autenticado upload', 'meal-photos: publico leitura',
    'prescricoes: autenticado total', 'prescricoes: leitura', 'prescricoes: upload',
    'prescricoes_delete', 'prescricoes_insert', 'prescricoes_select', 'prescricoes_update'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', nome);
  END LOOP;

  -- Remove também versões anteriores desta própria seção (re-execução)
  FOR nome IN SELECT policyname FROM pg_policies
               WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'ps\_%' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', nome);
  END LOOP;
END $$;

-- Buckets que devem ser privados (o app usa URL assinada neles)
UPDATE storage.buckets SET public = false WHERE id IN ('exames-pacientes', 'diario-familia');

-- 9b. Políticas novas (prefixo ps_)
-- exames-pacientes: médico dono lê/envia/apaga · família lê/envia do próprio filho
CREATE POLICY "ps_exames_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'exames-pacientes' AND (
    public.doctor_owns_patient(public.storage_patient_id(name))
    OR public.parent_owns_patient(public.storage_patient_id(name))));
CREATE POLICY "ps_exames_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exames-pacientes' AND (
    public.doctor_owns_patient(public.storage_patient_id(name))
    OR public.parent_owns_patient(public.storage_patient_id(name))));
CREATE POLICY "ps_exames_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exames-pacientes' AND public.doctor_owns_patient(public.storage_patient_id(name)));

-- diario-familia: médico dono lê só fotos de anotação compartilhada
-- (políticas da família diario_familia_parent_* continuam como estão)
CREATE POLICY "ps_diario_doctor_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'diario-familia'
    AND public.doctor_owns_patient(public.storage_patient_id(name))
    AND EXISTS (SELECT 1 FROM public.family_journal_entries e
                 WHERE e.photo_path = objects.name AND e.visibility = 'shared'));

-- prescricoes: médico dono gerencia · família lê do próprio filho
CREATE POLICY "ps_prescricoes_doctor_all" ON storage.objects FOR ALL TO authenticated
  USING      (bucket_id = 'prescricoes' AND public.doctor_owns_patient(public.storage_patient_id(name)))
  WITH CHECK (bucket_id = 'prescricoes' AND public.doctor_owns_patient(public.storage_patient_id(name)));
CREATE POLICY "ps_prescricoes_parent_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prescricoes' AND public.parent_owns_patient(public.storage_patient_id(name)));

-- patient-documents, fotos-refeicoes, patient-photos: médico dono e família do paciente
CREATE POLICY "ps_paciente_arquivos_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id IN ('patient-documents', 'fotos-refeicoes', 'patient-photos') AND (
    public.doctor_owns_patient(public.storage_patient_id(name))
    OR public.parent_owns_patient(public.storage_patient_id(name))))
  WITH CHECK (bucket_id IN ('patient-documents', 'fotos-refeicoes', 'patient-photos') AND (
    public.doctor_owns_patient(public.storage_patient_id(name))
    OR public.parent_owns_patient(public.storage_patient_id(name))));


-- ──────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
--   • Administrador: seu e-mail, plano cortesia
--   • Pacientes sem médico: 0
--   • Políticas de médico sem dono: nenhuma linha
-- ──────────────────────────────────────────────────────────────────────
SELECT 'Administrador' AS verificacao,
       u.email || ' · plano ' || COALESCE(s.plan, 'free') AS detalhe
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.doctor_subscriptions s ON s.doctor_id = p.id
 WHERE p.is_admin
UNION ALL
SELECT 'Pacientes', count(*) || ' no total · ' || count(*) FILTER (WHERE doctor_id IS NULL) || ' sem médico'
  FROM public.patients
UNION ALL
SELECT 'Política de médico sem dono', tablename || ' · ' || policyname
  FROM pg_policies
 WHERE schemaname = 'public'
   AND qual LIKE '%role = ''doctor''%'
   AND qual NOT LIKE '%doctor_owns_patient%'
   AND qual NOT LIKE '%doctor_id%'
UNION ALL
SELECT 'Política aberta (true)', schemaname || '.' || tablename || ' · ' || policyname
  FROM pg_policies
 WHERE schemaname IN ('public', 'storage') AND (qual = 'true' OR with_check = 'true')
UNION ALL
SELECT 'Storage sem filtro de dono', policyname || ' · ' || cmd
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
   AND COALESCE(qual, '') || COALESCE(with_check, '') NOT LIKE '%owns_patient%'
   AND COALESCE(qual, '') || COALESCE(with_check, '') NOT LIKE '%parent_id = auth.uid()%'
UNION ALL
SELECT 'Bucket', id || CASE WHEN public THEN ' · público (URL aberta)' ELSE ' · privado' END
  FROM storage.buckets;
