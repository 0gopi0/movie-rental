import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, formatPrice } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Countdown from '../components/Countdown.jsx';
import { formatRating } from '../components/MovieCard.jsx';
import PosterImage from '../components/PosterImage.jsx';

export default function MovieDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState('');
  const priceCardRef = useRef(null);
  const [priceCardVisible, setPriceCardVisible] = useState(true);

  const load = useCallback(() => {
    api(`/movies/${id}`).then((d) => setMovie(d.movie)).catch((e) => setError(e.message));
  }, [id]);

  // Reload when auth state settles so the rental status reflects the logged-in user.
  useEffect(() => {
    if (!authLoading) load();
  }, [load, authLoading, user]);

  // Mobile: show the sticky rent bar only while the price card is scrolled out of view.
  useEffect(() => {
    const el = priceCardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPriceCardVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [movie]);

  if (error) return <p className="error">{error}</p>;
  if (!movie) return <DetailSkeleton />;

  const rental = movie.rental;
  const rented = Boolean(user && rental?.active);
  const price = formatPrice(movie.priceCents, movie.currency);
  const isUpcoming = movie.status === 'upcoming';
  let cta;
  if (isUpcoming) {
    // Teaser only: no rent/checkout until it becomes the 'now' feature.
    cta = (
      <span className="btn btn-lg btn-block btn-disabled" aria-disabled="true" title="Available on release">
        Coming {movie.releaseDate ? new Date(movie.releaseDate + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'soon'} · {price}
      </span>
    );
  } else if (!user) {
    cta = <Link className="btn btn-lg btn-block" to={`/login?next=${encodeURIComponent(`/movies/${id}`)}`}>Login to rent · {price}</Link>;
  } else if (rented) {
    cta = <Link className="btn btn-lg btn-block" to={`/watch/${id}`}>▶ Play preview clip</Link>;
  } else {
    cta = <Link className="btn btn-lg btn-block" to={`/checkout/${id}`}>Rent now · {price}</Link>;
  }

  const rating = formatRating(movie.rating);
  return (
    <div className="detail-page">
      <div className="detail" style={{ '--hero-img': `url(${movie.posterUrl})` }}>
        <div className="detail-backdrop" aria-hidden="true" />
        <PosterImage className="detail-poster" src={movie.posterUrl} fallback={movie.posterFallbackUrl} alt={movie.title} />
        <div className="detail-info">
          {location.state?.expired && <p className="error">Your rental for this movie has expired. Rent again to keep watching.</p>}
          <h1>{movie.title}</h1>
          <p className="hero-meta">
            {rating && <span className="rating">★ {rating}</span>}
            {movie.year && <span>{movie.year}</span>}
            {movie.genre && <span>{movie.genre}</span>}
            <span>{movie.durationMin} min</span>
          </p>
          <section ref={priceCardRef} className={`price-card${rented ? ' is-rented' : ''}`} aria-label="Rental price">
            <div className="price-card-top">
              <p className="price-amount">
                <span className="price-label">{rented ? 'You rented this for' : 'Rent for'}</span>
                {price}
              </p>
              {rented
                ? <span className="pill pill-live"><Countdown to={rental.expiresAt} onExpire={load} /></span>
                : <span className="access-badge">⏱ 24-hour access</span>}
            </div>
            <p className="price-perks">Watch as many times as you like for 24 hours from payment. One-time charge, no subscription.</p>
            {cta}
          </section>
          <p className="detail-desc">{movie.description}</p>
          <p className="preview-note">
            <span className="preview-badge">Prototype preview clip</span>
            Renting unlocks a short sample clip (Blender open-movie footage), not the full film. Full films are not included in this prototype.
          </p>
        </div>
      </div>
      {movie.trailerYoutubeId && <Trailer videoId={movie.trailerYoutubeId} title={movie.title} />}
      <div className={`rent-bar${priceCardVisible ? '' : ' visible'}`} inert={priceCardVisible}>
        <div className="rent-bar-price">
          <strong>{price}</strong>
          {rented ? <Countdown to={rental.expiresAt} /> : <span className="muted">24-hour access</span>}
        </div>
        {cta}
      </div>
    </div>
  );
}

// Official trailer, embedded from the T-Series YouTube channel (privacy-enhanced youtube-nocookie domain).
function Trailer({ videoId, title }) {
  const label = 'Official Trailer — © T-Series';
  return (
    <section className="trailer" aria-label={`${title} – ${label}`}>
      <h2 className="section-title">{label}</h2>
      <div className="trailer-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`}
          title={label}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <p className="muted small">
        Trailer © T-Series, played via YouTube.{' '}
        <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`} target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
      </p>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail" aria-busy="true">
      <div className="detail-poster skeleton skeleton-poster" />
      <div className="detail-info">
        <div className="skeleton skeleton-line title" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
      </div>
    </div>
  );
}
