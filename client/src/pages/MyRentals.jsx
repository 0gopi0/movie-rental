import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import Countdown from '../components/Countdown.jsx';
import PosterImage from '../components/PosterImage.jsx';

export default function MyRentals() {
  const [rentals, setRentals] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/rentals').then((d) => setRentals(d.rentals)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <p className="error">{error}</p>;
  if (!rentals) {
    return (
      <>
        <h1>My Rentals</h1>
        <ul className="rental-list" aria-busy="true">
          {[0, 1].map((i) => <li key={i} className="skeleton skeleton-row" />)}
        </ul>
      </>
    );
  }

  const active = rentals.filter((r) => r.active);
  const expired = rentals.filter((r) => !r.active);
  const fmt = (iso) => new Date(iso).toLocaleString();

  return (
    <>
      <h1>My Rentals</h1>
      <h2>Active</h2>
      {active.length === 0 && <p className="muted">No active rentals. <Link to="/">Browse movies</Link></p>}
      <ul className="rental-list">
        {active.map((r) => (
          <li key={r.id}>
            <PosterImage src={r.posterUrl} fallback={r.posterFallbackUrl} />
            <div>
              <Link to={`/movies/${r.movieId}`}><strong>{r.title}</strong></Link>
              <div className="small"><Countdown to={r.expiresAt} onExpire={load} /></div>
            </div>
            <Link className="btn" to={`/watch/${r.movieId}`}>▶ Watch</Link>
          </li>
        ))}
      </ul>
      <h2>Expired</h2>
      {expired.length === 0 && <p className="muted">None.</p>}
      <ul className="rental-list expired">
        {expired.map((r) => (
          <li key={r.id}>
            <PosterImage src={r.posterUrl} fallback={r.posterFallbackUrl} />
            <div>
              <Link to={`/movies/${r.movieId}`}><strong>{r.title}</strong></Link>
              <div className="muted small">Expired {fmt(r.expiresAt)}</div>
            </div>
            <Link className="btn btn-secondary" to={`/movies/${r.movieId}`}>Rent again</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
