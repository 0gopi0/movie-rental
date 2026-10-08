const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../db');
const { requireAuth } = require('../middleware/auth');

const sign = (user) =>
  jwt.sign({ sub: String(user.id), email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

router.post('/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (get('SELECT id FROM users WHERE email = ?', [email])) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const hash = await bcrypt.hash(password, 10);
  const { lastInsertRowid } = run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
  const user = { id: Number(lastInsertRowid), name, email };
  res.status(201).json({ token: sign(user), user });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(401).json({ error: 'User no longer exists' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
