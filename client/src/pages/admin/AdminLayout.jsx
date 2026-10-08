import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="admin">
      <div className="admin-head">
        <span className="hero-kicker">Admin</span>
        <nav className="admin-tabs" aria-label="Admin sections">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/movies">Movies</NavLink>
          <NavLink to="/admin/sales">Sales</NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
