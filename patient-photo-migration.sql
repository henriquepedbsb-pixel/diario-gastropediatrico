-- ═══════════════════════════════════════════════════════════════
--  MIGRAÇÃO: foto do paciente
--  Execute no SQL Editor do Supabase (Settings → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- 1. Adiciona coluna photo_url na tabela patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Confirma
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patients' AND column_name = 'photo_url';
