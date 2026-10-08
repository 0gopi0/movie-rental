import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { safeNext } from './Login.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form.name, form.email, form.password); // auto-login
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h1>Create account</h1>
      {error && <p className="error">{error}</p>}
      <label>Name<input value={form.name} onChange={set('name')} required autoFocus /></label>
      <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
      <label>Password<input type="password" value={form.password} onChange={set('password')} minLength={6} required /></label>
      <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      <p className="muted">Have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Login</Link></p>
    </form>
  );
}
