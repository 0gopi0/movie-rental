import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice } from '../api/client.js';
import { formatRating } from '../components/MovieCard.jsx';
import PosterImage from '../components/PosterImage.jsx';

// Single-film model: /api/movies/spotlight -> { now, upcoming }.
// Homepage shows exactly ONE featured rental in the hero + ONE upcoming teaser.

function Hero({ movie }) {
  const rating = formatRating(movie.rating);
  return (
    <section className="hero" style={{ '--hero-img': `url(${movie.posterUrl})` }}>
      <div className="hero-backdrop" aria-hidden="true" />
      <div className="hero-content">
        <span className="hero-kicker">Now showing · this month's rental</span>
        <h1 className="hero-title">{movie.title}</h1>
        <p className="hero-meta">
          {rating && <span className="rating">★ {rating}</span>}
          {movie.year && <span>{movie.year}</span>}
          {movie.genre && <span>{movie.genre}</span>}
          <span>{movie.durationMin} min</span>
        </p>
        <p className="hero-desc">{movie.description}</p>
        <div className="hero-actions">
          <Link className="btn" to={`/movies/${movie.id}`}>▶ Rent for {formatPrice(movie.priceCents, movie.currency)}</Link>
          <Link className="btn btn-secondary" to={`/movies/${movie.id}`}>ⓘ More info</Link>
        </div>
      </div>
      <PosterImage className="hero-poster" src={movie.posterUrl} fallback={movie.posterFallbackUrl} alt={movie.title} />
    </section>
  );
}

function daysUntil(dateStr) {
  const ms = Date.parse(dateStr + 'T00:00:00Z') - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function Upcoming({ movie }) {
  const d = movie.releaseDate ? daysUntil(movie.releaseDate) : null;
  const dateLabel = movie.releaseDate
    ? new Date(movie.releaseDate + 'T00:00:00Z').toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      })
    : '';
  return (
    <section className="upcoming" aria-label="Coming next month">
      <PosterImage className="upcoming-poster" src={movie.posterUrl} fallback={movie.posterFallbackUrl} alt="" />
      <div className="upcoming-info">
        <span className="hero-kicker">Coming next{dateLabel ? ` · ${dateLabel}` : ''}</span>
        <h2 className="upcoming-title">{movie.title}</h2>
        <p className="muted">{movie.genre}{movie.genre && movie.year ? ' · ' : ''}{movie.year}</p>
        {d !== null && (
          <p className="upcoming-countdown" aria-live="off">
            {d === 0 ? 'Releases today' : d === 1 ? 'Releases tomorrow' : `Releases in ${d} days`}
          </p>
        )}
        <Link className="btn btn-secondary" to={`/movies/${movie.id}`}>View teaser</Link>
      </div>
    </section>
  );
}

export default function Home() {
  const [spot, setSpot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/movies/spotlight').then(setSpot).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Could not load movies: {error}</p>;
  if (!spot) return <div className="hero skeleton" aria-hidden="true" />;

  return (
    <>
      {spot.now ? <Hero movie={spot.now} /> : <p className="muted">No featured movie right now — check back soon.</p>}
      <h2 className="section-title">Coming next month</h2>
      {spot.upcoming ? <Upcoming movie={spot.upcoming} /> : <p className="muted">Next month's pick hasn't been announced yet.</p>}
    </>
  );
}
