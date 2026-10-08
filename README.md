# Movie Rental — local prototype

Browse movies → open one → login/register → mock-pay → watch for 24 hours.
React (Vite) + Express + JWT + **SQLite** (see the MySQL note below). Everything runs locally; nothing is sent to a real payment gateway.

## Run it (two terminals)

```bash
# Terminal 1 — API on http://localhost:4100
cd server
npm install          # first time only
npm run dev          # nodemon; or: npm start

# Terminal 2 — web app on http://localhost:5180
cd client
npm install          # first time only
npm run dev
```

Open **http://localhost:5180**. The DB file (`server/data/movie_rental.db`) is created and seeded with the 20 T-Series titles on first start.
If you have a DB from before the T-Series catalog update, run `npm run db:reset` once (the server adds the new
`year` / `trailer_youtube_id` / `tmdb_id` columns to an old DB automatically, but only a reset loads the new catalog —
including titles 7–20).
Reset all data (users, payments, rentals): stop the server, run `npm run db:reset` in `server/`, then start it again.

> **Ports:** PLAN.md uses 4000/5173, but another app on this machine (TWM_HRMS) already uses those,
> so this project uses **4100** (API) and **5180** (Vite). To change them, edit `server/.env` (`PORT`, `CLIENT_ORIGIN`)
> and `client/.env` (`CLIENT_PORT`, `API_PROXY_TARGET`).

## Demo script

1. Home → click any movie → **Login to rent** → Register (you're logged in automatically and sent back to the movie).
2. **Rent for 24h** → Checkout is prefilled with the success card → **Pay** → Player starts.
3. Test cards (any future `MM/YY`, any 3-digit CVC):
   | Card | Result |
   |---|---|
   | `4242 4242 4242 4242` | success |
   | `4000 0000 0000 0002` | declined (HTTP 402) |
   | any other 13–19 digits | success |
4. **My Rentals** shows active rentals (live countdown) and expired ones.
5. **Expiry test:** with the server running, force every rental to expire:
   ```bash
   cd server
   node -e "new (require('better-sqlite3'))('data/movie_rental.db').prepare(\"UPDATE rentals SET expires_at = datetime('now','-1 minute')\").run()"
   ```
   Reload the Player → you get redirected to the movie page with "rental expired". Seeking an already-open video also fails, because every byte-range request re-checks the rental.

## Where the plan's requirements live

- **Price always comes from the DB.** `POST /api/payments/checkout` only reads `movieId` + `card`, so a `priceCents` sent by the client is ignored.
- **409 on a duplicate rental.** If you already have an active rental, checkout returns 409 with the existing rental and doesn't charge again. It checks before charging and again before committing.
- **Pay flow:** the pending payment is saved in one transaction, then the mock charge runs (about 800 ms), then the payment is marked succeeded and the rental row is created (`expires_at` = now + 24h, UTC) in a second transaction.
- **Streaming:** `GET /api/stream/:id/token` returns a stream JWT (`typ: 'stream'`) that lasts at most 2 h and never outlives the rental. `GET /api/stream/:id?t=…` serves the MP4 with HTTP Range (206) support. Every request checks the token's movie and re-checks the rental in the DB.
- **The video file path is never sent to the client.**
- **Card numbers are never stored.**

API endpoints match PLAN.md §4. Posters load from the TMDB image CDN; if one fails, the client falls back to the
local SVG at `/api/posters/<id>.svg` (sent as `posterFallbackUrl`).
`movies` also has `genre`, `rating` (display-only, out of 10), `year`, `trailer_youtube_id` and `tmdb_id` columns.

## UI / mobile

Dark theme with a red accent, plain CSS in `client/src/styles.css`, no UI framework.

- **Home:** the hero banner shows the highest-rated movie, followed by six horizontal carousel rows built client-side from
  `GET /api/movies` in `pages/Home.jsx` (`ROWS`, max 10 titles each; a title can appear in several rows):
  | Row | Rule |
  |---|---|
  | Trending Now | rating, highest first |
  | Best Sellers | price, highest first (no sales data yet), rating breaks ties |
  | Romantic Hits | genre contains "Romance" (10 titles) |
  | Action Blockbusters | genre contains "Action" (9 titles) |
  | Comedy Nights | genre contains "Comedy" (9 titles) |
  | New Releases | year, newest first |

  Rows (`components/Carousel.jsx`) use native horizontal scrolling, so touch swipe and trackpads work. Cards snap into place
  (`scroll-snap`), the scrollbar is hidden, and the ‹ › buttons page by about one screen and disable themselves at either end.
  About 6 cards are visible on desktop, 4.4 at ≤1024px, 3.3 at ≤768px and 2.2 at ≤480px (2 full cards plus a peek on a 360px phone).
  The full catalog grid stays below the rows. Poster cards have rating and price badges, and zoom with a play icon on hover. Skeleton placeholders show while data loads (Home, detail, checkout, My Rentals). A footer on every page credits TMDB and YouTube (T-Series) and says full films aren't included.
- **Detail:** a price card under the title shows the price in large type, a red "24-hour access" badge and a full-width
  56px rent button ("Login to rent · ₹99" or "Rent now · ₹99"). With an active rental, it shows a live countdown pill and a "Play preview clip"
  button instead. On screens ≤768px, a fixed bottom bar with the price and the same button slides up once the price card scrolls out of view.
  The page also has the real poster (with SVG fallback), year, genre and runtime, the official trailer embedded under the title "Official Trailer — © T-Series", and a "Prototype preview clip" note under the rent button. The player shows the same label.
- **Breakpoints:** `≤1024px` puts 4 cards per row. `≤768px` gives 3 per row, turns the navbar into a hamburger menu and stacks the detail poster above the info. `≤480px` (phones, including 360px) gives 2 per row, a single-column full-width checkout, an edge-to-edge player and trailer, and full-width buttons. `<360px` gives 1 per row.
- All buttons, nav links and test-card chips are at least 44px tall. The player uses native `<video controls playsInline>` in a 16:9 frame.
- To try mobile layouts: open DevTools → device toolbar (Ctrl+Shift+M) → e.g. 360×780 or iPad. To use a real phone on the same Wi-Fi, run `npm run dev -- --host` in `client/` and open `http://<pi-ip>:5180`.

## SQLite instead of MySQL (prototype swap)

No MySQL server was reachable on this box (and there's no sudo or `mysql` client), so the prototype uses SQLite through
`better-sqlite3`, which ships a prebuilt binary for linux-arm64, so nothing needs compiling. Passwords are hashed with
`bcryptjs` (pure JS, cost 10) rather than `bcrypt`.

The tables and columns are the same as in PLAN.md (`users`, `movies`, `payments`, `rentals`, plus the `idx_access` index).
Times are stored as UTC `'YYYY-MM-DD HH:MM:SS'`.

### Moving to MySQL later

1. `npm i mysql2` in `server/`. Load `server/db/schema.mysql.sql` (PLAN.md's original schema) and `server/db/seed.sql` (portable).
2. Rewrite `server/src/db.js` around a `mysql2/promise` pool (`timezone: 'Z'`) and keep the same helpers: `all`, `get`, `run` (→ `{ lastInsertRowid }` from `insertId`), and `tx` (`beginTransaction`/`commit`).
3. In `db.js`, change `NOW_SQL` → `UTC_TIMESTAMP()` and `PLUS_24H_SQL` → `UTC_TIMESTAMP() + INTERVAL 24 HOUR`. `toIso` becomes `d.toISOString()` because mysql2 returns `Date` objects.
4. The helpers are synchronous today, so add `await` at their call sites in `routes/*` and `services/rental.service.js`, and make the `tx(...)` callbacks async.
5. Add the DB settings (`DB_HOST`, `DB_USER`, …) to `server/.env` as shown in PLAN.md §8.

## T-Series catalog

The prototype is built for **T-Series** as the catalog owner. It shows **real metadata, posters and official trailers only.
The full films are not downloaded, hosted or streamed.** Renting a title unlocks a short Blender open-movie sample clip,
labelled **"Prototype preview clip"** on the detail and player pages.

All twenty titles are T-Series Films productions (checked against the studio line in each film's Wikipedia infobox). Each trailer ID was checked
with YouTube oEmbed and is uploaded by the official **T-Series** channel (youtube.com/@tseries). Checked on 2026-10-08.

| # | Movie (year) | Co-producers with T-Series Films | Trailer (YouTube ID) | Poster source (TMDB) | Preview clip |
|---|---|---|---|---|---|
| 1 | Aashiqui 2 (2013) | Vishesh Films | [`FyXXgpPqe6w`](https://www.youtube.com/watch?v=FyXXgpPqe6w) | [TMDB 192558](https://www.themoviedb.org/movie/192558) · `/z18DWXBRxn3kz00sIVhC7ZK39Qm.jpg` | `big-buck-bunny.mp4` |
| 2 | Kabir Singh (2019) | Cine1 Studios | [`RiANSSgCuJk`](https://www.youtube.com/watch?v=RiANSSgCuJk) | [TMDB 577328](https://www.themoviedb.org/movie/577328) · `/iHPF4rt8HTuDZzNH1L2FCiPzN48.jpg` | `elephants-dream.mp4` |
| 3 | Animal (2023) | Bhadrakali Pictures, Cine1 Studios | [`8FkLRUJj-o0`](https://www.youtube.com/watch?v=8FkLRUJj-o0) | [TMDB 781732](https://www.themoviedb.org/movie/781732) · `/hr9rjR3J0xBBKmlJ4n3gHId9ccx.jpg` | `tears-of-steel.mp4` |
| 4 | Tanhaji: The Unsung Warrior (2020) | Ajay Devgn FFilms | [`cffAGIYTEHU`](https://www.youtube.com/watch?v=cffAGIYTEHU) | [TMDB 584850](https://www.themoviedb.org/movie/584850) · `/fZhgcUVwV7ocglL5XDq4ygsfXqD.jpg` | `sintel-snow.mp4` |
| 5 | Bhool Bhulaiyaa 2 (2022) | Cine1 Studios | [`P2KRKxAb2ek`](https://www.youtube.com/watch?v=P2KRKxAb2ek) | [TMDB 695962](https://www.themoviedb.org/movie/695962) · `/fw0oMHiMt9qOuKEJEmzFiCNAnXc.jpg` | `sintel-trailer.mp4` |
| 6 | Drishyam 2 (2022) | Panorama Studios, Viacom18 Studios | [`cxA2y9Tgl7o`](https://www.youtube.com/watch?v=cxA2y9Tgl7o) | [TMDB 1029827](https://www.themoviedb.org/movie/1029827) · `/wk8Vu0DI0MiNLaXXiVqAwjLRKL5.jpg` | `elephants-dream-2.mp4` |
| 7 | De De Pyaar De (2019) | Luv Films | [`EJUD2PptXrk`](https://www.youtube.com/watch?v=EJUD2PptXrk) | [TMDB 590401](https://www.themoviedb.org/movie/590401) · `/lKxbegRPahPDeOYeaDHhsNJDZU8.jpg` | `big-buck-bunny.mp4` |
| 8 | Sonu Ke Titu Ki Sweety (2018) | Luv Films | [`M2q64UowX9g`](https://www.youtube.com/watch?v=M2q64UowX9g) | [TMDB 498598](https://www.themoviedb.org/movie/498598) · `/1nsVHEVKOag8syzGtqnlYlbMQdh.jpg` | `elephants-dream.mp4` |
| 9 | Tu Jhoothi Main Makkaar (2023) | Luv Films | [`Cx_Dtwn4ayw`](https://www.youtube.com/watch?v=Cx_Dtwn4ayw) | [TMDB 611359](https://www.themoviedb.org/movie/611359) · `/zHLtNP4KP0GMi6p1ACf2QvVnBvI.jpg` | `tears-of-steel.mp4` |
| 10 | Satyameva Jayate (2018) | Emmay Entertainment | [`odXKXLG43co`](https://www.youtube.com/watch?v=odXKXLG43co) | [TMDB 531597](https://www.themoviedb.org/movie/531597) · `/yXdzw7Mg7UeAnIRMsMgP9DiiGuk.jpg` | `sintel-snow.mp4` |
| 11 | Bhool Bhulaiyaa 3 (2024) | Cine1 Studios | [`6YMY62tMLUA`](https://www.youtube.com/watch?v=6YMY62tMLUA) | [TMDB 980599](https://www.themoviedb.org/movie/980599) · `/3AfHD1HoaQpQwKH8kxRdBKVmzeU.jpg` | `sintel-trailer.mp4` |
| 12 | Malang (2020) | Luv Films, Northern Lights Films | [`sft5baUuzQs`](https://www.youtube.com/watch?v=sft5baUuzQs) | [TMDB 661043](https://www.themoviedb.org/movie/661043) · `/2COzaii4BnT1O6bbXfAxtoTmADm.jpg` | `elephants-dream-2.mp4` |
| 13 | Saaho (2019) | UV Creations | [`lD0-ztCFydA`](https://www.youtube.com/watch?v=lD0-ztCFydA) | [TMDB 454292](https://www.themoviedb.org/movie/454292) · `/rWXIpR2uPkwb1Hrhjj2FA62FGdu.jpg` | `big-buck-bunny.mp4` |
| 14 | Marjaavaan (2019) | Emmay Entertainment | [`L7TbPUOn1hc`](https://www.youtube.com/watch?v=L7TbPUOn1hc) | [TMDB 627715](https://www.themoviedb.org/movie/627715) · `/xILMQFZMQdJq3D7J6TuLrW6A3W5.jpg` | `elephants-dream.mp4` |
| 15 | Pati Patni Aur Woh (2019) | B. R. Studios | [`L7a1JSeqaXk`](https://www.youtube.com/watch?v=L7a1JSeqaXk) | [TMDB 590350](https://www.themoviedb.org/movie/590350) · `/9sAegdBnkfucqhrsocR47zCKcez.jpg` | `tears-of-steel.mp4` |
| 16 | Shubh Mangal Zyada Saavdhan (2020) | Colour Yellow Productions | [`r6r8UYU7Zcs`](https://www.youtube.com/watch?v=r6r8UYU7Zcs) | [TMDB 606535](https://www.themoviedb.org/movie/606535) · `/il9y4odx9el9Imwz6VMQrz9BcNz.jpg` | `sintel-snow.mp4` |
| 17 | Arjun Patiala (2019) | Maddock Films, Bake My Cake Films | [`nR7ETMS7Eo0`](https://www.youtube.com/watch?v=nR7ETMS7Eo0) | [TMDB 531601](https://www.themoviedb.org/movie/531601) · `/nuPerJWV04xQMQUu9J6K6H4iFCB.jpg` | `sintel-trailer.mp4` |
| 18 | Shehzada (2023) | Allu Entertainment, Haarika & Hassine Creations, Brat Films | [`vbSGPIS2_ao`](https://www.youtube.com/watch?v=vbSGPIS2_ao) | [TMDB 884434](https://www.themoviedb.org/movie/884434) · `/zyAHBSGEhiQMtE822NFkNKapMYi.jpg` | `elephants-dream-2.mp4` |
| 19 | Ek Villain Returns (2022) | Balaji Motion Pictures | [`swPhyd0g6K8`](https://www.youtube.com/watch?v=swPhyd0g6K8) | [TMDB 682401](https://www.themoviedb.org/movie/682401) · `/4BqMeSSPaC7spmj4Zl7htiigCkV.jpg` | `big-buck-bunny.mp4` |
| 20 | Batla House (2019) | Emmay Entertainment, JA Entertainment, Bake My Cake Films | [`dG3K6jB3iW8`](https://www.youtube.com/watch?v=dG3K6jB3iW8) | [TMDB 550485](https://www.themoviedb.org/movie/550485) · `/lHATvvxVvcHRy9G8ZJGXA7J6JEg.jpg` | `elephants-dream.mp4` |

Price and rating at a glance (prices are prototype values, rating = TMDB score ÷ 10):

| # | Movie | Genre | Runtime | Rating | Price |
|---|---|---|---|---|---|
| 1 | Aashiqui 2 | Drama · Romance | 134 min | 6.8 | ₹99 |
| 2 | Kabir Singh | Drama · Romance | 172 min | 6.4 | ₹129 |
| 3 | Animal | Action · Crime · Drama | 204 min | 6.1 | ₹199 |
| 4 | Tanhaji: The Unsung Warrior | Action · Drama · History | 135 min | 6.4 | ₹129 |
| 5 | Bhool Bhulaiyaa 2 | Horror · Comedy | 145 min | 6.1 | ₹149 |
| 6 | Drishyam 2 | Thriller · Drama · Mystery | 142 min | 8.0 | ₹149 |
| 7 | De De Pyaar De | Romance · Comedy | 135 min | 6.1 | ₹99 |
| 8 | Sonu Ke Titu Ki Sweety | Comedy · Romance | 138 min | 6.6 | ₹79 |
| 9 | Tu Jhoothi Main Makkaar | Romance · Comedy · Family | 164 min | 6.3 | ₹149 |
| 10 | Satyameva Jayate | Action · Thriller | 140 min | 6.4 | ₹99 |
| 11 | Bhool Bhulaiyaa 3 | Horror · Comedy | 158 min | 5.4 | ₹199 |
| 12 | Malang | Romance · Action · Thriller | 135 min | 7.0 | ₹129 |
| 13 | Saaho | Action · Adventure · Thriller | 170 min | 5.7 | ₹149 |
| 14 | Marjaavaan | Romance · Action | 135 min | 6.9 | ₹99 |
| 15 | Pati Patni Aur Woh | Comedy · Romance | 126 min | 6.1 | ₹99 |
| 16 | Shubh Mangal Zyada Saavdhan | Comedy · Romance | 117 min | 6.0 | ₹79 |
| 17 | Arjun Patiala | Comedy · Romance | 106 min | 4.1 | ₹79 |
| 18 | Shehzada | Drama · Comedy · Action | 145 min | 5.5 | ₹129 |
| 19 | Ek Villain Returns | Action · Crime · Thriller | 128 min | 6.0 | ₹129 |
| 20 | Batla House | Action · Drama · Thriller | 146 min | 6.8 | ₹99 |

Poster URLs are `https://image.tmdb.org/t/p/w500/<path>`. Runtimes are the theatrical runtimes from Wikipedia, genres
come from TMDB, and `rating` is the TMDB user score ÷ 10. Synopses are short original summaries, not copied text. Prices
are prototype INR values (₹79–₹199). Titles 7–12 were checked on 2026-10-08 in the same way (Wikipedia studio line, TMDB page,
YouTube oEmbed author = T-Series); their TMDB ratings are the rounded user score shown on the TMDB page. Titles 13–20 were
added on 2026-10-08 the same way. (Bholaa was considered but skipped: its full trailer is on the Devgn Films channel, and
T-Series only uploaded teasers.)

**Attribution**
- **Posters and metadata:** [TMDB](https://www.themoviedb.org/). *This product uses the TMDB API but is not endorsed or
  certified by TMDB.* Poster artwork is © the respective rights holders (T-Series and co-producers). Images are hotlinked
  from TMDB's CDN, not copied into the repo. Any production use must follow TMDB's API terms (an API key and, for
  commercial use, a commercial agreement).
- **Trailers:** © T-Series, embedded from the official T-Series YouTube channel through the privacy-enhanced
  `youtube-nocookie.com` player, under the YouTube Terms of Service. Nothing is downloaded or re-hosted.
- **Preview clips:** © Blender Foundation, CC BY 3.0 (see "Sample videos" below). They are placeholder footage and have
  no connection to the T-Series films.

**Full films:** streaming the actual movies needs a licensed source, for example a content licence or distribution
agreement from T-Series with mezzanine files delivered through a DRM-protected (Widevine/FairPlay) HLS/DASH pipeline.
Until then, `video_path` points at the sample clips. To switch a title to a licensed file, change its `movies.video_path`.

If a TMDB poster path ever changes, the card shows the local SVG fallback. Find the new path on the movie's TMDB page
(or `GET /3/movie/{tmdb_id}` with an API key) and update `poster_url`.

## Sample videos

Each seeded movie streams a short clip from `server/public/videos/` (titles 7–20 reuse the same six clips, as listed in the catalog table; 6 files, ~16.7 MB total, H.264/AAC, 360p–480p,
`+faststart`). These are the "Prototype preview clip" files. They are placeholder footage from Blender Foundation open
movies and are **not** the T-Series films:

| Seed id → T-Series title | File | Source footage | Length | Size |
|---|---|---|---|---|
| 1 Aashiqui 2 | `big-buck-bunny.mp4` | *Big Buck Bunny* trailer, re-encoded from download.blender.org/peach/trailer/trailer_480p.mov | 33 s | 1.6 MB |
| 2 Kabir Singh | `elephants-dream.mp4` | *Elephants Dream*, 01:30–02:00, cut from download.blender.org/ED/elephantsdream-480-h264-st-aac.mov | 30 s | 4.9 MB |
| 3 Animal | `tears-of-steel.mp4` | *Tears of Steel*, 04:05–04:35, cut from download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov (scaled to 480p) | 30 s | 3.3 MB |
| 4 Tanhaji | `sintel-snow.mp4` | *Sintel*, 10 s 360p sample from test-videos.co.uk | 10 s | 1.0 MB |
| 5 Bhool Bhulaiyaa 2 | `sintel-trailer.mp4` | *Sintel* trailer, download.blender.org/durian/trailer/sintel_trailer-480p.mp4 (unchanged) | 52 s | 4.4 MB |
| 6 Drishyam 2 | `elephants-dream-2.mp4` | *Elephants Dream*, 06:00–06:25, same source as #2 | 25 s | 1.4 MB |

**Attribution (required):** *Big Buck Bunny* (2008), *Elephants Dream* (2006), *Sintel* (2010) and *Tears of Steel* (2012) are
© Blender Foundation (www.blender.org; peach.blender.org, orange.blender.org, durian.blender.org, mango.blender.org), licensed
**CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/). The clips above are trimmed and/or re-encoded excerpts.
(The separately distributed *Tears of Steel* soundtrack files are CC BY-ND; the film itself, including its audio track, is CC BY.)

To add or swap a clip, put an MP4 in `server/public/videos/` and update `movies.video_path` (for example `videos/my-film.mp4`).
Re-encode with `-movflags +faststart` so playback starts before the whole file loads. If a file is missing, the stream
endpoint returns 404 with the expected path.

## Layout

```
server/  Express API: src/{index,db}.js, routes/, services/, middleware/; db/*.sql; public/{videos,posters}
client/  Vite React app: src/{api,context,components,pages}, styles.css; vite.config.js proxies /api to :4100
```

## Not done / next steps

- Out of scope per PLAN.md: real payment gateway and webhooks, httpOnly-cookie or refresh-token auth, HLS/DRM, admin panel, search, rate limiting, deployment.
- A declined payment leaves a `failed` row in `payments`, which is expected. If two checkouts race and the gateway succeeds for both, the second payment is marked `failed` instead of being refunded. A real gateway would need a void or refund here.
- The 24h window starts at payment time. PLAN.md lists "start on first play" as an optional later change.
- There are no automated tests yet. The API flow was checked by hand with curl (see the demo script).
