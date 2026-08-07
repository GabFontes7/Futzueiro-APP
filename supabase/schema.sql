-- FUTZUEIRO-APP · schema Supabase (fonte única da verdade)
-- Rode no SQL Editor do projeto. Depois: Database → Replication → habilite Realtime nas tabelas.

-- ─── Jogadores ───────────────────────────────────────────
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  overall integer not null check (overall between 50 and 99),
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table players add column if not exists photo_url text;

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
  voting_closes_at timestamptz,
  created_at timestamptz not null default now()
);

-- Upgrade se matches já existia sem estas colunas
alter table matches add column if not exists team_averages jsonb not null default '{}'::jsonb;
alter table matches add column if not exists assignments jsonb not null default '[]'::jsonb;
alter table matches add column if not exists voting_closes_at timestamptz;

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  device_id text not null,
  user_id uuid,
  player_id text,
  picks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, device_id)
);

alter table votes add column if not exists user_id uuid;
alter table votes add column if not exists picks jsonb not null default '[]'::jsonb;
alter table votes alter column player_id drop not null;

create unique index if not exists votes_match_user_uidx
  on votes (match_id, user_id)
  where user_id is not null;

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

-- ─── Premiações (craque dia / mês / ano) ─────────────────
create table if not exists awards (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('day', 'month', 'year')),
  period_key text not null,
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

-- ─── Storage: fotos opcionais dos jogadores ──────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "player_photos_public_read" on storage.objects;
create policy "player_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'player-photos');

drop policy if exists "player_photos_anon_insert" on storage.objects;
create policy "player_photos_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'player-photos');

drop policy if exists "player_photos_anon_update" on storage.objects;
create policy "player_photos_anon_update"
  on storage.objects for update
  using (bucket_id = 'player-photos')
  with check (bucket_id = 'player-photos');

drop policy if exists "player_photos_anon_delete" on storage.objects;
create policy "player_photos_anon_delete"
  on storage.objects for delete
  using (bucket_id = 'player-photos');

-- ─── Partida / gols / Chuteira de Ouro ───────────────────
create table if not exists match_days (
  id uuid primary key default gen_random_uuid(),
  day_key text not null unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists pitch_games (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references match_days (id) on delete cascade,
  sequence integer not null default 1,
  home_score integer not null default 0,
  away_score integer not null default 0,
  status text not null default 'ready'
    check (status in ('ready', 'live', 'ended')),
  duration_seconds integer not null default 420,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references match_days (id) on delete cascade,
  game_id uuid not null references pitch_games (id) on delete cascade,
  player_id text not null,
  player_name text not null,
  side text not null check (side in ('home', 'away')),
  created_at timestamptz not null default now()
);

create index if not exists pitch_games_day_idx on pitch_games (day_id, sequence desc);
create index if not exists goals_day_idx on goals (day_id, created_at desc);
create index if not exists goals_player_year_idx on goals (player_id, created_at desc);
create index if not exists goals_game_idx on goals (game_id, created_at desc);

alter table match_days enable row level security;
alter table pitch_games enable row level security;
alter table goals enable row level security;

drop policy if exists "match_days_all" on match_days;
create policy "match_days_all" on match_days for all using (true) with check (true);

drop policy if exists "pitch_games_all" on pitch_games;
create policy "pitch_games_all" on pitch_games for all using (true) with check (true);

drop policy if exists "goals_all" on goals;
create policy "goals_all" on goals for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table match_days;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table pitch_games;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table goals;
exception when duplicate_object then null;
end $$;

