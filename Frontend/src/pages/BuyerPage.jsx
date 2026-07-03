import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function BuyerPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    business_type: "",
    address: "",
    onboarding_goal: "",
    password: "",
    retype_password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.retype_password) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      // Force drop retype_password right before sending
      const { retype_password, ...apiPayload } = formData;

      const response = await api.post("/buyer", apiPayload);
      console.log("Success backend response:", response.data);

      alert("Success! Your onboarding application has been submitted.");
      navigate("/");
    } catch (error) {
      console.error("Submission error details:", error);
      const errorMsg = error.response?.data?.detail || "Could not connect to backend.";
      alert("Error: " + (typeof errorMsg === "object" ? JSON.stringify(errorMsg) : errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow">
      <div className="card">
        <h2 style={{ textAlign: "center", marginTop: 0 }}>Buyer Onboarding Application</h2>
        <p style={{ textAlign: "center", color: "var(--text-dim)", marginBottom: 25 }}>
          Please fill in your company details to apply for an account.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input type="text" name="phone" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Company Name</label>
            <input type="text" name="company_name" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Business Type</label>
            <input
              type="text"
              name="business_type"
              placeholder="e.g. Retail, Wholesale, Tech"
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Physical Address</label>
            <input type="text" name="address" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Onboarding Goal</label>
            <input
              type="text"
              name="onboarding_goal"
              placeholder="What are you looking to buy?"
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" name="retype_password" onChange={handleChange} required />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? "Submitting..." : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}