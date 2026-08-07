-- Partidas na quadra: dia → jogos → gols (Chuteira de Ouro)

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
