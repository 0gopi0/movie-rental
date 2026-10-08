# Movie Rental App — Prototype Plan

Goal: ship a working end-to-end prototype fast. A user browses movies, opens one, logs in, "pays" with a mock payment, and gets 24 hours of playback access.

**Stack:** React (Vite) · Node.js + Express · MySQL (local) · JWT auth · mock payment (no real gateway)

---

## 1. User Flow

```
Home (movie grid)
   └─► Movie Detail page
          ├─ not logged in ──► Login / Register ──► back to Movie Detail
          ├─ logged in, no active rental ──► "Rent for 24h – ₹X" ──► Mock Checkout ──► success ──► Player
          └─ logged in, active rental ──► "Watch now (expires in 17h 32m)" ──► Player
Player page
   └─ server re-checks rental on load; if expired → redirect to Movie Detail
My Rentals page
   └─ list of active + expired rentals with time remaining
```

---

## 2. Folder Structure

```
movie rental/
├── PLAN.md
├── client/                      # React + Vite
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js           # proxy /api -> http://localhost:4000
│   ├── .env                     # VITE_API_URL (optional if using proxy)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # routes
│       ├── api/
│       │   └── client.js        # fetch wrapper, attaches Bearer token
│       ├── context/
│       │   └── AuthContext.jsx  # user, token, login(), logout()
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── MovieCard.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── Countdown.jsx    # time left on rental
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── MovieDetail.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Checkout.jsx     # mock payment form
│       │   ├── Player.jsx
│       │   └── MyRentals.jsx
│       └── styles.css
│
└── server/                      # Node + Express
    ├── package.json
    ├── .env                     # DB creds, JWT_SECRET, PORT
    ├── db/
    │   ├── schema.sql
    │   └── seed.sql
    ├── public/
    │   └── videos/              # sample .mp4 files for dev streaming
    └── src/
        ├── index.js             # app bootstrap, middleware, routes
        ├── db.js                # mysql2/promise pool
        ├── middleware/
        │   ├── auth.js          # requireAuth: verify JWT -> req.user
        │   └── error.js
        ├── routes/
        │   ├── auth.routes.js
        │   ├── movies.routes.js
        │   ├── payments.routes.js
        │   ├── rentals.routes.js
        │   └── stream.routes.js
        └── services/
            ├── rental.service.js   # hasActiveRental(), createRental()
            └── payment.service.js  # mock charge logic
```

---

## 3. Database Schema (MySQL)

`server/db/schema.sql`

```sql
CREATE DATABASE IF NOT EXISTS movie_rental;
USE movie_rental;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movies (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  poster_url    VARCHAR(500),
  video_path    VARCHAR(500) NOT NULL,      -- e.g. 'videos/sample1.mp4' (never sent to client)
  duration_min  INT,
  price_cents   INT NOT NULL DEFAULT 9900,  -- store money as integer
  currency      CHAR(3) NOT NULL DEFAULT 'INR',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  movie_id      INT NOT NULL,
  amount_cents  INT NOT NULL,
  currency      CHAR(3) NOT NULL,
  status        ENUM('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
  provider      VARCHAR(30) NOT NULL DEFAULT 'mock',
  provider_ref  VARCHAR(100),               -- fake txn id, e.g. 'mock_ab12cd'
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE rentals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  movie_id      INT NOT NULL,
  payment_id    INT NOT NULL UNIQUE,
  starts_at     DATETIME NOT NULL,
  expires_at    DATETIME NOT NULL,          -- starts_at + 24h
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (movie_id)   REFERENCES movies(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  INDEX idx_access (user_id, movie_id, expires_at)
);
```

**Access rule:** a user can play a movie iff
```sql
SELECT 1 FROM rentals
WHERE user_id = ? AND movie_id = ? AND expires_at > UTC_TIMESTAMP()
LIMIT 1;
```
- Use UTC everywhere (`UTC_TIMESTAMP()` in SQL, `timezone: 'Z'` in mysql2 config).
- 24h window starts at payment time (simplest). Optional later: start on first play.
- No cron needed — expiry is evaluated at query time.

`server/db/seed.sql` — insert 6–8 movies pointing at a couple of small public-domain sample MP4s in `server/public/videos/`, posters from placeholder URLs.

---

## 4. API Endpoints

Base: `http://localhost:4000/api`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | — | `{name,email,password}` → `{token,user}` |
| POST | `/auth/login` | — | `{email,password}` → `{token,user}` |
| GET  | `/auth/me` | JWT | current user |
| GET  | `/movies` | — | list movies (id, title, poster, price, duration) |
| GET  | `/movies/:id` | optional JWT | movie detail + `rental: {active, expiresAt}` if logged in |
| POST | `/payments/checkout` | JWT | `{movieId, card:{number,expiry,cvc}}` → mock charge; on success creates payment + rental, returns `{paymentId, rental}` |
| GET  | `/rentals` | JWT | user's rentals (active + expired) |
| GET  | `/rentals/:movieId/access` | JWT | `{active, expiresAt}` |
| GET  | `/stream/:movieId/token` | JWT | if active rental → short-lived (e.g. 2h, capped at expires_at) signed stream token |
| GET  | `/stream/:movieId?t=<streamToken>` | stream token | streams MP4 with HTTP Range support; 403 if expired |

Why a separate stream token: the `<video>` tag can't send an `Authorization` header, so the player fetches a short-lived token and puts it in the query string.

Checkout guards:
- 404 if movie not found.
- 409 if user already has an active rental for that movie (return existing rental instead of double-charging).
- Price comes from DB, never from the client.

---

## 5. JWT Auth Approach

- Passwords hashed with `bcrypt` (cost 10).
- On login/register: sign `{ sub: user.id, email }` with `JWT_SECRET`, `expiresIn: '7d'`.
- Client stores token in `localStorage` (fine for prototype; note: move to httpOnly cookie for production).
- `api/client.js` attaches `Authorization: Bearer <token>`; on 401 → clear token, redirect to `/login?next=<current path>`.
- `middleware/auth.js`:
  - `requireAuth` — verify token, set `req.user = { id, email }`, else 401.
  - `optionalAuth` — same but doesn't fail (used on `/movies/:id`).
- Stream token: separate JWT `{ sub, movieId, typ: 'stream' }`, `expiresIn` = min(2h, rental remaining). Verified in stream route, plus rental re-checked in DB.

---

## 6. Mock Payment (Prototype Only)

`services/payment.service.js`:

```js
// Test cards
// 4242 4242 4242 4242 -> success
// 4000 0000 0000 0002 -> declined
// anything else       -> success
async function charge({ amountCents, card }) {
  await sleep(800); // feel like a real gateway
  const num = card.number.replace(/\s/g, '');
  if (num === '4000000000000002') return { ok: false, reason: 'card_declined' };
  return { ok: true, providerRef: 'mock_' + crypto.randomBytes(6).toString('hex') };
}
```

Checkout route flow (single DB transaction):
1. Verify movie exists; check no active rental.
2. Insert `payments` row (`pending`).
3. Call `charge()`.
4. On success: update payment → `succeeded`, insert `rentals` with `expires_at = UTC_TIMESTAMP() + INTERVAL 24 HOUR`; commit.
5. On failure: update payment → `failed`; return 402 with reason.

Never store card numbers. Clearly label the checkout UI "TEST MODE — no real charge". Keeping `payments.provider` makes swapping in Razorpay/Stripe later a contained change.

---

## 7. Frontend Pages

| Route | Page | Notes |
|---|---|---|
| `/` | Home | grid of `MovieCard`s from `GET /movies` |
| `/movies/:id` | MovieDetail | poster, description, price; button state: **Login to rent** / **Rent 24h** / **Watch now** + countdown |
| `/login` | Login | honors `?next=` redirect |
| `/register` | Register | auto-login after register |
| `/checkout/:movieId` | Checkout (protected) | mock card form prefilled with 4242…, shows price, Pay button → spinner → success → `/watch/:id` |
| `/watch/:movieId` | Player (protected) | fetch stream token, `<video controls src="/api/stream/:id?t=...">`; on 403 → back to detail with "rental expired" |
| `/rentals` | MyRentals (protected) | active (with countdown) and expired lists |

Libraries: `react-router-dom` only. Plain CSS. No state library — `AuthContext` + local `useState`/`useEffect` is enough.

---

## 8. Local Dev Setup

Prereqs: Node 20+, npm, MySQL 8 running locally.

```bash
# 1. Database
mysql -u root -p -e "CREATE USER IF NOT EXISTS 'movie'@'localhost' IDENTIFIED BY 'movie';
  GRANT ALL ON movie_rental.* TO 'movie'@'localhost'; FLUSH PRIVILEGES;"
mysql -u root -p < server/db/schema.sql
mysql -u root -p movie_rental < server/db/seed.sql

# 2. Server
cd server
npm init -y
npm i express mysql2 bcrypt jsonwebtoken cors dotenv
npm i -D nodemon
# package.json scripts: "dev": "nodemon src/index.js"
cp .env.example .env   # see below
npm run dev            # http://localhost:4000

# 3. Client
cd ../client
npm create vite@latest . -- --template react
npm i react-router-dom
npm run dev            # http://localhost:5173
```

`server/.env`
```
PORT=4000
DB_HOST=localhost
DB_USER=movie
DB_PASSWORD=movie
DB_NAME=movie_rental
JWT_SECRET=change-me-dev-secret
CLIENT_ORIGIN=http://localhost:5173
```

`client/vite.config.js` — proxy to avoid CORS during dev:
```js
server: { proxy: { '/api': 'http://localhost:4000' } }
```

Sample videos: drop 1–2 small MP4s (e.g. Big Buck Bunny, Blender open movies) into `server/public/videos/`.

---

## 9. Build Milestones (in order)

Each milestone ends in something you can click or curl.

1. **Scaffold (≈30 min)** — create `client/` (Vite) and `server/` (Express), `GET /api/health` returns `{ok:true}`, Vite proxy works.
2. **DB + movies (≈45 min)** — schema + seed, `db.js` pool, `GET /movies` and `GET /movies/:id`. Home grid + MovieDetail render real data.
3. **Auth (≈1 h)** — register/login/me with bcrypt + JWT, `requireAuth`/`optionalAuth`. Login/Register pages, `AuthContext`, Navbar shows user/logout, `?next=` redirect.
4. **Mock payment + rentals (≈1 h)** — `payments` + `rentals` logic in a transaction, `POST /payments/checkout`, duplicate-rental guard. Checkout page with test-card form. MovieDetail shows correct button state.
5. **Gated playback (≈1 h)** — stream token endpoint, Range-supporting MP4 streaming route that re-checks rental. Player page; 403 handling.
6. **My Rentals + countdown (≈30 min)** — `GET /rentals`, MyRentals page, `Countdown` component on detail/rentals.
7. **Expiry test + polish (≈30 min)** — temporarily set a rental's `expires_at` to the past in MySQL and confirm Player blocks it; loading/error states; "TEST MODE" banner; README run instructions.

**Total: roughly one focused day.**

### Out of scope for the prototype (later)
Real payment gateway + webhooks, httpOnly cookie auth / refresh tokens, HLS/DRM or signed CDN URLs, admin panel for movies, search/filters, email receipts, rate limiting, deployment.
