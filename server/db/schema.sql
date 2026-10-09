-- SQLite version of the PLAN.md schema (prototype swap: no MySQL on this box).
-- Same tables/columns as the MySQL schema in db/schema.mysql.sql.
-- Dialect differences:
--   INT AUTO_INCREMENT  -> INTEGER PRIMARY KEY AUTOINCREMENT
--   ENUM(...)           -> TEXT + CHECK(...)
--   DATETIME/TIMESTAMP  -> TEXT 'YYYY-MM-DD HH:MM:SS' in UTC (datetime('now') is UTC),
--                          so string comparison == time comparison.
--   UTC_TIMESTAMP()     -> datetime('now')
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_admin      INTEGER NOT NULL DEFAULT 0,  -- 1 = can use /api/admin/*
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS movies (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  poster_url    VARCHAR(500),
  video_path    VARCHAR(500) NOT NULL,      -- e.g. 'videos/big-buck-bunny.mp4' (never sent to client)
  duration_min  INTEGER,
  price_cents   INTEGER NOT NULL DEFAULT 9900,  -- money as integer (paise)
  currency      CHAR(3) NOT NULL DEFAULT 'INR',
  genre         VARCHAR(100),
  rating        REAL,                       -- display score out of 10
  year          INTEGER,                    -- release year
  trailer_youtube_id VARCHAR(20),           -- official trailer, embedded via youtube-nocookie
  tmdb_id       INTEGER,                    -- themoviedb.org id (poster/metadata source), nullable
  status        TEXT NOT NULL DEFAULT 'archived' CHECK (status IN ('now','upcoming','archived')),
                                            -- single-film model: exactly one 'now', at most one 'upcoming'
  release_date  TEXT,                       -- YYYY-MM-DD, required when status = 'upcoming'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  movie_id      INTEGER NOT NULL REFERENCES movies(id),
  amount_cents  INTEGER NOT NULL,
  currency      CHAR(3) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  provider      VARCHAR(30) NOT NULL DEFAULT 'mock',
  provider_ref  VARCHAR(100),               -- fake txn id, e.g. 'mock_ab12cd'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rentals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  movie_id      INTEGER NOT NULL REFERENCES movies(id),
  payment_id    INTEGER NOT NULL UNIQUE REFERENCES payments(id),
  starts_at     TEXT NOT NULL,
  expires_at    TEXT NOT NULL,              -- starts_at + 24h
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_access ON rentals (user_id, movie_id, expires_at);
