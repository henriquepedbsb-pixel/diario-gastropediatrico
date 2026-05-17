-- ============================================================
-- RLS para as tabelas das novas abas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- symptom_records
ALTER TABLE symptom_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "symptom_doctor_all"
  ON symptom_records FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE POLICY "symptom_parent_all"
  ON symptom_records FOR ALL
  USING (patient_id IN (SELECT id FROM patients WHERE parent_id = auth.uid()));

-- sleep_records
ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sleep_doctor_all"
  ON sleep_records FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE POLICY "sleep_parent_all"
  ON sleep_records FOR ALL
  USING (patient_id IN (SELECT id FROM patients WHERE parent_id = auth.uid()));

-- breastfeeding_records
ALTER TABLE breastfeeding_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "breastfeeding_doctor_all"
  ON breastfeeding_records FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE POLICY "breastfeeding_parent_all"
  ON breastfeeding_records FOR ALL
  USING (patient_id IN (SELECT id FROM patients WHERE parent_id = auth.uid()));

-- patient_documents
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_doctor_all"
  ON patient_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE POLICY "documents_parent_all"
  ON patient_documents FOR ALL
  USING (patient_id IN (SELECT id FROM patients WHERE parent_id = auth.uid()));
