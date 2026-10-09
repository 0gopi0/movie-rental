import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice } from '../../api/client.js';
import PosterImage from '../../components/PosterImage.jsx';

const STATUS_LABEL = { now: 'Now showing', upcoming: 'Coming next', archived: 'Archived' };

export default function AdminMovies() {
  const [movies, setMovies] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rotating, setRotating] = useState(false);

  const load = useCallback(() => {
    api('/admin/movies').then((d) => setMovies(d.movies)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function onDelete(m) {
    if (!window.confirm(`Delete "${m.title}"? This can't be undone.`)) return;
    setBusyId(m.id);
    setError('');
    try {
      await api(`/admin/movies/${m.id}`, { method: 'DELETE' });
      setMovies((list) => list.filter((x) => x.id !== m.id));
    } catch (e) {
      setError(e.message); // 409 explains why (active rentals or sales history)
    } finally {
      setBusyId(null);
    }
  }

  // Monthly swap: archive the current feature, promote the upcoming teaser.
  async function onRotate() {
    const next = movies?.find((m) => m.status === 'upcoming');
    if (!window.confirm(
      next
        ? `Monthly rotation: archive the current feature and make "${next.title}" the new rental?`
        : 'No upcoming movie set. Add one with the "Coming next" slot first.'
    )) return;
    if (!next) return;
    setRotating(true);
    setError('');
    try {
      const d = await api('/admin/movies/rotate', { method: 'POST' });
      setMovies((list) => list.map((x) => {
        if (x.id === d.movie.id) return d.movie;
        if (x.status === 'now') return { ...x, status: 'archived', releaseDate: null };
        return x;
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setRotating(false);
    }
  }

  const nowMovie = movies?.find((m) => m.status === 'now');
  const upcomingMovie = movies?.find((m) => m.status === 'upcoming');

  return (
    <>
      <div className="admin-panel-head">
        <h1>Movies {movies && <span className="muted">({movies.length})</span>}</h1>
        <div className="row-actions">
          <button className="btn btn-secondary" onClick={onRotate} disabled={rotating || !movies || !upcomingMovie} title={upcomingMovie ? `Promote "${upcomingMovie.title}"` : 'Set an upcoming movie first'}>
            {rotating ? 'Rotating…' : '⇄ Monthly rotation'}
          </button>
          <Link to="/admin/movies/new" className="btn">+ Add movie</Link>
        </div>
      </div>
      {movies && (
        <p className="small">
          Now showing: <strong>{nowMovie ? nowMovie.title : '— none —'}</strong>
          {' · '}Coming next: <strong>{upcomingMovie ? `${upcomingMovie.title}${upcomingMovie.releaseDate ? ` (${upcomingMovie.releaseDate})` : ''}` : '— none —'}</strong>
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {!movies && !error && <p className="muted">Loading…</p>}
      {movies && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Movie</th><th>Slot</th><th>Year</th><th>Genre</th><th className="num">Price</th><th className="num">Rating</th><th className="num">Rentals</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {movies.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="admin-movie">
                      <PosterImage src={m.posterUrl} fallback={m.posterFallbackUrl} alt="" />
                      <div>
                        <Link to={`/movies/${m.id}`}><strong>{m.title}</strong></Link>
                        <div className="muted small">#{m.id} · {m.videoPath}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status ${m.status === 'now' ? 'status-active' : m.status === 'upcoming' ? 'status-upcoming' : 'status-expired'}`}>
                      {STATUS_LABEL[m.status] || m.status}
                    </span>
                    {m.status === 'upcoming' && m.releaseDate && <div className="muted small nowrap">{m.releaseDate}</div>}
                  </td>
                  <td>{m.year ?? '—'}</td>
                  <td className="nowrap">{m.genre || '—'}</td>
                  <td className="num">{formatPrice(m.priceCents, m.currency)}</td>
                  <td className="num">{m.rating ?? '—'}</td>
                  <td className="num">
                    {m.totalRentals}
                    {m.activeRentals > 0 && <div><span className="status status-active">{m.activeRentals} active</span></div>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/movies/${m.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => onDelete(m)} disabled={busyId === m.id}>
                        {busyId === m.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
