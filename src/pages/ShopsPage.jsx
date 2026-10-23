
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { shopsApi } from "../services/api";

const emptyForm = {
  name: "",
  ownerName: "",
  phone: "",
  address: "",
  lat: "",
  lng: "",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #e4deee",
  borderRadius: 9,
  font: "inherit",
  fontSize: 13,
  background: "#fff",
  color: "#302641",
};

const primaryButton = {
  border: 0,
  borderRadius: 9,
  padding: "10px 15px",
  background: "#60439e",
  color: "#fff",
  fontWeight: 650,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid #e4deee",
  borderRadius: 9,
  padding: "9px 13px",
  background: "#fff",
  color: "#51416f",
  fontWeight: 600,
  cursor: "pointer",
};

function unwrapList(result) {
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.shops)) return result.shops;
  if (Array.isArray(result)) return result;
  return [];
}

function unwrapShop(result) {
  return result?.data?.shop || result?.data || result?.shop || result;
}

export default function ShopsPage() {
  const { user } = useAuth();
  const isShopkeeper = user?.role === "shopkeeper";

  const [shops, setShops] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await shopsApi.getAll();
      setShops(unwrapList(result));
    } catch (err) {
      setError(err.message || "Could not load shops.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isShopkeeper) {
      setError("Only shopkeepers can create or update shops.");
      return;
    }

    if (!form.name.trim() || !form.address.trim()) {
      setError("Shop name and address are required.");
      return;
    }

    const lat = Number(form.lat);
    const lng = Number(form.lng);

    if (
      form.lat.trim() === "" ||
      form.lng.trim() === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setError("Enter a valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }

    const payload = {
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      location: { lat, lng },
    };

    setSaving(true);

    try {
      if (editingId) {
        await shopsApi.update(editingId, payload);
        setMessage("Shop updated successfully.");
      } else {
        await shopsApi.create(payload);
        setMessage("Shop created successfully.");
      }

      resetForm();
      setMessage(editingId ? "Shop updated successfully." : "Shop created successfully.");
      await loadShops();
    } catch (err) {
      setError(err.message || "Could not save shop.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(shop) {
    const id = shop._id || shop.id;

    if (!id) {
      setError("This shop has no usable ID.");
      return;
    }

    setError("");
    setMessage("");

    try {
      // Fetch the latest record before editing.
      const result = await shopsApi.getById(id);
      const latest = unwrapShop(result);
      const location = latest.location || shop.location || {};

      setForm({
        name: latest.name || "",
        ownerName: latest.ownerName || "",
        phone: latest.phone || "",
        address: latest.address || "",
        lat: location.lat ?? "",
        lng: location.lng ?? "",
      });
      setEditingId(id);
    } catch (err) {
      setError(err.message || "Could not load shop details.");
    }
  }

  async function handleDelete(shop) {
    const id = shop._id || shop.id;

    if (!id) {
      setError("This shop has no usable ID.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${shop.name || "this shop"}"? This action may not be reversible.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setBusyId(id);

    try {
      await shopsApi.remove(id);
      setShops((current) =>
        current.filter((item) => (item._id || item.id) !== id)
      );

      if (editingId === id) resetForm();

      setMessage("Shop deleted successfully.");
    } catch (err) {
      setError(err.message || "Could not delete shop.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 22, color: "#302641" }}>
      <div>
        <div
          style={{
            color: "#8069ad",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.7,
          }}
        >
          SHOP MANAGEMENT
        </div>
        <h1 style={{ margin: "8px 0", fontSize: 29, letterSpacing: -0.8 }}>
          Shops
        </h1>
        <p style={{ margin: 0, color: "#81788f", fontSize: 13 }}>
          {isShopkeeper
            ? "Manage your registered stores and their locations."
            : "Browse active kirana shops served by your warehouses."}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 13,
            border: "1px solid #f1c5ca",
            borderRadius: 9,
            background: "#fff3f4",
            color: "#a52d3b",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            padding: 13,
            border: "1px solid #cde8d7",
            borderRadius: 9,
            background: "#f1fbf4",
            color: "#216b40",
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      {isShopkeeper && (
        <section
          style={{
            padding: 22,
            border: "1px solid #ebe5f3",
            borderRadius: 15,
            background: "#fff",
          }}
        >
          <h2 style={{ margin: "0 0 18px", fontSize: 17 }}>
            {editingId ? "Edit shop" : "Register a shop"}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 15 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 14,
              }}
            >
              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 650 }}>
                Shop name *
                <input
                  style={inputStyle}
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="Aman Kirana Store"
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 650 }}>
                Area / neighbourhood *
                <input style={inputStyle} name="area" value={form.area} onChange={updateField} placeholder="Malviya Nagar" required />
              </label>

              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 650 }}>
                Owner name
                <input
                  style={inputStyle}
                  name="ownerName"
                  value={form.ownerName}
                  onChange={updateField}
                  placeholder="Owner's name"
                />
              </label>

              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 650 }}>
                Phone
                <input
                  style={inputStyle}
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField}
                  placeholder="9876543210"
                />
              </label>

              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 650 }}>
                Address *
                <input
                  style={inputStyle}
                  name="address"
                  value={form.address}
                  onChange={updateField}
                  placeholder="Area, city"
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 650 }}>
                Latitude *
                <input
                  style={inputStyle}
                  name="lat"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.lat}
                  onChange={updateField}
                  placeholder="26.854"
                  required
                />
              </label>

              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 650 }}>
                Longitude *
                <input
                  style={inputStyle}
                  name="lng"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.lng}
                  onChange={updateField}
                  placeholder="75.764"
                  required
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={primaryButton} type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create shop"}
              </button>

              {editingId && (
                <button
                  style={secondaryButton}
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section
        style={{
          padding: 22,
          border: "1px solid #ebe5f3",
          borderRadius: 15,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>Registered shops</h2>
            <p style={{ margin: "5px 0 0", color: "#81788f", fontSize: 12 }}>
              {shops.length} shop{shops.length === 1 ? "" : "s"} returned by the API
            </p>
          </div>

          <button
            style={secondaryButton}
            type="button"
            onClick={loadShops}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#81788f", fontSize: 13 }}>Loading shops...</p>
        ) : shops.length === 0 ? (
          <div
            style={{
              padding: "28px 12px",
              textAlign: "center",
              border: "1px dashed #ddd4ec",
              borderRadius: 12,
            }}
          >
            <strong style={{ fontSize: 14 }}>No shops found</strong>
            <p style={{ color: "#81788f", fontSize: 12 }}>
              {isShopkeeper
                ? "Create your first shop using the form above."
                : "No active shops are currently visible to this account."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {shops.map((shop) => {
              const id = shop._id || shop.id;
              const location = shop.location || {};

              return (
                <article
                  key={id || shop.name}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    padding: 16,
                    border: "1px solid #eee9f4",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 230px" }}>
                    <strong style={{ fontSize: 14 }}>
                      {shop.name || "Unnamed shop"}
                    </strong>
                    <p style={{ margin: "7px 0", color: "#81788f", fontSize: 12 }}>
                      {shop.address || "No address provided"}
                    </p>
                    {shop.ownerName && (
                      <p style={{ margin: "5px 0", fontSize: 12 }}>
                        Owner: {shop.ownerName}
                      </p>
                    )}
                    {shop.phone && (
                      <p style={{ margin: "5px 0", fontSize: 12 }}>
                        Phone: {shop.phone}
                      </p>
                    )}
                    {(location.lat != null || location.lng != null) && (
                      <p style={{ margin: "5px 0", color: "#81788f", fontSize: 11 }}>
                        Coordinates: {location.lat ?? "—"}, {location.lng ?? "—"}
                      </p>
                    )}
                    {shop.isActive != null && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 5,
                          padding: "4px 8px",
                          borderRadius: 20,
                          background: shop.isActive ? "#eaf8ef" : "#f5edf5",
                          color: shop.isActive ? "#267348" : "#78627f",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {shop.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>

                  {isShopkeeper && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        style={secondaryButton}
                        type="button"
                        onClick={() => handleEdit(shop)}
                        disabled={!id || busyId === id}
                      >
                        Edit
                      </button>
                      <button
                        style={{
                          ...secondaryButton,
                          color: "#b33442",
                          borderColor: "#f0d3d6",
                        }}
                        type="button"
                        onClick={() => handleDelete(shop)}
                        disabled={!id || busyId === id}
                      >
                        {busyId === id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
