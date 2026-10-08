const jwt = require('jsonwebtoken');

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

module.exports = { requireAuth, optionalAuth };
