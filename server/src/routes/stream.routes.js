const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { get, toIso } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getActiveRental } = require('../services/rental.service');

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const MAX_STREAM_TOKEN_SEC = 2 * 60 * 60;

// GET /api/stream/:movieId/token — short-lived token for the <video> src (can't send headers).
router.get('/:movieId/token', requireAuth, (req, res) => {
  const movieId = Number(req.params.movieId);
  const movie = get('SELECT status FROM movies WHERE id = ?', [movieId]);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  if (movie.status !== 'now') return res.status(403).json({ error: 'This movie is not available yet' });
  const rental = getActiveRental(req.user.id, movieId);
  if (!rental) return res.status(403).json({ error: 'No active rental', code: 'rental_expired' });
  const remainingSec = Math.floor((Date.parse(toIso(rental.expires_at)) - Date.now()) / 1000);
  const expiresIn = Math.max(1, Math.min(MAX_STREAM_TOKEN_SEC, remainingSec));
  const token = jwt.sign({ sub: String(req.user.id), movieId, typ: 'stream' }, process.env.JWT_SECRET, { expiresIn });
  res.json({ token, expiresIn, rentalExpiresAt: toIso(rental.expires_at) });
});

// GET /api/stream/:movieId?t=<streamToken> — MP4 with HTTP Range support.
// Rental is re-checked in the DB on every request (each seek/range fetch), so expiry bites immediately.
router.get('/:movieId', (req, res) => {
  const movieId = Number(req.params.movieId);
  let payload;
  try {
    payload = jwt.verify(String(req.query.t || ''), process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Invalid or expired stream token' });
  }
  if (payload.typ !== 'stream' || Number(payload.movieId) !== movieId) {
    return res.status(403).json({ error: 'Token not valid for this movie' });
  }
  if (!getActiveRental(Number(payload.sub), movieId)) {
    return res.status(403).json({ error: 'Rental expired', code: 'rental_expired' });
  }

  const movie = get('SELECT video_path FROM movies WHERE id = ?', [movieId]);
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  const filePath = path.resolve(PUBLIC_DIR, movie.video_path);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return res.status(400).json({ error: 'Bad video path' });
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return res.status(404).json({ error: `Video file missing on server: public/${movie.video_path}` });
  }

  const size = stat.size;
  const range = req.headers.range;
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, no-store');

  if (!range) {
    res.setHeader('Content-Length', size);
    return fs.createReadStream(filePath).pipe(res);
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range);
  let start, end;
  if (m && m[1] === '' && m[2] !== '') {
    // suffix range: last N bytes
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else if (m && m[1] !== '') {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  }
  if (start === undefined || start >= size || start > end) {
    res.setHeader('Content-Range', `bytes */${size}`);
    return res.status(416).end();
  }
  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
  res.setHeader('Content-Length', end - start + 1);
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

module.exports = router;
