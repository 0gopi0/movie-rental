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
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="site-footer">
        Posters via <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a>
        {' · '}Trailers via YouTube (T-Series){' · '}Full films not included in prototype
        <span className="small">This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
      </footer>
    </>
  );
}
