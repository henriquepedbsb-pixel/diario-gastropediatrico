-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Paciente sem responsável até a família aceitar o convite
-- Execute no Supabase: SQL Editor → New query → Run (idempotente)
--
-- Com o vínculo somente por convite, o médico cadastra o paciente ANTES
-- de a família entrar. A coluna patients.parent_id estava NOT NULL em
-- produção, o que impedia o cadastro ("null value in column parent_id").
--
-- Seguro: todas as políticas da família exigem parent_id = auth.uid();
-- um paciente com parent_id nulo só é visível para o médico dono.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.patients ALTER COLUMN parent_id DROP NOT NULL;

-- VERIFICAÇÃO — deve mostrar "YES"
SELECT 'patients.parent_id aceita nulo' AS verificacao, is_nullable AS detalhe
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'parent_id';
