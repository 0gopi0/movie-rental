const jwt = require('jsonwebtoken');
const { get } = require('../db');

function readToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function decode(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.typ === 'stream') throw new Error('stream token not valid for API');
  return { id: Number(payload.sub), email: payload.email };
}

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.user = decode(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = decode(token);
    } catch {
      /* ignore bad token — treat as anonymous */
    }
  }
  next();
}

// Use after requireAuth. Reads is_admin from the DB (not the JWT) so revoking admin takes effect immediately.
function requireAdmin(req, res, next) {
  const row = get('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
  if (!row?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
