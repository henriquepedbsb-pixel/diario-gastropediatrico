-- ============================================================
-- AUTH SCHEMA — Execute DEPOIS do schema.sql principal
-- ============================================================

-- 1. TABELA DE PERFIS (vinculada ao auth.users)
create table if not exists public.profiles (
  id        uuid references auth.users(id) on delete cascade primary key,
  role      text not null check (role in ('medico', 'pai')),
  nome      text not null,
  telefone  text,
  created_at timestamptz default now()
);

-- 2. COLUNA parent_id na tabela pacientes
alter table public.pacientes
  add column if not exists parent_id uuid references public.profiles(id) on delete set null;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.pacientes         enable row level security;
alter table public.medidas           enable row level security;
alter table public.diario_alimentar  enable row level security;
alter table public.diario_fezes      enable row level security;

-- ── profiles ──
create policy "profiles: lê o próprio"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insere o próprio"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: atualiza o próprio"
  on public.profiles for update
  using (auth.uid() = id);

-- médico lê todos os perfis
create policy "profiles: médico lê todos"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  );

-- ── pacientes ──
create policy "pacientes: médico faz tudo"
  on public.pacientes for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  );

create policy "pacientes: pai lê o próprio filho"
  on public.pacientes for select
  using (parent_id = auth.uid());

create policy "pacientes: pai insere o próprio filho"
  on public.pacientes for insert
  with check (parent_id = auth.uid());

-- ── medidas ──
create policy "medidas: médico faz tudo"
  on public.medidas for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  );

create policy "medidas: pai lê do próprio filho"
  on public.medidas for select
  using (
    exists (select 1 from public.pacientes pt where pt.id = paciente_id and pt.parent_id = auth.uid())
  );

-- ── diario_alimentar ──
create policy "alimentar: médico faz tudo"
  on public.diario_alimentar for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  );

create policy "alimentar: pai faz tudo no próprio filho"
  on public.diario_alimentar for all
  using (
    exists (select 1 from public.pacientes pt where pt.id = paciente_id and pt.parent_id = auth.uid())
  )
  with check (
    exists (select 1 from public.pacientes pt where pt.id = paciente_id and pt.parent_id = auth.uid())
  );

-- ── diario_fezes ──
create policy "fezes: médico faz tudo"
  on public.diario_fezes for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'medico')
  );

create policy "fezes: pai faz tudo no próprio filho"
  on public.diario_fezes for all
  using (
    exists (select 1 from public.pacientes pt where pt.id = paciente_id and pt.parent_id = auth.uid())
  )
  with check (
    exists (select 1 from public.pacientes pt where pt.id = paciente_id and pt.parent_id = auth.uid())
  );
