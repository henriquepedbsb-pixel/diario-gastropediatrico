-- ============================================================
-- Migração: tabelas para as novas abas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Sintomas
create table if not exists public.symptom_records (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references public.patients(id) on delete cascade not null,
  recorded_at timestamptz not null,
  symptoms    text[]      not null default '{}',
  severity    integer     check (severity between 1 and 3),
  fever_temp  numeric(4,1),
  notes       text,
  created_by  uuid,
  created_at  timestamptz default now()
);

-- Sono
create table if not exists public.sleep_records (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid references public.patients(id) on delete cascade not null,
  sleep_start      timestamptz not null,
  sleep_end        timestamptz,
  duration_minutes integer,
  quality          text check (quality in ('bom', 'regular', 'ruim')),
  notes            text,
  created_by       uuid,
  created_at       timestamptz default now()
);

-- Amamentação
create table if not exists public.breastfeeding_records (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid references public.patients(id) on delete cascade not null,
  started_at       timestamptz not null,
  duration_minutes integer,
  side             text check (side in ('esquerdo', 'direito', 'ambos', 'formula')),
  notes            text,
  created_by       uuid,
  created_at       timestamptz default now()
);

-- Documentos
create table if not exists public.patient_documents (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references public.patients(id) on delete cascade not null,
  title       text not null,
  file_url    text,
  file_type   text,
  category    text check (category in ('exame', 'laudo', 'receita', 'outro')),
  notes       text,
  uploaded_by uuid,
  created_at  timestamptz default now()
);

-- Índices
create index if not exists idx_symptom_records_patient    on public.symptom_records(patient_id, recorded_at desc);
create index if not exists idx_sleep_records_patient      on public.sleep_records(patient_id, sleep_start desc);
create index if not exists idx_breastfeeding_patient      on public.breastfeeding_records(patient_id, started_at desc);
create index if not exists idx_patient_documents_patient  on public.patient_documents(patient_id, created_at desc);

-- RLS (habilite se necessário, igual às outras tabelas)
-- alter table public.symptom_records      enable row level security;
-- alter table public.sleep_records        enable row level security;
-- alter table public.breastfeeding_records enable row level security;
-- alter table public.patient_documents    enable row level security;
