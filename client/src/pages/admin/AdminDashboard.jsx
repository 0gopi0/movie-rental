import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice } from '../../api/client.js';
import RentalsTable from './RentalsTable.jsx';

const dayLabel = (day) => new Date(day + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <div className="stat-grid" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="stat-card skeleton" />)}</div>;

  const cards = [
    { label: 'Total revenue', value: formatPrice(stats.totalRevenueCents), accent: true },
    { label: 'Rentals today', value: stats.rentalsToday, hint: 'UTC day' },
    { label: 'Active now', value: stats.activeRentals },
    { label: 'Movies', value: stats.totalMovies },
    { label: 'Users', value: stats.totalUsers },
  ];
  const max = Math.max(...stats.revenueByDay.map((d) => d.cents), 1);
  const weekTotal = stats.revenueByDay.reduce((s, d) => s + d.cents, 0);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card${c.accent ? ' stat-accent' : ''}`}>
            <span className="price-label">{c.label}</span>
            <strong className="stat-value">{c.value}</strong>
            {c.hint && <span className="muted small">{c.hint}</span>}
          </div>
        ))}
      </div>

      <section className="card admin-panel">
        <div className="admin-panel-head">
          <h2 className="section-title">Revenue, last 7 days</h2>
          <span className="muted small">{formatPrice(weekTotal)} total (UTC days)</span>
        </div>
        <ul className="bar-list">
          {stats.revenueByDay.map((d) => (
            <li key={d.day}>
              <span className="bar-label">{dayLabel(d.day)}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(d.cents / max) * 100}%` }} />
              </span>
              <span className="bar-value">{formatPrice(d.cents)}<span className="muted small"> · {d.count}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="section-title">Latest rentals</h2>
          <Link to="/admin/sales" className="btn btn-secondary btn-sm">View all sales</Link>
        </div>
        <RentalsTable rentals={stats.latestRentals} />
      </section>
    </>
  );
}
