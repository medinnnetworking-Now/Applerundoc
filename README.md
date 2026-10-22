# An Apple a Day

An apple a day keeps the doctor away, so go get them.

A Pac-Man-style chase where **you are the apple** and ten specialist doctors run from you through a hospital corridor maze. Catch a doctor and they quiz you with an MCQ from their subject. Answer right for points, answer wrong and you pay 5 seconds. Fastest, sharpest chaser tops the rounds board.

No build step. Plain HTML, CSS and JavaScript on a canvas, plus one small Vercel Function for the shared board.

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

- **Vercel (recommended):** import the repo, framework preset "Other", no build command, then connect a Blob store under Storage. This is the only host where the shared board works.
- **GitHub Pages / Netlify:** the game works, but the board is per device.

`node scripts/build-single.js` also writes a single self-contained file to `dist/apple-a-day.html`.

## Leaderboard

The rounds board is shared across every device. `api/scores.js` is a Vercel Function that stores each finished run as its own blob in a private Vercel Blob store (connected to the project as `BLOB_READ_WRITE_TOKEN`), so simultaneous submissions at a busy stall never clash.

- `GET /api/scores?limit=8` returns the top runs.
- `POST /api/scores` with `{name, score, right, time}` saves a run.

If the API can't be reached (for example when you open `index.html` straight from disk), the board falls back to scores saved in that browser.

## Share card and challenge links

**Share my card: beat my time** on the result card draws a 1080×1350 "Beat my time" image (time, rank, score, the apple chasing doctors, and a QR code to play). On phones it opens the share sheet with the image and a challenge link. On desktop it downloads the PNG and copies the link.

The challenge link looks like `?beat=42.4&by=Rahul`. Whoever opens it sees "Rahul caught all ten doctors in 42.4s. Beat that." on the title card, and after their run the result card says whether they beat it.

## Poster

`poster.html` is an A3 portrait stall poster in the same style, with a QR code to the game. Open it in Chrome and print at 100% with background graphics on, or save as PDF. The QR code is `qr.svg` and points to https://applerundoc.vercel.app/. If the game URL changes, regenerate it (for example with `npx qrcode -t svg -o qr.svg <url>`) and update the URL text in `poster.html` and `GAME_URL` in `game.js`.

## Promo link

`PROMO` at the top of the promo section in `game.js` adds an optional link: a strip on the title card (`title`) and a button on the result card (`button`), both pointing at `url`. With `url` empty, as shipped, neither appears.

## Debug

Add `?debug` to the URL to expose `window.__g` for automated testing.
