-- RundocRun shared rounds board.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- The game talks to this table directly from the browser with the project's public (anon / publishable) key.
-- Row Level Security lets anyone read the board and add a score, but nobody can edit or delete scores.

create table if not exists public.rundocrun_scores (
  id            bigint generated always as identity primary key,
  name          text        not null check (char_length(name) between 1 and 14),
  score         integer     not null check (score between 0 and 5500),
  right_answers smallint    not null check (right_answers between 0 and 10),
  time_s        numeric(8,2) not null check (time_s > 0 and time_s < 100000),
  created_at    timestamptz not null default now()
);

create index if not exists rundocrun_scores_rank on public.rundocrun_scores (score desc, time_s asc);

alter table public.rundocrun_scores enable row level security;

drop policy if exists "Anyone can read the board" on public.rundocrun_scores;
create policy "Anyone can read the board"
  on public.rundocrun_scores for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can add a score" on public.rundocrun_scores;
create policy "Anyone can add a score"
  on public.rundocrun_scores for insert
  to anon, authenticated
  with check (true);

grant select, insert on public.rundocrun_scores to anon, authenticated;
