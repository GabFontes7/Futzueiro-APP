-- FUTZUEIRO · votação até 3 picks + fecha em 12h + craque dia/mês/ano
-- Rode no SQL Editor do Supabase

-- Fecha automática: timestamp de encerramento
alter table matches
  add column if not exists voting_closes_at timestamptz;

-- Atualiza jogos abertos antigos (fecha em 12h a partir de played_at)
update matches
set voting_closes_at = played_at + interval '12 hours'
where voting_closes_at is null;

-- Votos: 1 linha por usuário/aparelho com até 3 escolhas
alter table votes add column if not exists user_id uuid;
alter table votes add column if not exists picks jsonb not null default '[]'::jsonb;

-- player_id antigo pode ficar null em novos votos (usamos picks)
alter table votes alter column player_id drop not null;

-- Um voto por conta logada (quando user_id preenchido)
create unique index if not exists votes_match_user_uidx
  on votes (match_id, user_id)
  where user_id is not null;

-- Premiações salvas (dia / mês / ano)
create table if not exists awards (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('day', 'month', 'year')),
  period_key text not null, -- day: 2026-08-06 | month: 2026-08 | year: 2026
  match_id uuid references matches (id) on delete set null,
  player_id text not null,
  player_name text not null,
  points numeric(10, 4) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists awards_day_uidx
  on awards (kind, period_key, player_id, match_id)
  where kind = 'day';

create unique index if not exists awards_period_uidx
  on awards (kind, period_key, player_id)
  where kind in ('month', 'year');

create index if not exists awards_kind_period_idx on awards (kind, period_key);

alter table awards enable row level security;
drop policy if exists "awards_all" on awards;
create policy "awards_all" on awards for all using (true) with check (true);

-- Pontos acumulados por mês (soma das escolhas do dia)
create table if not exists monthly_scores (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null check (month between 1 and 12),
  player_id text not null,
  player_name text not null,
  points numeric(10, 4) not null default 0,
  updated_at timestamptz not null default now(),
  unique (year, month, player_id)
);

alter table monthly_scores enable row level security;
drop policy if exists "monthly_scores_all" on monthly_scores;
create policy "monthly_scores_all" on monthly_scores for all using (true) with check (true);
