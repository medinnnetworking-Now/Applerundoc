-- RundocRun shared rounds board and play counter. Full schema for a fresh Supabase project.
-- Run once: SQL Editor -> New query -> paste -> Run.
--
-- The game talks to Supabase straight from the browser with the project's public (anon / publishable) key.
-- Row Level Security: anyone can read the board and add a score or log a play; nobody can edit or remove one
-- through the game. The plays log itself is private; the page only reads totals through rundocrun_stats().

create table if not exists public.rundocrun_scores (
  id            bigint generated always as identity primary key,
  name          text         not null check (char_length(name) between 1 and 14),
  score         integer      not null check (score between 0 and 5500),
  right_answers smallint     not null check (right_answers between 0 and 10),
  time_s        numeric(8,2) not null check (time_s < 100000),
  player_id     text         check (player_id is null or char_length(player_id) between 8 and 40),
  level         smallint     not null default 1 check (level between 1 and 3),
  created_at    timestamptz  not null default now(),
  -- a run cannot finish in under 8 seconds
  constraint rundocrun_min_time check (time_s >= 8),
  -- names made only of digits or symbols (for example 741852963) are not names
  constraint rundocrun_name_not_just_symbols check (name !~ '^[[:digit:][:space:][:punct:]]+$'),
  -- score = 500 (ten catches) + 200 per right answer + up to 100 speed per right answer + time bonus (2000 - 15 per second)
  constraint rundocrun_score_matches_run check (
    score between 500 + 200*right_answers + greatest(0, 2000 - round(15*time_s)) - 1
              and 500 + 300*right_answers + greatest(0, 2000 - round(15*time_s)) + 1
  )
);

create index if not exists rundocrun_scores_rank on public.rundocrun_scores (score desc, time_s asc);

alter table public.rundocrun_scores enable row level security;

create policy "Anyone can read the board"
  on public.rundocrun_scores for select
  to anon, authenticated
  using (true);

create policy "Anyone can add a score"
  on public.rundocrun_scores for insert
  to anon, authenticated
  with check (true);

grant select, insert on public.rundocrun_scores to anon, authenticated;

-- The board shows each player's best run once per level. player_id is a random id the game keeps on each device;
-- rows saved before it existed are grouped by name.
create or replace view public.rundocrun_board with (security_invoker = true) as
select distinct on (coalesce(player_id, 'legacy-' || lower(name)), level)
       id, name, score, right_answers, time_s, level
from public.rundocrun_scores
order by coalesce(player_id, 'legacy-' || lower(name)), level, score desc, time_s asc;

grant select on public.rundocrun_board to anon, authenticated;

-- One row per game started: a random device id, the level and the time. No names, no IPs.
create table if not exists public.rundocrun_plays (
  id         bigint generated always as identity primary key,
  player_id  text        not null check (char_length(player_id) between 8 and 40),
  level      smallint    not null default 1 check (level between 1 and 3),
  created_at timestamptz not null default now()
);

create index if not exists rundocrun_plays_player on public.rundocrun_plays (player_id, created_at desc);

alter table public.rundocrun_plays enable row level security;

create policy "Anyone can log a play"
  on public.rundocrun_plays for insert
  to anon, authenticated
  with check (true);

grant insert on public.rundocrun_plays to anon, authenticated;

-- A device can start at most one game every 20 seconds (a real game takes longer), so the counter is hard to inflate.
create or replace function public.rundocrun_play_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.rundocrun_plays p
             where p.player_id = new.player_id and p.created_at > now() - interval '20 seconds') then
    raise exception 'slow down';
  end if;
  return new;
end $$;

revoke all on function public.rundocrun_play_guard() from public, anon, authenticated;

create trigger rundocrun_play_guard before insert on public.rundocrun_plays
  for each row execute function public.rundocrun_play_guard();

-- The only thing the page can read from the plays log: totals.
create or replace function public.rundocrun_stats() returns json
language sql security definer stable set search_path = '' as $$
  select json_build_object(
    'players',  (select count(distinct player_id) from public.rundocrun_plays),
    'games',    (select count(*) from public.rundocrun_plays),
    'finished', (select count(*) from public.rundocrun_scores));
$$;

revoke all on function public.rundocrun_stats() from public;
grant execute on function public.rundocrun_stats() to anon, authenticated;
