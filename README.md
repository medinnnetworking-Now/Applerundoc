# An Apple a Day

An apple a day keeps the doctor away, so go get them.

A maze chase where **you are the apple** and ten specialist doctors run from you through a hospital corridor maze. Catch a doctor and they quiz you with an MCQ from their subject. Answer right for points, answer wrong and you pay 5 seconds. Fastest, sharpest chaser tops the rounds board.

No build step. Plain HTML, CSS and JavaScript on a canvas, with Supabase for the shared board.

## Play

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

**Controls:** arrow keys or WASD. **Exit** in the top bar (tap twice, or press Esc twice) quits a run at any point and returns to the title card without saving a score. On phones, swipe anywhere on the maze or use the on-screen pad. In a quiz, tap an option or press 1 to 4 (or A to D).

## Rules and scoring

| Event | Points |
|---|---|
| Catch a doctor | +50 |
| Right answer | +200 |
| Speed bonus on a right answer | up to +100 (12 second timer) |
| Wrong answer or timeout | 0 points, +5 seconds on the clock |
| Time bonus at the end | 2000 minus 15 per chase second (never below 0) |

The chase clock only runs while you are chasing. It pauses during questions. Four doctors are on the board at once; as you catch one, the next specialist walks out of the ward.

The ten specialists: Anatomy, Biochemistry, Physiology, Pathology, Microbiology, Pharmacology, Community Medicine, Forensic Medicine, ENT, Ophthalmology. Each run draws one question per subject from the pool for the level being played.

Final rank by score: Fresher, Intern, Resident, Consultant, Head of Department.

## Edit the questions

Open `questions.js`. Each subject holds its questions, tagged with the level they belong to:

```js
{ l: 2, q: "Question text?", o: ["A", "B", "C", "D"], a: 1, w: "One-line explanation." }
```

`l` is the level (1 Ward, 2 ICU, 3 Theatre; leave it out for level 1) and `a` is the index of the correct option. Options are shuffled every time.

There are 150 questions: 5 per subject on each level. Each run draws one per subject from the level being played. **A device remembers which questions it has seen and never repeats one until every question for that subject and level has been used**, then the cycle starts again. More questions means a longer wait before any repeat, so add as many as you like. Keep Theatre questions short, because the timer there is 8 seconds.

## Tune the difficulty

Constants sit at the top of `game.js`: `APPLE_SPEED`, `DOC_BASE`, `DOC_STEP` (doctors speed up as the pack thins), `Q_TIME`, `PENALTY`, and the scoring values. The maze is the `MAZE` array.

## Deploy

It is a static site, so any static host works.

- **Vercel:** import the repo, framework preset "Other", no build command.
- **GitHub Pages:** Settings, Pages, deploy from branch `main` and root.
- **Netlify:** drag the folder in.

The shared board works on all of them once Supabase is set up.

`node scripts/build-single.js` also writes a single self-contained file to `dist/apple-a-day.html`.

## Leaderboard

The rounds board is shared across every device through Supabase. The page reads and writes the `rundocrun_scores` table directly, so it works on any static host (Vercel, GitHub Pages, Netlify).

1. In Supabase, open **SQL Editor**, paste `supabase/schema.sql`, and run it. It creates the table and Row Level Security rules that let anyone read the board and add a score, but not edit or delete one.
2. In **Project Settings → API**, copy the **Project URL** and the **anon / publishable** key into `SUPABASE_URL` and `SUPABASE_KEY` near the top of `game.js`. Both are public by design; never use the service_role / secret key here.

The board shows each player's **best run once**, not every run. Each device keeps a random id (`player_id`) so one person replaying can't fill the top spots. The database also refuses names made only of digits or symbols and scores that the game's scoring could never produce, so a hand-made request can't post an impossible time.

With those left empty, or if Supabase can't be reached, the board falls back to scores saved in that browser.

To clear the board, delete the rows in Supabase's Table Editor.

## Levels

Three levels, all open from the start. Pick one on the title card: **1 Ward** (the classic maze, 12 seconds a question), **2 ICU** (a loopier maze, quicker doctors, 10 seconds) and **3 Theatre** (an open floor, quickest doctors, 8 seconds). After a run, the big button offers the next level (Theatre wraps round to Ward).

**Each level has its own rounds board.** Scoring is the same on every level, so scores stay comparable, but a Ward time is never ranked against a Theatre time. The title card shows the board for the level you have selected; the results card shows the board for the level you just played.

The mazes, doctor speeds (`docBase`, `docStep`, `docMax`) and question timers are in `LEVELS` at the top of `game.js`. Doctor speed is capped below the apple's 5.8 tiles per second, so the last doctor can always be caught.

## Play counter

The title and result cards show how many players and games there have been. Each game start logs a random device id and the level in `rundocrun_plays` (no names, no IPs), and the page reads only the totals through `rundocrun_stats()`. A device can log at most one game every 20 seconds. Run `supabase/schema.sql` on a fresh project to create all of it.

## Share card and challenge links

**Share** in the top bar works at any point and pauses the chase while the share sheet is open. Before a run it shares an invite card, mid-run a "Mid-chase 3/10" progress card, and after a run the "Beat my time" card. Every card carries the Instagram handle (`IG_HANDLE` in `game.js`).

**Share my card: beat my time** on the result card draws a 1080×1350 "Beat my time" image (time, rank, score, the apple chasing doctors, and a QR code to play). On phones it opens the share sheet with the image and a challenge link. On desktop it downloads the PNG and copies the link.

The challenge link looks like `?beat=42.4&by=Rahul`. Whoever opens it sees "Rahul caught all ten doctors in 42.4s. Beat that." on the title card, and after their run the result card says whether they beat it.

## Posters

Two A3 portrait stall posters in the same style, both with a QR code to the game. Open each in Chrome and print at 100% with background graphics on, or save as PDF.

- `poster.html` is the feature poster: the ten specialists, three levels, the clock, the live leaderboard, challenge cards and ranks.
- `poster-story.html` is the story poster, "the thought behind the game", told in four panels.

The QR code is `qr.svg` and points to https://applerundoc.vercel.app/. If the game URL changes, regenerate it (for example with `npx qrcode -t svg -o qr.svg <url>`) and update the URL text in both posters and `GAME_URL` in `game.js`.

`hero.html` is a 4:5 social hero card with the campaign copy, and `poster-square.html` is a 1:1 (1080 x 1080) square version with a Play free button and QR code, for the Instagram feed.

## Promo link

`PROMO` at the top of the promo section in `game.js` adds an optional link: a strip on the title card (`title`) and a button on the result card (`button`), both pointing at `url`. It currently credits the developer and links to the Medinn portfolio (opens in a new tab). With `url` empty, neither appears.

## Debug

Add `?debug` to the URL to expose `window.__g` for automated testing.

## Credits

Developed by [Medinn](https://medinn-sandy.vercel.app/).
