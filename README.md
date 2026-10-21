# An Apple a Day

An apple a day keeps the doctor away, so go get them.

A Pac-Man-style chase where **you are the apple** and ten specialist doctors run from you through a hospital corridor maze. Catch a doctor and they quiz you with an MCQ from their subject. Answer right for points, answer wrong and you pay 5 seconds. Fastest, sharpest chaser tops the rounds board.

No build step, no dependencies. Plain HTML, CSS and JavaScript on a canvas.

## Play

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

**Controls:** arrow keys or WASD. On phones, swipe anywhere on the maze or use the on-screen pad. In a quiz, tap an option or press 1 to 4 (or A to D).

## Rules and scoring

| Event | Points |
|---|---|
| Catch a doctor | +50 |
| Right answer | +200 |
| Speed bonus on a right answer | up to +100 (12 second timer) |
| Wrong answer or timeout | 0 points, +5 seconds on the clock |
| Time bonus at the end | 2000 minus 15 per chase second (never below 0) |

The chase clock only runs while you are chasing. It pauses during questions. Four doctors are on the board at once; as you catch one, the next specialist walks out of the ward.

The ten specialists: Anatomy, Biochemistry, Physiology, Pathology, Microbiology, Pharmacology, Community Medicine, Forensic Medicine, ENT, Ophthalmology. Each run draws one question per subject from a pool of two.

Final rank by score: Fresher, Intern, Resident, Consultant, Head of Department.

## Edit the questions

Open `questions.js`. Each subject holds a pool of questions:

```js
{ q: "Question text?", o: ["A", "B", "C", "D"], a: 1, w: "One-line explanation." }
```

`a` is the index of the correct option. Options are shuffled every time. Add more questions to a subject and each run picks one at random.

## Tune the difficulty

Constants sit at the top of `game.js`: `APPLE_SPEED`, `DOC_BASE`, `DOC_STEP` (doctors speed up as the pack thins), `Q_TIME`, `PENALTY`, and the scoring values. The maze is the `MAZE` array.

## Deploy

It is a static site, so any static host works.

- **Vercel:** import the repo, framework preset "Other", no build command.
- **GitHub Pages:** Settings, Pages, deploy from branch `main` and root.
- **Netlify:** drag the folder in.

`node scripts/build-single.js` also writes a single self-contained file to `dist/apple-a-day.html`.

## Leaderboard

Scores are saved in the player's own browser (`localStorage`), so the board is per device. A shared board needs a small backend such as Vercel KV or Supabase.

## Debug

Add `?debug` to the URL to expose `window.__g` for automated testing.
