import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="hero">
      <h1>Buyer Onboarding Platform</h1>
     <p></p>

      <div className="option-grid">
        {/* Buyer Option */}
        <div className="option-card">
          <h3>Buyers</h3>
          <p>Onboard your company and manage your applications.</p>
          <button onClick={() => navigate("/buyer-onboarding")} className="btn btn-primary btn-block">
            Go to Buyer Portal
          </button>
        </div>

        {/* Admin Option */}
        <div className="option-card">
          <h3>Administrators</h3>
          <p>Review, approve, and manage incoming applications.</p>
          <button onClick={() => navigate("/admin")} className="btn btn-secondary btn-block">
            Go to Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}