const { get, all, run, NOW_SQL, PLUS_24H_SQL, toIso } = require('../db');

// Access rule: user can play iff a rental with expires_at in the future exists.
function getActiveRental(userId, movieId) {
  return get(
    `SELECT id, movie_id, starts_at, expires_at FROM rentals
     WHERE user_id = ? AND movie_id = ? AND expires_at > ${NOW_SQL}
     ORDER BY expires_at DESC LIMIT 1`,
    [userId, movieId]
  );
}

function hasActiveRental(userId, movieId) {
  return !!getActiveRental(userId, movieId);
}

// Must be called inside a transaction together with the payment update.
function createRental(userId, movieId, paymentId) {
  const { lastInsertRowid } = run(
    `INSERT INTO rentals (user_id, movie_id, payment_id, starts_at, expires_at)
     VALUES (?, ?, ?, ${NOW_SQL}, ${PLUS_24H_SQL})`,
    [userId, movieId, paymentId]
  );
  return get('SELECT id, movie_id, starts_at, expires_at FROM rentals WHERE id = ?', [lastInsertRowid]);
}

function listRentals(userId) {
  return all(
    `SELECT r.id, r.movie_id, r.starts_at, r.expires_at, m.title, m.poster_url,
            (r.expires_at > ${NOW_SQL}) AS active
     FROM rentals r JOIN movies m ON m.id = r.movie_id
     WHERE r.user_id = ?
     ORDER BY r.expires_at DESC`,
    [userId]
  ).map((r) => ({
    id: r.id,
    movieId: r.movie_id,
    title: r.title,
    posterUrl: r.poster_url,
    posterFallbackUrl: `/api/posters/${r.movie_id}.svg`,
    startsAt: toIso(r.starts_at),
    expiresAt: toIso(r.expires_at),
    active: !!r.active,
  }));
}

function serializeRental(r) {
  return r
    ? { id: r.id, movieId: r.movie_id, active: true, startsAt: toIso(r.starts_at), expiresAt: toIso(r.expires_at) }
    : { active: false, expiresAt: null };
}

module.exports = { getActiveRental, hasActiveRental, createRental, listRentals, serializeRental };
