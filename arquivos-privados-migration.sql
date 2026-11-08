-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — Fotos e documentos privados
-- ⚠️ RODE SÓ DEPOIS DO MERGE do PR "arquivos privados" e do deploy da Vercel.
--    (o app novo usa links temporários; o antigo depende do link público)
-- Pré-requisito: multi-medico-freemium-migration.sql já aplicada.
-- Idempotente: pode ser executado mais de uma vez.
--
--   1. storage_patient_id aceita o id do paciente na 1ª OU 2ª pasta
--      (cobre "fraldas/<id>/…" e caminhos antigos tipo "exame/<id>/…")
--   2. Buckets que ainda eram públicos passam a privados:
--      patient-documents · fotos-refeicoes · patient-photos · prescricoes
--      (+ buckets antigos sem uso: meal-photos)
--   3. Relatório: arquivos cujo caminho não identifica o paciente
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regprocedure('public.storage_patient_id(text)') IS NULL THEN
    RAISE EXCEPTION 'Rode antes a multi-medico-freemium-migration.sql.';
  END IF;
END $$;

-- 1. Id do paciente: primeira pasta com formato de UUID (1ª ou 2ª)
CREATE OR REPLACE FUNCTION public.storage_patient_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  f  text[] := storage.foldername(p_name);
  re text   := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  IF f[1] ~* re THEN RETURN f[1]::uuid; END IF;
  IF f[2] ~* re THEN RETURN f[2]::uuid; END IF;
  RETURN NULL;
END;
$$;

-- 2. Buckets privados (acesso só por URL assinada, respeitando as políticas ps_*)
UPDATE storage.buckets
   SET public = false
 WHERE id IN ('patient-documents', 'fotos-refeicoes', 'patient-photos', 'prescricoes', 'meal-photos');


-- 3. VERIFICAÇÃO
--   • "Bucket": todos devem aparecer como privado
--   • "Arquivo sem paciente no caminho": arquivos antigos que ninguém mais
--     consegue abrir pelo app. Se aparecerem, me mande a lista antes de apagar.
SELECT 'Bucket' AS verificacao,
       id || CASE WHEN public THEN ' · PÚBLICO' ELSE ' · privado' END AS detalhe
  FROM storage.buckets
UNION ALL
SELECT 'Arquivo sem paciente no caminho',
       bucket_id || ' · ' || count(*) || ' arquivo(s) · ex.: ' || min(name)
  FROM storage.objects
 WHERE bucket_id IN ('patient-documents', 'fotos-refeicoes', 'patient-photos', 'prescricoes',
                     'exames-pacientes', 'diario-familia')
   AND public.storage_patient_id(name) IS NULL
 GROUP BY bucket_id;
