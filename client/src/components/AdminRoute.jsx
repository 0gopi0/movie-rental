import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

// Logged-out -> login (via ProtectedRoute); logged-in non-admin -> home. The API enforces admin too.
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  return (
    <ProtectedRoute>
      {!user ? <p className="muted">Loading…</p> : user.isAdmin ? children : <Navigate to="/" replace />}
    </ProtectedRoute>
  );
}
