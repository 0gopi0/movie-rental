const router = require('express').Router();
const { get, run, tx } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { charge } = require('../services/payment.service');
const { getActiveRental, createRental, serializeRental } = require('../services/rental.service');

// POST /api/payments/checkout  { movieId, card: { number, expiry, cvc } }
// Price always comes from the DB, never from the client.
router.post('/checkout', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const movieId = Number(req.body?.movieId);
  const card = req.body?.card || {};

  // 1. Movie exists + no active rental; insert pending payment (atomic).
  const pre = tx(() => {
    const movie = get('SELECT id, price_cents, currency FROM movies WHERE id = ?', [movieId]);
    if (!movie) return { status: 404, body: { error: 'Movie not found' } };
    const existing = getActiveRental(userId, movieId);
    if (existing) {
      return { status: 409, body: { error: 'You already have an active rental for this movie', rental: serializeRental(existing) } };
    }
    const { lastInsertRowid } = run(
      `INSERT INTO payments (user_id, movie_id, amount_cents, currency, status, provider) VALUES (?, ?, ?, ?, 'pending', 'mock')`,
      [userId, movieId, movie.price_cents, movie.currency]
    );
    return { paymentId: Number(lastInsertRowid), amountCents: movie.price_cents };
  });
  if (pre.status) return res.status(pre.status).json(pre.body);

  // 2. Call the (mock) gateway outside the transaction — it's async/slow.
  const result = await charge({ amountCents: pre.amountCents, card });

  // 3. Finalise atomically.
  if (!result.ok) {
    run(`UPDATE payments SET status = 'failed' WHERE id = ?`, [pre.paymentId]);
    return res.status(402).json({ error: humanReason(result.reason), reason: result.reason, paymentId: pre.paymentId });
  }
  const out = tx(() => {
    // Re-check in case a parallel checkout for the same movie finished first.
    const existing = getActiveRental(userId, movieId);
    if (existing) {
      // Prototype: mark this one failed rather than double-charging (a real gateway would refund/void).
      run(`UPDATE payments SET status = 'failed', provider_ref = ? WHERE id = ?`, [result.providerRef, pre.paymentId]);
      return { status: 409, body: { error: 'You already have an active rental for this movie', rental: serializeRental(existing) } };
    }
    run(`UPDATE payments SET status = 'succeeded', provider_ref = ? WHERE id = ?`, [result.providerRef, pre.paymentId]);
    return { status: 201, body: { paymentId: pre.paymentId, providerRef: result.providerRef, rental: serializeRental(createRental(userId, movieId, pre.paymentId)) } };
  });
  res.status(out.status).json(out.body);
});

function humanReason(reason) {
  return (
    {
      card_declined: 'Your card was declined (test card 4000 0000 0000 0002).',
      invalid_card_number: 'Card number looks invalid.',
      invalid_expiry: 'Expiry must be MM/YY.',
      invalid_cvc: 'CVC must be 3–4 digits.',
    }[reason] || 'Payment failed.'
  );
}

module.exports = router;
