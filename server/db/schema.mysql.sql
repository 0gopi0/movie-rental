-- Original MySQL schema from PLAN.md, kept for the later move to MySQL.
-- The running prototype uses db/schema.sql (SQLite).
CREATE DATABASE IF NOT EXISTS movie_rental;
USE movie_rental;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_admin      TINYINT(1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movies (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  poster_url    VARCHAR(500),
  video_path    VARCHAR(500) NOT NULL,
  duration_min  INT,
  price_cents   INT NOT NULL DEFAULT 9900,
  currency      CHAR(3) NOT NULL DEFAULT 'INR',
  genre         VARCHAR(100),
  rating        DECIMAL(3,1),               -- display score out of 10
  year          INT,                        -- release year
  trailer_youtube_id VARCHAR(20),           -- official trailer, embedded via youtube-nocookie
  tmdb_id       INT NULL,                   -- themoviedb.org id (poster/metadata source)
  status        VARCHAR(10) NOT NULL DEFAULT 'archived',  -- single-film model: one 'now', at most one 'upcoming'
  release_date  DATE NULL,                  -- required when status = 'upcoming'
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  movie_id      INT NOT NULL,
  amount_cents  INT NOT NULL,
  currency      CHAR(3) NOT NULL,
  status        ENUM('pending','succeeded','failed') NOT NULL DEFAULT 'pending',
  provider      VARCHAR(30) NOT NULL DEFAULT 'mock',
  provider_ref  VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE rentals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  movie_id      INT NOT NULL,
  payment_id    INT NOT NULL UNIQUE,
  starts_at     DATETIME NOT NULL,
  expires_at    DATETIME NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (movie_id)   REFERENCES movies(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  INDEX idx_access (user_id, movie_id, expires_at)
);
