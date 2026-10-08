// fetch wrapper: JSON in/out, attaches Bearer token, handles 401.
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
const TOKEN_KEY = 'token'; // localStorage is fine for a prototype; use an httpOnly cookie in production.

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);

  if (res.status === 401 && token) {
    // Session expired/invalid: clear and send to login, then come back here.
    setToken(null);
    const next = encodeURIComponent(location.pathname + location.search);
    location.assign(`/login?next=${next}`);
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const streamUrl = (movieId, streamToken) => `${BASE}/stream/${movieId}?t=${encodeURIComponent(streamToken)}`;

export const formatPrice = (cents, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
