-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Curvas de crescimento: idade gestacional no paciente
-- Execute inteiro no Supabase: SQL Editor → New query → Run
-- Pré-requisito: multi-medico-freemium-migration.sql já aplicada.
-- Idempotente: pode ser executado mais de uma vez.
--
--   1. patients.gestational_age_weeks (22–44) e gestational_age_days (0–6)
--      → define se a criança usa a curva de prematuros (INTERGROWTH-21st)
--        e o cálculo da idade corrigida
--   2. Só o médico altera a idade gestacional (dado clínico); a família vê
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regprocedure('public.is_doctor()') IS NULL THEN
    RAISE EXCEPTION 'Rode antes a multi-medico-freemium-migration.sql.';
  END IF;
END $$;

-- 1. Colunas
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS gestational_age_weeks smallint;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS gestational_age_days  smallint;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_ga_weeks_range') THEN
    ALTER TABLE public.patients ADD CONSTRAINT patients_ga_weeks_range
      CHECK (gestational_age_weeks IS NULL OR gestational_age_weeks BETWEEN 22 AND 44);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_ga_days_range') THEN
    ALTER TABLE public.patients ADD CONSTRAINT patients_ga_days_range
      CHECK (gestational_age_days IS NULL OR gestational_age_days BETWEEN 0 AND 6);
  END IF;
END $$;

COMMENT ON COLUMN public.patients.gestational_age_weeks IS 'Idade gestacional ao nascer (semanas completas). Só o médico altera.';
COMMENT ON COLUMN public.patients.gestational_age_days  IS 'Dias além das semanas completas (0–6). Só o médico altera.';

-- 2. Só o médico altera (família e SQL de outros perfis mantêm o valor anterior)
CREATE OR REPLACE FUNCTION public.fn_patients_guard_ga()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_doctor() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.gestational_age_weeks := NULL;
      NEW.gestational_age_days  := NULL;
    ELSE
      NEW.gestational_age_weeks := OLD.gestational_age_weeks;
      NEW.gestational_age_days  := OLD.gestational_age_days;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_guard_ga ON public.patients;
CREATE TRIGGER trg_patients_guard_ga
  BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.fn_patients_guard_ga();


-- VERIFICAÇÃO
SELECT 'Coluna' AS verificacao, column_name || ' · ' || data_type AS detalhe
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'patients'
   AND column_name IN ('gestational_age_weeks', 'gestational_age_days')
UNION ALL
SELECT 'Proteção', CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_patients_guard_ga')
                        THEN 'só o médico altera ✓' ELSE 'FALTANDO' END;
