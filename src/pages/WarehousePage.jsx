import { useCallback, useEffect, useState } from "react";
import { warehousesApi } from "../services/api";

const emptyForm = { name: "", supplierName: "", address: "", lat: "", lng: "", serviceAreas: "" };
const idOf = (item) => item?._id || item?.id || "";
const listOf = (result) => Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setWarehouses(listOf(await warehousesApi.getAll())); }
    catch (err) { setError(err.message || "Could not load warehouses."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const change = (event) => setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError(""); setNotice("");
    const lat = Number(form.lat), lng = Number(form.lng);
    if (!form.name.trim() || !form.address.trim() || form.lat === "" || form.lng === "" ||
      !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError("Enter warehouse name, address and valid coordinates."); return;
    }
    setSaving(true);
    try {
      await warehousesApi.create({
        name: form.name.trim(), supplierName: form.supplierName.trim(), address: form.address.trim(),
        location: { lat, lng }, serviceAreas: form.serviceAreas.split(",").map((x) => x.trim()).filter(Boolean),
      });
      setForm(emptyForm); setShowForm(false); setNotice("Warehouse created successfully."); await load();
    } catch (err) { setError(err.message || "Could not create warehouse."); }
    finally { setSaving(false); }
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><div className="eyebrow">SUPPLY / LOCATIONS</div><h1>My warehouses</h1><p className="page-subtitle">Manage supplier warehouses and the areas they serve.</p></div><button className="button primary" type="button" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close form" : "Add warehouse"}</button></section>
    {error && <div className="alert error-alert" role="alert">{error}</div>}
    {notice && <div className="alert success-alert" role="status">{notice}</div>}
    {showForm && <form className="panel" onSubmit={submit} style={{display:"grid",gap:12}}>
      <h2>Warehouse details</h2>
      <label>Warehouse name<input name="name" value={form.name} onChange={change} required /></label>
      <label>Supplier / business name<input name="supplierName" value={form.supplierName} onChange={change} placeholder="Optional" /></label>
      <label>Address<input name="address" value={form.address} onChange={change} required /></label>
      <label>Service areas <span className="table-subtext">(comma-separated, optional)</span><input name="serviceAreas" value={form.serviceAreas} onChange={change} placeholder="Malviya Nagar, Jagatpura" /></label>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><label>Latitude<input name="lat" type="number" step="any" value={form.lat} onChange={change} required /></label><label>Longitude<input name="lng" type="number" step="any" value={form.lng} onChange={change} required /></label></div>
      <button className="button primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save warehouse"}</button>
    </form>}
    <section className="panel"><div className="panel-heading"><div><div className="eyebrow">YOUR SUPPLY NETWORK</div><h2>Warehouse list</h2></div><button className="button" type="button" onClick={load}>Refresh</button></div>
      {loading ? <div className="loading-state">Loading warehouses…</div> : warehouses.length ? <div className="table-wrap"><table className="orders-table"><thead><tr><th>WAREHOUSE</th><th>ADDRESS</th><th>SERVICE AREAS</th><th>STATUS</th></tr></thead><tbody>{warehouses.map((w) => <tr key={idOf(w)}><td><strong>{w.name}</strong><span className="table-subtext">{w.supplierName || "Supplier"}</span></td><td>{w.address}</td><td>{(w.serviceAreas || []).join(", ") || "All areas"}</td><td>{w.isActive === false ? "Inactive" : "Active"}</td></tr>)}</tbody></table></div> : <div className="empty-state">No warehouses yet. Add your first warehouse to start recording supply orders.</div>}
    </section>
  </div>;
}
