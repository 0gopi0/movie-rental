import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Checkout from './pages/Checkout.jsx';
import Player from './pages/Player.jsx';
import MyRentals from './pages/MyRentals.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminMovies from './pages/admin/AdminMovies.jsx';
import AdminMovieForm from './pages/admin/AdminMovieForm.jsx';
import AdminSales from './pages/admin/AdminSales.jsx';

export default function App() {
  return (
    <>
      <div className="test-banner">TEST MODE — mock payments only, no real charge</div>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout/:movieId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/watch/:movieId" element={<ProtectedRoute><Player /></ProtectedRoute>} />
          <Route path="/rentals" element={<ProtectedRoute><MyRentals /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="movies" element={<AdminMovies />} />
            <Route path="movies/new" element={<AdminMovieForm />} />
            <Route path="movies/:id/edit" element={<AdminMovieForm />} />
            <Route path="sales" element={<AdminSales />} />
          </Route>
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p className="footer-credits">
          <span>Posters via <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a></span>
          <span>Trailers via YouTube (T-Series)</span>
          <span>Full films not included in prototype</span>
        </p>
        <p className="small">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </footer>
    </>
  );
}
