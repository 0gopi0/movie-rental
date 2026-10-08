// Database access — SQLite via better-sqlite3 (prototype swap for MySQL).
//
// PLAN.md calls for MySQL + mysql2/promise. No MySQL server was available on the dev box,
// so this file uses an embedded SQLite file with the same tables/columns (db/schema.sql).
// All SQL lives behind these tiny helpers (all/get/run/tx) plus the NOW_SQL / expiry
// helpers below, so moving to MySQL means:
//   1. rewrite this file with a mysql2 pool (timezone: 'Z') exposing the same helpers (async),
//   2. NOW_SQL -> 'UTC_TIMESTAMP()', plus24h -> 'UTC_TIMESTAMP() + INTERVAL 24 HOUR',
//   3. add `await` at call sites (helpers here are synchronous),
//   4. load db/schema.mysql.sql + db/seed.sql into MySQL.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const dbFile = path.resolve(ROOT, process.env.DB_FILE || './data/movie_rental.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables on boot; seed movies if empty.
db.exec(fs.readFileSync(path.join(ROOT, 'db/schema.sql'), 'utf8'));
// Older DBs: add any missing movie columns (SQLite has no ADD COLUMN IF NOT EXISTS, so check first).
// Values stay NULL until `npm run db:reset` reseeds the catalog.
const movieCols = db.prepare('PRAGMA table_info(movies)').all().map((c) => c.name);
for (const [col, type] of [
  ['genre', 'VARCHAR(100)'],
  ['rating', 'REAL'],
  ['year', 'INTEGER'],
  ['trailer_youtube_id', 'VARCHAR(20)'],
  ['tmdb_id', 'INTEGER'],
]) {
  if (!movieCols.includes(col)) db.exec(`ALTER TABLE movies ADD COLUMN ${col} ${type}`);
}
if (db.prepare('SELECT COUNT(*) AS n FROM movies').get().n === 0) {
  db.exec(fs.readFileSync(path.join(ROOT, 'db/seed.sql'), 'utf8'));
  console.log('[db] seeded sample movies');
}

// SQL snippets that differ between SQLite and MySQL. Timestamps are UTC 'YYYY-MM-DD HH:MM:SS'.
const NOW_SQL = "datetime('now')"; // MySQL: UTC_TIMESTAMP()
const PLUS_24H_SQL = "datetime('now', '+24 hours')"; // MySQL: UTC_TIMESTAMP() + INTERVAL 24 HOUR

const all = (sql, params = []) => db.prepare(sql).all(params);
const get = (sql, params = []) => db.prepare(sql).get(params);
const run = (sql, params = []) => db.prepare(sql).run(params); // -> { changes, lastInsertRowid }
const tx = (fn) => db.transaction(fn)(); // runs fn atomically (MySQL: conn.beginTransaction/commit)

// SQLite returns 'YYYY-MM-DD HH:MM:SS' (UTC, no zone). Convert to ISO for the client.
const toIso = (s) => (s ? s.replace(' ', 'T') + 'Z' : null);

module.exports = { db, all, get, run, tx, NOW_SQL, PLUS_24H_SQL, toIso };
