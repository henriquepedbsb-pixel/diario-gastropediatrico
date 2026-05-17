-- ============================================================
-- Notificações de atividade do responsável para o médico
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona colunas de controle na tabela patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS last_activity_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_doctor_seen_at timestamptz;

-- 2. Função que atualiza last_activity_at automaticamente
CREATE OR REPLACE FUNCTION fn_update_patient_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE patients
  SET last_activity_at = NOW()
  WHERE id = NEW.patient_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Triggers em todas as tabelas de dados do paciente

DROP TRIGGER IF EXISTS trg_meals_activity             ON meals;
DROP TRIGGER IF EXISTS trg_stool_activity             ON stool_records;
DROP TRIGGER IF EXISTS trg_symptom_activity           ON symptom_records;
DROP TRIGGER IF EXISTS trg_sleep_activity             ON sleep_records;
DROP TRIGGER IF EXISTS trg_breastfeeding_activity     ON breastfeeding_records;
DROP TRIGGER IF EXISTS trg_documents_activity         ON patient_documents;
DROP TRIGGER IF EXISTS trg_growth_activity            ON growth_records;

CREATE TRIGGER trg_meals_activity
  AFTER INSERT ON meals
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_activity();

CREATE TRIGGER trg_stool_activity
  AFTER INSERT ON stool_records
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_activity();

CREATE TRIGGER trg_symptom_activity
  AFTER INSERT ON symptom_records
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_activity();

CREATE TRIGGER trg_sleep_activity
  AFTER INSERT ON sleep_records
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_activity();

CREATE TRIGGER trg_breastfeeding_activity
  AFTER INSERT ON breastfeeding_records
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_activity();

CREATE TRIGGER trg_documents_activity
  AFTER INSERT ON patient_documents
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_activity();

CREATE TRIGGER trg_growth_activity
  AFTER INSERT ON growth_records
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_activity();
