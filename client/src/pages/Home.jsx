import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice } from '../api/client.js';
import MovieCard, { MovieCardSkeleton, formatRating } from '../components/MovieCard.jsx';
import PosterImage from '../components/PosterImage.jsx';
import Carousel from '../components/Carousel.jsx';

// Featured = highest-rated movie (ties -> lowest id).
const pickFeatured = (movies) =>
  movies.reduce((best, m) => (Number(m.rating || 0) > Number(best.rating || 0) ? m : best), movies[0]);

const byRating = (a, b) => Number(b.rating || 0) - Number(a.rating || 0);
const hasGenre = (m, ...genres) => genres.some((g) => (m.genre || '').includes(g));

// Home rows, derived client-side from /api/movies (titles may appear in several rows).
// There is no sales data yet, so "Best Sellers" is ordered by price (premium titles first).
const ROWS = [
  { title: 'Trending Now', pick: (ms) => [...ms].sort(byRating) },
  { title: 'Best Sellers', pick: (ms) => [...ms].sort((a, b) => b.priceCents - a.priceCents || byRating(a, b)) },
  { title: 'Romantic Hits', pick: (ms) => ms.filter((m) => hasGenre(m, 'Romance')).sort(byRating) },
  { title: 'Action Blockbusters', pick: (ms) => ms.filter((m) => hasGenre(m, 'Action')).sort(byRating) },
  { title: 'Comedy Nights', pick: (ms) => ms.filter((m) => hasGenre(m, 'Comedy')).sort(byRating) },
  { title: 'New Releases', pick: (ms) => [...ms].sort((a, b) => (b.year || 0) - (a.year || 0)) },
];
const ROW_LIMIT = 10;

function Hero({ movie }) {
  const rating = formatRating(movie.rating);
  return (
    <section className="hero" style={{ '--hero-img': `url(${movie.posterUrl})` }}>
      <div className="hero-backdrop" aria-hidden="true" />
      <div className="hero-content">
        <span className="hero-kicker">Featured</span>
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
      <PosterImage className="hero-poster" src={movie.posterUrl} fallback={movie.posterFallbackUrl} />
    </section>
  );
}

export default function Home() {
  const [movies, setMovies] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/movies').then((d) => setMovies(d.movies)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Could not load movies: {error}</p>;
  return (
    <>
      {movies?.length ? <Hero movie={pickFeatured(movies)} /> : <div className="hero skeleton" aria-hidden="true" />}
      {ROWS.map(({ title, pick }) => {
        const rowMovies = movies && pick(movies).slice(0, ROW_LIMIT);
        return rowMovies?.length === 0 ? null : <Carousel key={title} title={title} movies={rowMovies} />;
      })}
      <h2 className="section-title">All T-Series titles · rent for 24 hours</h2>
      <div className="grid" aria-busy={!movies}>
        {movies
          ? movies.map((m) => <MovieCard key={m.id} movie={m} />)
          : Array.from({ length: 6 }, (_, i) => <MovieCardSkeleton key={i} />)}
      </div>
      {movies?.length === 0 && <p className="muted">No movies yet.</p>}
    </>
  );
}
