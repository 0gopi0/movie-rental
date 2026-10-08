import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, formatPrice } from '../api/client.js';
import PosterImage from '../components/PosterImage.jsx';

const TEST_CARDS = [
  { label: 'Success', number: '4242 4242 4242 4242' },
  { label: 'Decline', number: '4000 0000 0000 0002' },
];

export default function Checkout() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [card, setCard] = useState({ number: TEST_CARDS[0].number, expiry: '12/30', cvc: '123' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setCard({ ...card, [k]: e.target.value });

  useEffect(() => {
    api(`/movies/${movieId}`)
      .then(({ movie }) => {
        if (movie.rental?.active) navigate(`/watch/${movieId}`, { replace: true }); // already rented
        else setMovie(movie);
      })
      .catch((e) => setError(e.message));
  }, [movieId, navigate]);

  async function onPay(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/payments/checkout', { method: 'POST', body: { movieId: Number(movieId), card } });
      navigate(`/watch/${movieId}`, { replace: true });
    } catch (err) {
      if (err.status === 409) return navigate(`/watch/${movieId}`, { replace: true });
      setError(err.message);
      setBusy(false);
    }
  }

  if (!movie) return error ? <p className="error">{error}</p> : <div className="card form skeleton skeleton-form" aria-busy="true" />;

  return (
    <form className="card form" onSubmit={onPay}>
      <div className="test-pill">TEST MODE — no real charge</div>
      <div className="checkout-head">
        <PosterImage src={movie.posterUrl} fallback={movie.posterFallbackUrl} />
        <h1>Rent “{movie.title}”</h1>
      </div>
      <p className="price">{formatPrice(movie.priceCents, movie.currency)} <span className="muted">· 24-hour access</span></p>
      <p className="muted small">Prototype: unlocks a short preview clip (sample footage), not the full film.</p>
      {error && <p className="error">{error}</p>}
      <label>Card number<input value={card.number} onChange={set('number')} inputMode="numeric" autoComplete="off" required /></label>
      <div className="row">
        <label>Expiry (MM/YY)<input value={card.expiry} onChange={set('expiry')} placeholder="12/30" required /></label>
        <label>CVC<input value={card.cvc} onChange={set('cvc')} inputMode="numeric" required /></label>
      </div>
      <div className="test-cards">
        <span className="muted small">Test cards:</span>
        {TEST_CARDS.map((c) => (
          <button type="button" key={c.number} className="chip" onClick={() => setCard({ ...card, number: c.number })}>
            {c.label} <span className="muted">{c.number}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-block" disabled={busy}>
        {busy ? <><span className="spinner" /> Processing…</> : `Pay ${formatPrice(movie.priceCents, movie.currency)}`}
      </button>
    </form>
  );
}
