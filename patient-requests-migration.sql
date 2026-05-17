-- ═══════════════════════════════════════════════════════════════
--  MIGRAÇÃO: patient_requests
--  Execute no SQL Editor do Supabase (Settings → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- 1. Cria a tabela
CREATE TABLE IF NOT EXISTS patient_requests (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_name     text,
  parent_email    text,
  child_name      text        NOT NULL,
  child_birthdate date,
  child_gender    text        CHECK (child_gender IN ('M','F')),
  notes           text,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  created_at      timestamptz DEFAULT now(),
  reviewed_at     timestamptz
);

-- 2. Ativa RLS
ALTER TABLE patient_requests ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
--    Responsável: inserir próprias solicitações e visualizar as suas
CREATE POLICY "parent_insert_own_request"
  ON patient_requests FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "parent_select_own_request"
  ON patient_requests FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

--    Médico: aprovar / rejeitar (UPDATE) e excluir
CREATE POLICY "doctor_update_request"
  ON patient_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

CREATE POLICY "doctor_delete_request"
  ON patient_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- 4. Índices úteis
CREATE INDEX IF NOT EXISTS patient_requests_parent_id_idx ON patient_requests(parent_id);
CREATE INDEX IF NOT EXISTS patient_requests_status_idx    ON patient_requests(status);

-- 5. Confirma
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'patient_requests';
