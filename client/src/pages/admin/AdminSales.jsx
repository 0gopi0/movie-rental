import { useEffect, useState } from 'react';
import { api, formatPrice } from '../../api/client.js';
import RentalsTable from './RentalsTable.jsx';

const FILTERS = [['all', 'All'], ['active', 'Active'], ['expired', 'Expired']];

export default function AdminSales() {
  const [status, setStatus] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    api(`/admin/rentals?status=${status}`).then(setData).catch((e) => setError(e.message));
  }, [status]);

  return (
    <>
      <h1>Sales &amp; rentals</h1>
      <div className="filter-bar" role="group" aria-label="Filter rentals">
        {FILTERS.map(([value, label]) => (
          <button key={value} className={`chip${status === value ? ' chip-on' : ''}`} aria-pressed={status === value} onClick={() => setStatus(value)}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && (
        <>
          <div className="stat-grid stat-grid-2">
            <div className="stat-card stat-accent">
              <span className="price-label">Revenue ({status})</span>
              <strong className="stat-value">{formatPrice(data.totals.revenueCents)}</strong>
            </div>
            <div className="stat-card">
              <span className="price-label">Rentals ({status})</span>
              <strong className="stat-value">{data.totals.count}</strong>
            </div>
          </div>
          <RentalsTable rentals={data.rentals} empty={`No ${status === 'all' ? '' : status + ' '}rentals.`} />
          {data.totals.count > data.rentals.length && (
            <p className="muted small">Showing the latest {data.rentals.length} of {data.totals.count}. Totals cover all of them.</p>
          )}
        </>
      )}
    </>
  );
}
