const router = require('express').Router();
const { all, get } = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { posterFallbackUrl } = require('../services/poster.service');
const { getActiveRental, serializeRental } = require('../services/rental.service');

// video_path is deliberately never selected/sent to the client.
const toMovie = (m) => ({
  id: m.id,
  title: m.title,
  description: m.description,
  posterUrl: m.poster_url,
  posterFallbackUrl: posterFallbackUrl(m.id), // local SVG if the TMDB image fails to load
  durationMin: m.duration_min,
  priceCents: m.price_cents,
  currency: m.currency,
  genre: m.genre,
  rating: m.rating,
  year: m.year,
  trailerYoutubeId: m.trailer_youtube_id,
  tmdbId: m.tmdb_id,
  status: m.status || 'archived', // 'now' | 'upcoming' | 'archived' (single-film model)
  releaseDate: m.release_date || null, // YYYY-MM-DD, set when status = 'upcoming'
});

const MOVIE_COLS =
  'id, title, description, poster_url, duration_min, price_cents, currency, genre, rating, year, trailer_youtube_id, tmdb_id, status, release_date';

// Public catalog: only the current feature + the upcoming teaser. Archived
// films stay in the DB (rental/sales history) but are never listed.
router.get('/', (_req, res) => {
  const rows = all(
    `SELECT ${MOVIE_COLS} FROM movies WHERE status IN ('now', 'upcoming')
     ORDER BY CASE status WHEN 'now' THEN 0 ELSE 1 END, id`
  );
  res.json({ movies: rows.map(toMovie) });
});

// GET /api/movies/spotlight — { now, upcoming } for the single-film homepage.
router.get('/spotlight', (_req, res) => {
  const now = get(`SELECT ${MOVIE_COLS} FROM movies WHERE status = 'now' ORDER BY id LIMIT 1`);
  const upcoming = get(
    `SELECT ${MOVIE_COLS} FROM movies WHERE status = 'upcoming' ORDER BY release_date, id LIMIT 1`
  );
  res.json({ now: now ? toMovie(now) : null, upcoming: upcoming ? toMovie(upcoming) : null });
});

router.get('/:id', optionalAuth, (req, res) => {
  const m = get(
    `SELECT ${MOVIE_COLS} FROM movies WHERE id = ?`,
    [Number(req.params.id)]
  );
  if (!m) return res.status(404).json({ error: 'Movie not found' });
  const movie = toMovie(m);
  if (req.user) movie.rental = serializeRental(getActiveRental(req.user.id, m.id));
  res.json({ movie });
});

module.exports = router;
