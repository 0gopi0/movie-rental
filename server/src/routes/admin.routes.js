// Admin API: dashboard stats, sales/rentals list, movie CRUD. Every route is admin-only.
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { all, get, run, tx, NOW_SQL, toIso } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { posterFallbackUrl } = require('../services/poster.service');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const VIDEOS_DIR = path.join(PUBLIC_DIR, 'videos');

router.use(requireAuth, requireAdmin);

const toRental = (r) => ({
  id: r.id,
  userName: r.user_name,
  userEmail: r.user_email,
  movieId: r.movie_id,
  movieTitle: r.movie_title,
  amountCents: r.amount_cents,
  currency: r.currency,
  startsAt: toIso(r.starts_at),
  expiresAt: toIso(r.expires_at),
  active: !!r.active,
});

const RENTAL_SELECT = `
  SELECT r.id, r.movie_id, r.starts_at, r.expires_at, (r.expires_at > ${NOW_SQL}) AS active,
         u.name AS user_name, u.email AS user_email, m.title AS movie_title, p.amount_cents, p.currency
  FROM rentals r
  JOIN users u ON u.id = r.user_id
  JOIN movies m ON m.id = r.movie_id
  JOIN payments p ON p.id = r.payment_id`;

// GET /api/admin/stats — headline numbers, last 7 days of revenue (UTC days), latest 10 rentals.
router.get('/stats', (_req, res) => {
  const n = (sql) => get(sql).n;
  const byDay = all(
    `SELECT date(created_at) AS day, SUM(amount_cents) AS cents, COUNT(*) AS count FROM payments
     WHERE status = 'succeeded' AND created_at >= date('now', '-6 days')
     GROUP BY day`
  );
  const today = new Date();
  const revenueByDay = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i)).toISOString().slice(0, 10);
    const row = byDay.find((d) => d.day === day);
    revenueByDay.push({ day, cents: row?.cents || 0, count: row?.count || 0 });
  }
  res.json({
    totalRevenueCents: n("SELECT COALESCE(SUM(amount_cents), 0) AS n FROM payments WHERE status = 'succeeded'"),
    rentalsToday: n("SELECT COUNT(*) AS n FROM rentals WHERE created_at >= date('now')"),
    activeRentals: n(`SELECT COUNT(*) AS n FROM rentals WHERE expires_at > ${NOW_SQL}`),
    totalMovies: n('SELECT COUNT(*) AS n FROM movies'),
    totalUsers: n('SELECT COUNT(*) AS n FROM users'),
    revenueByDay,
    latestRentals: all(`${RENTAL_SELECT} ORDER BY r.created_at DESC, r.id DESC LIMIT 10`).map(toRental),
  });
});

// GET /api/admin/rentals?status=all|active|expired — rentals plus totals for that filter.
router.get('/rentals', (req, res) => {
  const status = String(req.query.status || 'all');
  const where = { all: '', active: `WHERE r.expires_at > ${NOW_SQL}`, expired: `WHERE r.expires_at <= ${NOW_SQL}` }[status];
  if (where === undefined) return res.status(400).json({ error: 'status must be all, active or expired' });
  const rentals = all(`${RENTAL_SELECT} ${where} ORDER BY r.created_at DESC, r.id DESC LIMIT 500`).map(toRental);
  const totals = get(
    `SELECT COUNT(*) AS count, COALESCE(SUM(p.amount_cents), 0) AS revenue_cents
     FROM rentals r JOIN payments p ON p.id = r.payment_id ${where}`
  );
  res.json({ status, rentals, totals: { count: totals.count, revenueCents: totals.revenue_cents } });
});

// ---------- Movies ----------

const toAdminMovie = (m) => ({
  id: m.id,
  title: m.title,
  description: m.description,
  posterUrl: m.poster_url,
  posterFallbackUrl: posterFallbackUrl(m.id),
  videoPath: m.video_path,
  durationMin: m.duration_min,
  priceCents: m.price_cents,
  currency: m.currency,
  genre: m.genre,
  rating: m.rating,
  year: m.year,
  trailerYoutubeId: m.trailer_youtube_id,
  status: m.status || 'archived', // 'now' | 'upcoming' | 'archived'
  releaseDate: m.release_date || null,
  activeRentals: m.active_rentals ?? 0,
  totalRentals: m.total_rentals ?? 0,
});

const listVideos = () =>
  fs.existsSync(VIDEOS_DIR) ? fs.readdirSync(VIDEOS_DIR).filter((f) => f.endsWith('.mp4')).map((f) => `videos/${f}`) : [];

const MOVIE_SELECT = `
  SELECT m.*,
         (SELECT COUNT(*) FROM rentals r WHERE r.movie_id = m.id AND r.expires_at > ${NOW_SQL}) AS active_rentals,
         (SELECT COUNT(*) FROM rentals r WHERE r.movie_id = m.id) AS total_rentals
  FROM movies m`;

const bad = (msg) => Object.assign(new Error(msg), { status: 400, expose: true });

// Validates the admin form body -> DB column values. Throws a 400 on bad input.
function parseMovie(b = {}) {
  const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
  const optNum = (v, label, { min, max, int }) => {
    if (str(v) === '') return null;
    const x = Number(v);
    if (!Number.isFinite(x) || x < min || x > max || (int && !Number.isInteger(x))) throw bad(`${label} must be between ${min} and ${max}`);
    return x;
  };

  const title = str(b.title);
  if (!title || title.length > 200) throw bad('Title is required (max 200 characters)');

  const priceInr = Number(b.priceInr);
  if (!Number.isFinite(priceInr) || priceInr <= 0 || priceInr > 100000) throw bad('Price must be between ₹1 and ₹1,00,000');

  const posterUrl = str(b.posterUrl);
  if (posterUrl && !/^(https?:\/\/|\/)/.test(posterUrl)) throw bad('Poster URL must start with http(s):// or /');

  const trailer = str(b.trailerYoutubeId);
  if (trailer && !/^[\w-]{11}$/.test(trailer)) throw bad('Trailer must be an 11-character YouTube video ID');

  // Single-film model: 'now' = current feature, 'upcoming' = next teaser (needs a release date).
  const status = str(b.status) || 'archived';
  if (!['now', 'upcoming', 'archived'].includes(status)) throw bad("Status must be 'now', 'upcoming' or 'archived'");
  const releaseDate = str(b.releaseDate);
  if (status === 'upcoming') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) throw bad('Upcoming movie needs a release date (YYYY-MM-DD)');
    const d = new Date(releaseDate + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) throw bad('Release date is not a real date');
  } else if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    throw bad('Release date must be YYYY-MM-DD');
  }

  const videoPath = str(b.videoPath);
  const resolved = path.resolve(PUBLIC_DIR, videoPath);
  if (!videoPath || !resolved.startsWith(PUBLIC_DIR + path.sep)) throw bad('Video path is required (e.g. videos/sintel-trailer.mp4)');
  if (!fs.existsSync(resolved)) throw bad(`Video file not found: public/${videoPath}`);

  return {
    title,
    description: str(b.description) || null,
    poster_url: posterUrl || null,
    video_path: videoPath,
    duration_min: optNum(b.durationMin, 'Duration (min)', { min: 1, max: 600, int: true }),
    price_cents: Math.round(priceInr * 100),
    genre: str(b.genre) || null,
    rating: optNum(b.rating, 'Rating', { min: 0, max: 10 }),
    year: optNum(b.year, 'Year', { min: 1888, max: 2100, int: true }),
    trailer_youtube_id: trailer || null,
    status,
    release_date: releaseDate || null,
  };
}

// Single-film model: setting one movie to 'now' (or 'upcoming') demotes the
// previous holder of that slot to 'archived'. Runs inside the caller's tx.
function applySpotlightSlot(id, status) {
  if (status === 'now') {
    run("UPDATE movies SET status = 'archived' WHERE status = 'now' AND id != ?", [id]);
  } else if (status === 'upcoming') {
    run("UPDATE movies SET status = 'archived' WHERE status = 'upcoming' AND id != ?", [id]);
  }
}

// POST /api/admin/movies/rotate — monthly swap: archive the current 'now'
// feature and promote the 'upcoming' teaser into its slot.
// 404 when there is no upcoming movie to promote.
// NOTE: must be defined BEFORE /movies/:id routes, or 'rotate' matches :id.
router.post('/movies/rotate', (_req, res) => {
  const next = get("SELECT id FROM movies WHERE status = 'upcoming' ORDER BY release_date, id LIMIT 1");
  if (!next) return res.status(404).json({ error: 'No upcoming movie to rotate in. Add one first.' });
  const out = tx(() => {
    run("UPDATE movies SET status = 'archived', release_date = NULL WHERE status = 'now'");
    run("UPDATE movies SET status = 'now', release_date = NULL WHERE id = ?", [next.id]);
    return toAdminMovie(get(`${MOVIE_SELECT} WHERE m.id = ?`, [next.id]));
  });
  res.json({ movie: out });
});

router.get('/movies', (_req, res) => {
  res.json({ movies: all(`${MOVIE_SELECT} ORDER BY m.id DESC`).map(toAdminMovie), videos: listVideos() });
});

router.get('/movies/:id', (req, res) => {
  const m = get(`${MOVIE_SELECT} WHERE m.id = ?`, [Number(req.params.id)]);
  if (!m) return res.status(404).json({ error: 'Movie not found' });
  res.json({ movie: toAdminMovie(m), videos: listVideos() });
});

router.post('/movies', (req, res) => {
  const v = parseMovie(req.body);
  const out = tx(() => {
    const cols = Object.keys(v);
    const { lastInsertRowid } = run(
      `INSERT INTO movies (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => v[c])
    );
    const id = Number(lastInsertRowid);
    applySpotlightSlot(id, v.status);
    return toAdminMovie(get(`${MOVIE_SELECT} WHERE m.id = ?`, [id]));
  });
  res.status(201).json({ movie: out });
});

router.put('/movies/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!get('SELECT id FROM movies WHERE id = ?', [id])) return res.status(404).json({ error: 'Movie not found' });
  const v = parseMovie(req.body);
  const out = tx(() => {
    const cols = Object.keys(v);
    run(`UPDATE movies SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => v[c]), id]);
    applySpotlightSlot(id, v.status);
    return toAdminMovie(get(`${MOVIE_SELECT} WHERE m.id = ?`, [id]));
  });
  res.json({ movie: out });
});

// DELETE is blocked (409) while anyone is renting it. Movies with past rentals are also kept (409),
// because deleting them would erase payment/rental history from the sales numbers.
router.delete('/movies/:id', (req, res) => {
  const m = get(`${MOVIE_SELECT} WHERE m.id = ?`, [Number(req.params.id)]);
  if (!m) return res.status(404).json({ error: 'Movie not found' });
  if (m.active_rentals > 0) {
    return res.status(409).json({ error: `Can't delete: ${m.active_rentals} active rental(s) right now`, code: 'active_rentals' });
  }
  if (m.total_rentals > 0) {
    return res.status(409).json({ error: `Can't delete: this movie has sales history (${m.total_rentals} past rental(s)), deleting it would erase revenue records`, code: 'has_history' });
  }
  // No rentals means no succeeded payments; clear failed/pending attempts so the FK allows the delete.
  tx(() => {
    run("DELETE FROM payments WHERE movie_id = ? AND status != 'succeeded'", [m.id]);
    run('DELETE FROM movies WHERE id = ?', [m.id]);
  });
  res.status(204).end();
});

module.exports = router;
