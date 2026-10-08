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
});

router.get('/', (_req, res) => {
  const rows = all('SELECT id, title, description, poster_url, duration_min, price_cents, currency, genre, rating, year, trailer_youtube_id, tmdb_id FROM movies ORDER BY id');
  res.json({ movies: rows.map(toMovie) });
});

router.get('/:id', optionalAuth, (req, res) => {
  const m = get(
    'SELECT id, title, description, poster_url, duration_min, price_cents, currency, genre, rating, year, trailer_youtube_id, tmdb_id FROM movies WHERE id = ?',
    [Number(req.params.id)]
  );
  if (!m) return res.status(404).json({ error: 'Movie not found' });
  const movie = toMovie(m);
  if (req.user) movie.rental = serializeRental(getActiveRental(req.user.id, m.id));
  res.json({ movie });
});

module.exports = router;
