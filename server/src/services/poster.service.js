const fs = require('fs');
const path = require('path');

const POSTERS_DIR = path.resolve(__dirname, '../../public/posters');

// Local SVG fallback only exists for the seeded titles; movies added later get null.
const posterFallbackUrl = (movieId) =>
  fs.existsSync(path.join(POSTERS_DIR, `${movieId}.svg`)) ? `/api/posters/${movieId}.svg` : null;

module.exports = { posterFallbackUrl };
