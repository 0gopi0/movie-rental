import { Link } from 'react-router-dom';
import { formatPrice } from '../../api/client.js';

const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Shared by the dashboard (latest 10) and the Sales page. Wrapped so it scrolls sideways on phones.
export default function RentalsTable({ rentals, empty = 'No rentals yet.' }) {
  if (rentals.length === 0) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr><th>User</th><th>Movie</th><th className="num">Amount</th><th>Rented</th><th>Expires</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rentals.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.userName}</strong><div className="muted small">{r.userEmail}</div></td>
              <td><Link to={`/movies/${r.movieId}`}>{r.movieTitle}</Link></td>
              <td className="num">{formatPrice(r.amountCents, r.currency)}</td>
              <td className="nowrap">{fmt(r.startsAt)}</td>
              <td className="nowrap">{fmt(r.expiresAt)}</td>
              <td><span className={`status ${r.active ? 'status-active' : 'status-expired'}`}>{r.active ? 'Active' : 'Expired'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
