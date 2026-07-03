import { Navigate } from "react-router-dom";

// Wrap any page with this to require an admin login first.
// Usage: <ProtectedRoute><AdminPage /></ProtectedRoute>
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}