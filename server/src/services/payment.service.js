// Mock payment gateway — PROTOTYPE ONLY, no real charge, card numbers are never stored.
// Test cards:
//   4242 4242 4242 4242 -> success
//   4000 0000 0000 0002 -> declined
//   anything else (13–19 digits) -> success
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function charge({ amountCents, card }) {
  await sleep(800); // feel like a real gateway
  const num = String(card?.number || '').replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(num)) return { ok: false, reason: 'invalid_card_number' };
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(String(card?.expiry || ''))) return { ok: false, reason: 'invalid_expiry' };
  if (!/^\d{3,4}$/.test(String(card?.cvc || ''))) return { ok: false, reason: 'invalid_cvc' };
  if (num === '4000000000000002') return { ok: false, reason: 'card_declined' };
  if (!(amountCents > 0)) return { ok: false, reason: 'invalid_amount' };
  return { ok: true, providerRef: 'mock_' + crypto.randomBytes(6).toString('hex') };
}

module.exports = { charge };
