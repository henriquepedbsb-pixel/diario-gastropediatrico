-- ============================================================
-- Diário Gastropediátrico — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. PACIENTES
create table if not exists public.pacientes (
  id                              uuid primary key default gen_random_uuid(),
  nome                            text        not null,
  data_nascimento                 date        not null,
  sexo                            text        check (sexo in ('M', 'F')),
  nome_mae                        text,
  nome_pai                        text,
  telefone                        text,
  -- Dados do nascimento
  peso_nascimento                 numeric(7,1),   -- gramas
  comprimento_nascimento          numeric(5,1),   -- cm
  idade_gestacional               integer,        -- semanas
  perimetro_cefalico_nascimento   numeric(5,1),   -- cm
  tipo_parto                      text        check (tipo_parto in ('normal','cesarea','forceps')),
  apgar_1min                      integer     check (apgar_1min between 0 and 10),
  apgar_5min                      integer     check (apgar_5min between 0 and 10),
  -- Histórico clínico
  alergias                        text,
  observacoes                     text,
  created_at                      timestamptz default now(),
  updated_at                      timestamptz default now()
);

-- 2. MEDIDAS ANTROPOMÉTRICAS (consultas de crescimento)
create table if not exists public.medidas (
  id                  uuid primary key default gen_random_uuid(),
  paciente_id         uuid references public.pacientes(id) on delete cascade not null,
  data                date        not null,
  peso                numeric(5,2),    -- kg
  comprimento         numeric(5,1),    -- cm
  perimetro_cefalico  numeric(5,1),    -- cm
  observacoes         text,
  created_at          timestamptz default now()
);

-- 3. DIÁRIO ALIMENTAR
create table if not exists public.diario_alimentar (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid references public.pacientes(id) on delete cascade not null,
  data_hora       timestamptz not null,
  tipo_refeicao   text        not null
                  check (tipo_refeicao in (
                    'leite_materno','formula','papinha_salgada',
                    'papinha_fruta','lanche','refeicao_familia','outro'
                  )),
  alimentos       text,
  quantidade      text,
  aceitacao       text        check (aceitacao in ('boa','parcial','recusou')),
  observacoes     text,
  created_at      timestamptz default now()
);

-- 4. DIÁRIO DE FEZES (Escala de Bristol)
create table if not exists public.diario_fezes (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid references public.pacientes(id) on delete cascade not null,
  data_hora       timestamptz not null,
  escala_bristol  integer     check (escala_bristol between 1 and 7),
  cor             text        check (cor in ('amarela','verde','marrom','preta','vermelha','bege_branca')),
  sangue          boolean     default false,
  muco            boolean     default false,
  quantidade      text        check (quantidade in ('pequena','media','grande')),
  observacoes     text,
  created_at      timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_medidas_paciente        on public.medidas(paciente_id, data desc);
create index if not exists idx_diario_alimentar_paciente on public.diario_alimentar(paciente_id, data_hora desc);
create index if not exists idx_diario_fezes_paciente   on public.diario_fezes(paciente_id, data_hora desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- (Para uso em produção — ative após configurar autenticação)
-- ============================================================
-- alter table public.pacientes       enable row level security;
-- alter table public.medidas         enable row level security;
-- alter table public.diario_alimentar enable row level security;
-- alter table public.diario_fezes    enable row level security;

-- Por enquanto, acesso público (para desenvolvimento):
-- Certifique-se de que o projeto Supabase está configurado
-- com as tabelas acessíveis pelo anon key.
