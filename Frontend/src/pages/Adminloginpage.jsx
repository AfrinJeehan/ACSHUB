import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);
    try {
      const response = await api.post("/admin/login", formData);
      localStorage.setItem("admin_token", response.data.token);
      localStorage.setItem("admin_username", response.data.username);
      navigate("/admin");
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || "Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h2 style={{ textAlign: "center", marginTop: 0 }}> Admin Login</h2>
        <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 14 }}>
          Sign in to review and manage buyer applications.
        </p>

        {errorMessage && <div className="alert alert-error">⚠️ {errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" name="username" onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" onChange={handleChange} required />
          </div>
          <p>   </p>
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p></p>
        <p></p> 
      </div>
    </div>
  );
}