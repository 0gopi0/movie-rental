import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';

const EMPTY = {
  title: '', year: '', genre: '', durationMin: '', priceInr: '', description: '',
  posterUrl: '', trailerYoutubeId: '', videoPath: '', rating: '',
};

// API movie -> form strings (price shown in rupees, stored in paise).
const toForm = (m) => ({
  title: m.title || '',
  year: m.year ?? '',
  genre: m.genre || '',
  durationMin: m.durationMin ?? '',
  priceInr: m.priceCents / 100,
  description: m.description || '',
  posterUrl: m.posterUrl || '',
  trailerYoutubeId: m.trailerYoutubeId || '',
  videoPath: m.videoPath || '',
  rating: m.rating ?? '',
});

export default function AdminMovieForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [posterOk, setPosterOk] = useState(true);

  useEffect(() => {
    const req = editing ? api(`/admin/movies/${id}`) : api('/admin/movies');
    req
      .then((d) => {
        setVideos(d.videos);
        setForm(editing ? toForm(d.movie) : { ...EMPTY, videoPath: d.videos[0] || '' });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, editing]);

  useEffect(() => setPosterOk(true), [form.posterUrl]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(editing ? `/admin/movies/${id}` : '/admin/movies', { method: editing ? 'PUT' : 'POST', body: form });
      navigate('/admin/movies');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  // Keep a custom/legacy path selectable even if it isn't in the videos folder listing.
  const videoOptions = form.videoPath && !videos.includes(form.videoPath) ? [form.videoPath, ...videos] : videos;

  return (
    <>
      <p className="small"><Link to="/admin/movies">← Back to movies</Link></p>
      <h1>{editing ? `Edit: ${form.title || 'movie'}` : 'Add movie'}</h1>
      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="admin-form-fields">
          {error && <p className="error" role="alert">{error}</p>}
          <label>Title *<input value={form.title} onChange={set('title')} required maxLength={200} autoFocus={!editing} /></label>
          <div className="row">
            <label>Year<input type="number" min="1888" max="2100" value={form.year} onChange={set('year')} /></label>
            <label>Duration (min)<input type="number" min="1" max="600" value={form.durationMin} onChange={set('durationMin')} /></label>
          </div>
          <div className="row">
            <label>Genre<input value={form.genre} onChange={set('genre')} placeholder="Drama · Romance" /></label>
            <label>Rating (0–10)<input type="number" min="0" max="10" step="0.1" value={form.rating} onChange={set('rating')} /></label>
          </div>
          <label>Price (₹ INR) *<input type="number" min="1" max="100000" step="0.01" value={form.priceInr} onChange={set('priceInr')} required placeholder="149" /></label>
          <label>Description<textarea rows={4} value={form.description} onChange={set('description')} /></label>
          <label>Poster URL<input value={form.posterUrl} onChange={set('posterUrl')} placeholder="https://image.tmdb.org/t/p/w500/…" /></label>
          <label>
            Trailer YouTube ID
            <input value={form.trailerYoutubeId} onChange={set('trailerYoutubeId')} placeholder="FyXXgpPqe6w" pattern="[\w-]{11}" title="11-character YouTube video ID" />
          </label>
          <label>
            Video file *
            <select value={form.videoPath} onChange={set('videoPath')} required>
              {videoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <span className="small">Files in <code>server/public/videos/</code>. Never sent to customers.</span>
          </label>
          <div className="row-actions">
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add movie'}</button>
            <Link to="/admin/movies" className="btn btn-secondary">Cancel</Link>
          </div>
        </div>
        <aside className="poster-preview">
          <span className="price-label">Poster preview</span>
          {form.posterUrl && posterOk ? (
            <img src={form.posterUrl} alt="Poster preview" onError={() => setPosterOk(false)} />
          ) : (
            <div className="poster-placeholder">{form.posterUrl ? 'Image failed to load' : 'No poster URL'}</div>
          )}
        </aside>
      </form>
    </>
  );
}
