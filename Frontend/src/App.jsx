import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BuyerPage from "./pages/BuyerPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function Navbar() {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem("admin_token");
  const isActive = (path) => (location.pathname === path ? "nav-link active" : "nav-link");

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">ACSHUB Platform</Link>
      <div className="nav-links">
        <Link to="/" className={isActive("/")}>Home</Link>
        <Link to="/buyer-onboarding" className={isActive("/buyer-onboarding")}>Buyer Form</Link>
        <Link to="/admin" className={isActive("/admin")}>Admin Panel</Link>
        {!isLoggedIn && (
          <Link to="/admin-login" className={isActive("/admin-login")}>Admin Login</Link>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      {/* This navbar renders above every route below, so Home / Buyer Form /
          Admin links are present on every page automatically. */}
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/buyer-onboarding" element={<BuyerPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}