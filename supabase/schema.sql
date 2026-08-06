-- FUTZUEIRO-APP · schema Supabase (fonte única da verdade)
-- Rode no SQL Editor do projeto. Depois: Database → Replication → habilite Realtime nas tabelas.

-- ─── Jogadores ───────────────────────────────────────────
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  overall integer not null check (overall between 50 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Sessão do racha do dia (singleton) ──────────────────
create table if not exists racha_session (
  id text primary key default 'current' check (id = 'current'),
  present_ids text[] not null default '{}',
  mode text not null default '5x5',
  current_draw jsonb,
  pack_opening_completed_draw_id text,
  updated_at timestamptz not null default now()
);

insert into racha_session (id)
values ('current')
on conflict (id) do nothing;

-- ─── Partidas / histórico / votação ──────────────────────
create table if not exists matches (
  id uuid primary key,
  game_number integer not null unique,
  played_at timestamptz not null,
  mode text not null,
  teams jsonb not null default '{}'::jsonb,
  proximos jsonb not null default '[]'::jsonb,
  team_averages jsonb not null default '{}'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  candidates jsonb not null default '[]'::jsonb,
  voting_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- Upgrade se matches já existia sem estas colunas
alter table matches add column if not exists team_averages jsonb not null default '{}'::jsonb;
alter table matches add column if not exists assignments jsonb not null default '[]'::jsonb;

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  device_id text not null,
  player_id text not null,
  created_at timestamptz not null default now(),
  unique (match_id, device_id)
);

create table if not exists golden_ball_points (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  player_id text not null,
  player_name text not null,
  points numeric(10, 4) not null,
  year integer not null,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists votes_match_id_idx on votes (match_id);
create index if not exists golden_ball_year_idx on golden_ball_points (year);
create index if not exists matches_game_number_idx on matches (game_number desc);

-- ─── RLS (clube / diversão: anon read+write) ─────────────
alter table players enable row level security;
alter table racha_session enable row level security;
alter table matches enable row level security;
alter table votes enable row level security;
alter table golden_ball_points enable row level security;

drop policy if exists "players_all" on players;
create policy "players_all" on players for all using (true) with check (true);

drop policy if exists "session_all" on racha_session;
create policy "session_all" on racha_session for all using (true) with check (true);

drop policy if exists "matches_select" on matches;
drop policy if exists "matches_insert" on matches;
drop policy if exists "matches_update" on matches;
drop policy if exists "matches_all" on matches;
create policy "matches_all" on matches for all using (true) with check (true);

drop policy if exists "votes_select" on votes;
drop policy if exists "votes_insert" on votes;
drop policy if exists "votes_all" on votes;
create policy "votes_all" on votes for all using (true) with check (true);

drop policy if exists "gbp_select" on golden_ball_points;
drop policy if exists "gbp_insert" on golden_ball_points;
drop policy if exists "gbp_all" on golden_ball_points;
create policy "gbp_all" on golden_ball_points for all using (true) with check (true);

-- Realtime (ignore erro se já estiver na publication)
do $$
begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table racha_session;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table matches;
exception when duplicate_object then null;
end $$;
