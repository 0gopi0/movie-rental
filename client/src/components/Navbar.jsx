import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false); // mobile menu

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <nav className={`navbar${open ? ' open' : ''}`}>
      <Link to="/" className="brand">
        <span className="brand-mark">▶</span>MovieRental
      </Link>
      <button
        className="nav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="nav-links"
        onClick={() => setOpen((o) => !o)}
      >
        <span /><span /><span />
      </button>
      <div className="nav-links" id="nav-links">
        <NavLink to="/" end>Browse</NavLink>
        {user ? (
          <>
            <NavLink to="/rentals">My Rentals</NavLink>
            {user.isAdmin && <NavLink to="/admin">Admin</NavLink>}
            <span className="nav-user" title={user.email}>
              <span className="avatar" aria-hidden="true">{user.name?.[0]?.toUpperCase() || '?'}</span>
              <span className="nav-user-name">{user.name}</span>
            </span>
            <button className="btn-link nav-logout" onClick={() => { logout(); navigate('/'); }}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register" className="nav-cta">Sign up</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
