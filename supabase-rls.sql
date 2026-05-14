-- ══════════════════════════════════════════════════════════════════════
-- DIÁRIO GASTROPEDIÁTRICO — Script completo de RLS + Storage
-- Execute inteiro no Supabase: Database → SQL Editor → New query
-- ══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- 0. LIMPA POLÍTICAS EXISTENTES (evita conflito ao re-executar)
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','patients','meals',
        'stool_records','growth_records','prescriptions','tips'
      )
  ) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END $$;

-- Limpa também as storage policies que vamos recriar
DROP POLICY IF EXISTS "fotos_refeicoes_select"  ON storage.objects;
DROP POLICY IF EXISTS "fotos_refeicoes_insert"  ON storage.objects;
DROP POLICY IF EXISTS "fotos_refeicoes_update"  ON storage.objects;
DROP POLICY IF EXISTS "fotos_refeicoes_delete"  ON storage.objects;
DROP POLICY IF EXISTS "prescricoes_select"      ON storage.objects;
DROP POLICY IF EXISTS "prescricoes_insert"      ON storage.objects;
DROP POLICY IF EXISTS "prescricoes_update"      ON storage.objects;
DROP POLICY IF EXISTS "prescricoes_delete"      ON storage.objects;


-- ──────────────────────────────────────────────────────────────────────
-- 1. PROFILES
--    Cada usuário acessa apenas o próprio perfil.
--    INSERT necessário para auto-criação no AuthContext.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ──────────────────────────────────────────────────────────────────────
-- 2. PATIENTS
--    Médico: acesso total.
--    Pai: lê o próprio paciente (já vinculado OU e-mail pendente).
--    Pai: pode fazer UPDATE para se auto-vincular.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Médico tem acesso total (SELECT / INSERT / UPDATE / DELETE)
CREATE POLICY "patients_doctor_all"
  ON patients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Pai lê: paciente já vinculado ao uid OU com e-mail pendente
CREATE POLICY "patients_parent_select"
  ON patients FOR SELECT
  USING (
    parent_id = auth.uid()
    OR (
      parent_id IS NULL
      AND lower(parent_email) = lower(auth.email())
    )
  );

-- Pai pode se auto-vincular via UPDATE (quando parent_email bate)
CREATE POLICY "patients_parent_link"
  ON patients FOR UPDATE
  USING (
    parent_id = auth.uid()
    OR (
      parent_id IS NULL
      AND lower(parent_email) = lower(auth.email())
    )
  )
  WITH CHECK (
    parent_id = auth.uid()
  );


-- ──────────────────────────────────────────────────────────────────────
-- 3. MEALS
--    Médico: acesso total.
--    Pai: acesso total às refeições do próprio paciente.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meals_doctor_all"
  ON meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

CREATE POLICY "meals_parent_all"
  ON meals FOR ALL
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE parent_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────────────
-- 4. STOOL_RECORDS
--    Médico: acesso total.
--    Pai: acesso total aos registros do próprio paciente.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE stool_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stool_doctor_all"
  ON stool_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

CREATE POLICY "stool_parent_all"
  ON stool_records FOR ALL
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE parent_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────────────
-- 5. GROWTH_RECORDS
--    Médico: acesso total.
--    Pai: somente leitura (não registra medições).
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE growth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "growth_doctor_all"
  ON growth_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

CREATE POLICY "growth_parent_select"
  ON growth_records FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE parent_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────────────
-- 6. PRESCRIPTIONS
--    Médico: acesso total.
--    Pai: lê apenas prescrições ativas do próprio paciente.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescriptions_doctor_all"
  ON prescriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

CREATE POLICY "prescriptions_parent_select_active"
  ON prescriptions FOR SELECT
  USING (
    is_active = true
    AND patient_id IN (
      SELECT id FROM patients WHERE parent_id = auth.uid()
    )
  );


-- ──────────────────────────────────────────────────────────────────────
-- 7. TIPS (Dicas & Orientações)
--    Médico: acesso total (cria, edita, exclui, publica).
--    Qualquer usuário autenticado: lê apenas dicas publicadas.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_doctor_all"
  ON tips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Pai (e qualquer autenticado) lê dicas publicadas
CREATE POLICY "tips_authenticated_read_published"
  ON tips FOR SELECT
  USING (is_published = true);


-- ──────────────────────────────────────────────────────────────────────
-- 8. STORAGE — bucket fotos-refeicoes
--    Público para leitura.
--    Qualquer usuário autenticado pode fazer upload e deletar.
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-refeicoes', 'fotos-refeicoes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública (sem autenticação, necessário para exibir fotos)
CREATE POLICY "fotos_refeicoes_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-refeicoes');

-- Upload: qualquer usuário autenticado
CREATE POLICY "fotos_refeicoes_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fotos-refeicoes'
    AND auth.role() = 'authenticated'
  );

-- Update: qualquer usuário autenticado
CREATE POLICY "fotos_refeicoes_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fotos-refeicoes'
    AND auth.role() = 'authenticated'
  );

-- Delete: qualquer usuário autenticado
CREATE POLICY "fotos_refeicoes_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fotos-refeicoes'
    AND auth.role() = 'authenticated'
  );


-- ──────────────────────────────────────────────────────────────────────
-- 9. STORAGE — bucket prescricoes
--    Público para leitura.
--    Upload/delete: somente médico.
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescricoes', 'prescricoes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública
CREATE POLICY "prescricoes_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prescricoes');

-- Upload: somente médico
CREATE POLICY "prescricoes_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prescricoes'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Update: somente médico
CREATE POLICY "prescricoes_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'prescricoes'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Delete: somente médico
CREATE POLICY "prescricoes_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'prescricoes'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );


-- ──────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL — lista todas as políticas criadas
-- ──────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd       AS operacao,
  qual      AS using_clause
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND tablename IN (
    'profiles','patients','meals','stool_records',
    'growth_records','prescriptions','tips','objects'
  )
ORDER BY schemaname, tablename, policyname;
