-- RundocRun shared rounds board. Full schema for a fresh Supabase project.
-- Run once: SQL Editor -> New query -> paste -> Run.
--
-- The game talks to Supabase straight from the browser with the project's public (anon / publishable) key.
-- Row Level Security: anyone can read the board and add a score; nobody can edit or delete one through the game.
-- The table also refuses scores that the game's own scoring could never produce.

create table if not exists public.rundocrun_scores (
  id            bigint generated always as identity primary key,
  name          text         not null check (char_length(name) between 1 and 14),
  score         integer      not null check (score between 0 and 5500),
  right_answers smallint     not null check (right_answers between 0 and 10),
  time_s        numeric(8,2) not null check (time_s >= 15 and time_s < 100000),
  player_id     text         check (player_id is null or char_length(player_id) between 8 and 40),
  created_at    timestamptz  not null default now(),
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

-- The board shows each player's best run once. player_id is a random id the game keeps on each device;
-- rows saved before it existed are grouped by name.
create or replace view public.rundocrun_board with (security_invoker = true) as
select distinct on (coalesce(player_id, 'legacy-' || lower(name)))
       id, name, score, right_answers, time_s
from public.rundocrun_scores
order by coalesce(player_id, 'legacy-' || lower(name)), score desc, time_s asc;

grant select on public.rundocrun_board to anon, authenticated;
