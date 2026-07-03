import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const EDITABLE_FIELDS = [
  { key: "name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company_name", label: "Company Name" },
  { key: "business_type", label: "Business Type" },
  { key: "address", label: "Address" },
  { key: "onboarding_goal", label: "Onboarding Goal" },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const adminUsername = localStorage.getItem("admin_username");

  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Inline-edit state: which row is being edited, and its draft values
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);

  // 1. Fetch all records from Postgres via FastAPI
  const fetchBuyers = async () => {
    try {
      setErrorMessage("");
      setLoading(true);
      const res = await api.get("/buyer");
      setBuyers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching buyers:", err);
      setErrorMessage(err.response?.data?.detail || err.message || "Failed to reach backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  // 2. Delete Action
  const handleDelete = async (id) => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this buyer record?")) {
      try {
        await api.delete(`/buyer/${id}`);
        fetchBuyers();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.detail || "Failed to delete record.");
      }
    }
  };

  // 3. Approve / Reject Action (a status update, i.e. PUT /buyer/{id})
  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/buyer/${id}`, { status });
      fetchBuyers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update status.");
    }
  };

  // 4. Edit Action
  const startEdit = (buyer) => {
    setEditingId(buyer.id);
    setEditForm({ ...buyer });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = async (id) => {
    setSavingId(id);
    try {
      const { name, email, phone, company_name, business_type, address, onboarding_goal } = editForm;
      await api.put(`/buyer/${id}`, {
        name,
        email,
        phone,
        company_name,
        business_type,
        address,
        onboarding_goal,
      });
      cancelEdit();
      fetchBuyers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSavingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/admin/logout");
    } catch {
      // ignore — we're logging out client-side regardless
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    navigate("/admin-login");
  };

  if (loading) return <div className="page">Loading Dashboard Data...</div>;

  return (
    <div className="page">
      <div className="dash-header">
        <div>
          <h2 style={{ margin: 0 }}> Admin Management Dashboard</h2>
          {adminUsername && <span className="admin-whoami">Signed in as {adminUsername}</span>}
        </div>
        <div className="dash-header-actions">
          <button onClick={fetchBuyers} className="btn btn-secondary">🔄 Refresh</button>
          <button onClick={handleLogout} className="btn btn-danger">Log Out</button>
        </div>
      </div>

      {errorMessage && <div className="alert alert-error">⚠️ Error: {errorMessage}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Business Type</th>
              <th>Goal</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {buyers.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">No applications found in the database.</td>
              </tr>
            ) : (
              buyers.map((buyer, index) => {
                const buyerId = buyer.id || buyer._id || index + 1;
                const isEditing = editingId === buyerId;

                return (
                  <Fragment key={buyerId}>
                    <tr>
                      <td><strong>{buyerId}</strong></td>
                      <td>{buyer.name || "N/A"}</td>
                      <td>{buyer.email || "N/A"}</td>
                      <td>{buyer.company_name || "N/A"}</td>
                      <td>{buyer.business_type || "N/A"}</td>
                      <td>{buyer.onboarding_goal || "N/A"}</td>
                      <td>
                        <span className={`badge badge-${buyer.status || "pending"}`}>
                          {buyer.status || "pending"}
                        </span>
                      </td>
                      <td>
                        <div className="action-cell">
                          <button
                            onClick={() => handleStatusChange(buyerId, "approved")}
                            className="btn btn-success btn-sm"
                            disabled={buyer.status === "approved"}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(buyerId, "rejected")}
                            className="btn btn-danger btn-sm"
                            disabled={buyer.status === "rejected"}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => (isEditing ? cancelEdit() : startEdit(buyer))}
                            className="btn btn-secondary btn-sm"
                          >
                            {isEditing ? "Cancel" : "Edit"}
                          </button>
                          <button onClick={() => handleDelete(buyerId)} className="btn btn-danger btn-sm">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isEditing && (
                      <tr>
                        <td colSpan="8" style={{ background: "var(--surface-2)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", padding: "10px 0" }}>
                            {EDITABLE_FIELDS.map((field) => (
                              <div key={field.key}>
                                <label>{field.label}</label>
                                <input
                                  className="edit-row-input"
                                  name={field.key}
                                  value={editForm[field.key] || ""}
                                  onChange={handleEditChange}
                                />
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                            <button
                              onClick={() => saveEdit(buyerId)}
                              className="btn btn-primary btn-sm"
                              disabled={savingId === buyerId}
                            >
                              {savingId === buyerId ? "Saving..." : "Save Changes"}
                            </button>
                            <button onClick={cancelEdit} className="btn btn-secondary btn-sm">
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}