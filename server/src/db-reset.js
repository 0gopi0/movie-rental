// Deletes the SQLite file; it is recreated + reseeded on next server start.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', process.env.DB_FILE || './data/movie_rental.db');
for (const f of [file, file + '-wal', file + '-shm']) fs.rmSync(f, { force: true });
console.log('Removed', file);
