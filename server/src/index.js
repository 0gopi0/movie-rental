require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET missing — copy .env.example to .env');
  process.exit(1);
}

require('./db'); // create schema + seed on boot
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5180' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/posters', express.static(path.join(__dirname, '../public/posters')));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/movies', require('./routes/movies.routes'));
app.use('/api/payments', require('./routes/payments.routes'));
app.use('/api/rentals', require('./routes/rentals.routes'));
app.use('/api/stream', require('./routes/stream.routes'));

app.use('/api', notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4100;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
