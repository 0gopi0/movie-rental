import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, streamUrl } from '../api/client.js';
import Countdown from '../components/Countdown.jsx';

export default function Player() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState('');

  const toExpired = useCallback(
    () => navigate(`/movies/${movieId}`, { replace: true, state: { expired: true } }),
    [movieId, navigate]
  );

  // Server re-checks the rental when issuing the stream token (and on every byte-range request).
  const loadToken = useCallback(async () => {
    try {
      const { token, rentalExpiresAt } = await api(`/stream/${movieId}/token`);
      setExpiresAt(rentalExpiresAt);
      setSrc(streamUrl(movieId, token));
      return true;
    } catch (err) {
      if (err.status === 403) toExpired();
      else setError(err.message);
      return false;
    }
  }, [movieId, toExpired]);

  useEffect(() => {
    loadToken();
    api(`/movies/${movieId}`).then((d) => setTitle(d.movie.title)).catch(() => {});
  }, [movieId, loadToken]);

  // <video> can't expose HTTP status. On error, fetch a fresh token: if the rental is gone,
  // loadToken redirects; otherwise (e.g. 2h stream token lapsed) resume where we were.
  async function onVideoError() {
    const v = videoRef.current;
    const at = v?.currentTime || 0;
    if (await loadToken()) {
      const resume = () => {
        v.currentTime = at;
        v.play().catch(() => {});
      };
      v?.addEventListener('loadedmetadata', resume, { once: true });
    }
  }

  if (error) return <p className="error">{error}</p>;
  return (
    <div className="player">
      <div className="player-head">
        <Link className="btn btn-secondary btn-sm" to={`/movies/${movieId}`}>← Back</Link>
        <h1>{title} <span className="preview-badge">Prototype preview clip</span></h1>
        {expiresAt && <span className="pill"><Countdown to={expiresAt} onExpire={toExpired} /></span>}
      </div>
      <div className="player-frame">
        {src ? (
          <video ref={videoRef} key={src} src={src} controls autoPlay playsInline preload="metadata" onError={onVideoError} />
        ) : (
          <div className="player-loading"><span className="spinner" /> Checking your rental…</div>
        )}
      </div>
      <p className="preview-note">
        This is placeholder footage from a Blender Foundation open movie (CC BY 3.0), not {title ? `“${title}”` : 'the film'}.
        Full films are not included in this prototype; streaming them needs a licensed source.
      </p>
    </div>
  );
}
