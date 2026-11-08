-- ══════════════════════════════════════════════════════════════════════
-- PEDDIÁRIO — "Meu Diário" (anotações livres da família)
-- Execute inteiro no Supabase: SQL Editor → New query → Run
-- Pode ser executado mais de uma vez sem erro (idempotente).
--
-- Cria:
--   1. Tabela family_journal_entries
--   2. Triggers de proteção (created_by, campos do médico, updated_at)
--   3. Trigger de atividade (avisa o médico só de anotação compartilhada)
--   4. RLS — família: só o próprio filho · médico: só anotações compartilhadas
--   5. Bucket privado diario-familia (fotos) + políticas de Storage
-- ══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- 0. GARANTIA — colunas de atividade usadas pelo painel do médico
--    (já existem no projeto; IF NOT EXISTS evita erro se faltar alguma)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS last_activity_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_label text;


-- ──────────────────────────────────────────────────────────────────────
-- 1. TABELA
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_journal_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  entry_at      timestamptz NOT NULL DEFAULT now(),
  content       text        NOT NULL
                CHECK (char_length(btrim(content)) BETWEEN 1 AND 5000),
  tag           text        NOT NULL DEFAULT 'observacao'
                CHECK (tag IN ('observacao', 'duvida', 'marco', 'rotina')),

  -- "Perguntar na próxima consulta"
  ask_at_visit  boolean     NOT NULL DEFAULT false,

  -- shared = o médico vê · private = só quem escreveu vê
  visibility    text        NOT NULL DEFAULT 'shared'
                CHECK (visibility IN ('shared', 'private')),

  -- Lembrete simples por data (exibido no app; push virá depois)
  remind_on     date,
  reminder_done boolean     NOT NULL DEFAULT false,

  -- Caminho no bucket privado diario-familia: {patient_id}/{uuid}.{ext}
  photo_path    text,

  -- Preenchidos somente pelo médico ("conversado na consulta")
  discussed_at  timestamptz,
  discussed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.family_journal_entries IS
  'Meu Diário — anotações livres da família. Não é canal de urgência.';

-- Dúvida para a consulta precisa ser compartilhada (senão o médico não a veria)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fje_ask_requires_shared'
      AND conrelid = 'public.family_journal_entries'::regclass
  ) THEN
    ALTER TABLE public.family_journal_entries
      ADD CONSTRAINT fje_ask_requires_shared
      CHECK (NOT (ask_at_visit AND visibility = 'private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fje_patient_entry
  ON public.family_journal_entries (patient_id, entry_at DESC);

CREATE INDEX IF NOT EXISTS idx_fje_pending_questions
  ON public.family_journal_entries (patient_id)
  WHERE ask_at_visit = true AND discussed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fje_reminders
  ON public.family_journal_entries (patient_id, remind_on)
  WHERE remind_on IS NOT NULL AND reminder_done = false;


-- ──────────────────────────────────────────────────────────────────────
-- 2. TRIGGERS DE PROTEÇÃO
--    INSERT: created_by = quem está logado; campos do médico vazios.
--    UPDATE: id/paciente/autor/criação imutáveis.
--            Família não mexe em discussed_*.
--            Médico só mexe em discussed_* (nada do texto da família).
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_fje_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_by   := COALESCE(auth.uid(), NEW.created_by);
  NEW.discussed_at := NULL;
  NEW.discussed_by := NULL;
  NEW.created_at   := now();
  NEW.updated_at   := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_fje_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_doctor boolean;
BEGIN
  v_is_doctor := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'doctor'
  );

  -- Imutáveis para todos
  NEW.id         := OLD.id;
  NEW.patient_id := OLD.patient_id;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;

  IF v_is_doctor THEN
    -- Médico não altera nada do que a família escreveu
    NEW.entry_at      := OLD.entry_at;
    NEW.content       := OLD.content;
    NEW.tag           := OLD.tag;
    NEW.ask_at_visit  := OLD.ask_at_visit;
    NEW.visibility    := OLD.visibility;
    NEW.remind_on     := OLD.remind_on;
    NEW.reminder_done := OLD.reminder_done;
    NEW.photo_path    := OLD.photo_path;

    -- Marcar / desmarcar "conversado na consulta"
    IF NEW.discussed_at IS NULL THEN
      NEW.discussed_by := NULL;
    ELSIF OLD.discussed_at IS NULL THEN
      NEW.discussed_by := auth.uid();
    ELSE
      NEW.discussed_at := OLD.discussed_at;
      NEW.discussed_by := OLD.discussed_by;
    END IF;
  ELSE
    -- Família não altera os campos do médico
    NEW.discussed_at := OLD.discussed_at;
    NEW.discussed_by := OLD.discussed_by;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fje_before_insert ON public.family_journal_entries;
CREATE TRIGGER trg_fje_before_insert
  BEFORE INSERT ON public.family_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_fje_before_insert();

DROP TRIGGER IF EXISTS trg_fje_before_update ON public.family_journal_entries;
CREATE TRIGGER trg_fje_before_update
  BEFORE UPDATE ON public.family_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_fje_before_update();


-- ──────────────────────────────────────────────────────────────────────
-- 3. ATIVIDADE PARA O MÉDICO
--    Só anotação COMPARTILHADA acende o aviso no painel.
--    Anotação privada não gera nenhum sinal para o médico.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_fje_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility = 'shared' THEN
    UPDATE public.patients
       SET last_activity_at    = now(),
           last_activity_label = 'Nova anotação no diário'
     WHERE id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fje_activity ON public.family_journal_entries;
CREATE TRIGGER trg_fje_activity
  AFTER INSERT ON public.family_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_fje_activity();


-- ──────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.family_journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fje_parent_select" ON public.family_journal_entries;
DROP POLICY IF EXISTS "fje_parent_insert" ON public.family_journal_entries;
DROP POLICY IF EXISTS "fje_parent_update" ON public.family_journal_entries;
DROP POLICY IF EXISTS "fje_parent_delete" ON public.family_journal_entries;
DROP POLICY IF EXISTS "fje_doctor_select" ON public.family_journal_entries;
DROP POLICY IF EXISTS "fje_doctor_update" ON public.family_journal_entries;

-- Família lê: anotações do próprio filho (compartilhadas + as privadas que ela mesma escreveu)
CREATE POLICY "fje_parent_select"
  ON public.family_journal_entries FOR SELECT TO authenticated
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid())
    AND (visibility = 'shared' OR created_by = auth.uid())
  );

-- Família escreve: somente no próprio filho, como autora
CREATE POLICY "fje_parent_insert"
  ON public.family_journal_entries FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid())
  );

-- Família edita / apaga: somente o que ela mesma escreveu
CREATE POLICY "fje_parent_update"
  ON public.family_journal_entries FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    AND patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    AND patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid())
  );

CREATE POLICY "fje_parent_delete"
  ON public.family_journal_entries FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND patient_id IN (SELECT id FROM public.patients WHERE parent_id = auth.uid())
  );

-- Médico lê: somente anotações COMPARTILHADAS
CREATE POLICY "fje_doctor_select"
  ON public.family_journal_entries FOR SELECT TO authenticated
  USING (
    visibility = 'shared'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Médico atualiza: somente compartilhadas (o trigger limita a discussed_*)
CREATE POLICY "fje_doctor_update"
  ON public.family_journal_entries FOR UPDATE TO authenticated
  USING (
    visibility = 'shared'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
  )
  WITH CHECK (
    visibility = 'shared'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- (Sem INSERT/DELETE para médico: o diário é da família.)


-- ──────────────────────────────────────────────────────────────────────
-- 5. STORAGE — bucket privado diario-familia
--    Caminho: {patient_id}/{uuid}.{ext}  · acesso só por signed URL
--    Família: envia/lê/apaga fotos do próprio filho.
--    Médico: lê somente fotos ligadas a anotação compartilhada.
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diario-familia', 'diario-familia', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = false,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "diario_familia_parent_select" ON storage.objects;
DROP POLICY IF EXISTS "diario_familia_parent_insert" ON storage.objects;
DROP POLICY IF EXISTS "diario_familia_parent_delete" ON storage.objects;
DROP POLICY IF EXISTS "diario_familia_doctor_select" ON storage.objects;

CREATE POLICY "diario_familia_parent_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'diario-familia'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.patients WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "diario_familia_parent_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'diario-familia'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.patients WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "diario_familia_parent_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'diario-familia'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.patients WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "diario_familia_doctor_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'diario-familia'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
    AND EXISTS (
      SELECT 1 FROM public.family_journal_entries e
      WHERE e.photo_path = objects.name
        AND e.visibility = 'shared'
    )
  );


-- ──────────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL — deve listar 6 políticas na tabela + 4 no storage
-- ──────────────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, cmd AS operacao
FROM pg_policies
WHERE (schemaname = 'public'  AND tablename = 'family_journal_entries')
   OR (schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'diario_familia_%')
ORDER BY schemaname, policyname;
