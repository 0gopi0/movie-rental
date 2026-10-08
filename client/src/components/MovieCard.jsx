import { Link } from 'react-router-dom';
import { formatPrice } from '../api/client.js';
import PosterImage from './PosterImage.jsx';

export const formatRating = (r) => (r == null ? null : Number(r).toFixed(1));

export default function MovieCard({ movie }) {
  const rating = formatRating(movie.rating);
  return (
    <Link to={`/movies/${movie.id}`} className="movie-card">
      <div className="movie-card-poster">
        <PosterImage src={movie.posterUrl} fallback={movie.posterFallbackUrl} alt={movie.title} loading="lazy" />
        {rating && <span className="badge badge-rating" aria-label={`Rated ${rating} out of 10`}>★ {rating}</span>}
        <span className="badge badge-price">{formatPrice(movie.priceCents, movie.currency)}</span>
        <span className="movie-card-play" aria-hidden="true">▶</span>
      </div>
      <div className="movie-card-body">
        <h3>{movie.title}</h3>
        <span className="muted">{movie.year ? `${movie.year} · ` : ''}{movie.genre ? `${movie.genre} · ` : ''}{movie.durationMin} min</span>
      </div>
    </Link>
  );
}

// Placeholder shown while the movie list loads.
export function MovieCardSkeleton() {
  return (
    <div className="movie-card skeleton-card" aria-hidden="true">
      <div className="movie-card-poster skeleton" />
      <div className="movie-card-body">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
    </div>
  );
}
