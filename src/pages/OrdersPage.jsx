import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ordersApi, shopsApi, warehousesApi } from "../services/api";
import "./OrdersRiders.css";

const STATUSES = ["pending", "planned", "picked", "delivered", "cancelled"];
const emptyForm = { shop: "", warehouse: "", deliverySlotStart: "", deliverySlotEnd: "", deliveryWindowMin: 60, items: [{ name: "", quantity: 1, price: "" }] };
const idOf = (v) => typeof v === "string" ? v : v?._id || v?.id || "";
const listOf = (r) => Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.orders) ? r.data.orders : Array.isArray(r?.orders) ? r.orders : [];
const oneOf = (r) => r?.data?.order || r?.data || r?.order || r;

export default function OrdersPage() {
  const { user } = useAuth();
  const isWholesaler = user?.role === "wholesaler";
  const isShopkeeper = user?.role === "shopkeeper";
  const isRider = user?.role === "rider";
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true); setError("");
    try { setOrders(listOf(await ordersApi.getAll(statusFilter || undefined))); }
    catch (err) { setError(err.message || "Orders could not be loaded."); }
    finally { setLoading(false); }
  }, [statusFilter]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (!isWholesaler) return;
    Promise.all([shopsApi.getAll(), warehousesApi.getAll()])
      .then(([shopResult, warehouseResult]) => {
        const shopList = listOf(shopResult), warehouseList = listOf(warehouseResult);
        setShops(shopList); setWarehouses(warehouseList);
        setForm((old) => ({ ...old, shop: old.shop || idOf(shopList[0]), warehouse: old.warehouse || idOf(warehouseList[0]) }));
      })
      .catch((err) => setError(err.message || "Shops or warehouses could not be loaded."));
  }, [isWholesaler]);

  const updateField = (event) => setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  const updateItem = (index, field, value) => setForm((old) => ({ ...old, items: old.items.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
  const totalAmount = form.items.reduce((sum, item) => sum + (Number(item.quantity) > 0 && Number(item.price) >= 0 ? Number(item.quantity) * Number(item.price) : 0), 0);

  async function createOrder(event) {
    event.preventDefault(); setError(""); setMessage("");
    const items = form.items.map((item) => ({ name: item.name.trim(), quantity: Number(item.quantity), price: Number(item.price) }));
    if (!form.shop || !form.warehouse) { setError("Select a kirana shop and one of your warehouses."); return; }
    if (!form.deliverySlotStart || !form.deliverySlotEnd || new Date(form.deliverySlotStart) <= new Date() || new Date(form.deliverySlotEnd) <= new Date(form.deliverySlotStart)) { setError("Choose a future delivery slot; end must be after start."); return; }
    if (items.some((item) => !item.name || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.price) || item.price < 0)) { setError("Each item needs a name, positive quantity and valid price."); return; }
    setSaving(true);
    try {
      await ordersApi.createManual({
        shop: form.shop, warehouse: form.warehouse,
        deliverySlotStart: new Date(form.deliverySlotStart).toISOString(),
        deliverySlotEnd: new Date(form.deliverySlotEnd).toISOString(),
        deliveryWindowMin: Number(form.deliveryWindowMin), items,
      });
      setMessage("Supply order recorded successfully.");
      setForm({ ...emptyForm, shop: form.shop, warehouse: form.warehouse });
      setShowForm(false); await loadOrders();
    } catch (err) { setError(err.message || "Could not record supply order."); }
    finally { setSaving(false); }
  }

  async function changeStatus(order, nextStatus) {
    const id = idOf(order); if (!id) return;
    setError(""); setMessage("");
    try { await ordersApi.updateStatus(id, nextStatus); setMessage(`Order status updated to ${nextStatus}.`); setSelectedOrder(null); await loadOrders(); }
    catch (err) { setError(err.message || "Order status update failed."); }
  }

  async function viewDetails(order) {
    try { setSelectedOrder(oneOf(await ordersApi.getById(idOf(order)))); }
    catch (err) { setError(err.message || "Order details could not be loaded."); }
  }

  const nextRiderStatus = (order) => isRider ? (order.status === "planned" ? "picked" : order.status === "picked" ? "delivered" : null) : null;
  const canCancel = (order) => (isWholesaler || isShopkeeper) && order.status === "pending";

  return <main className="orders-page">
    <h1>{isWholesaler ? "Supply orders" : isRider ? "Assigned deliveries" : "My supply orders"}</h1>
    <p>{isWholesaler ? "Record manually received kirana orders with a warehouse and delivery time slot." : isRider ? "View assigned deliveries and update delivery progress." : "Track supply orders placed for your kirana shop."}</p>
    {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
    {message && <p role="status" style={{ color: "#15803d" }}>{message}</p>}
    <section style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
      <label>Filter by status{" "}<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      {isWholesaler && <button type="button" onClick={() => setShowForm((v) => !v)}>{showForm ? "Close Form" : "Record supply order"}</button>}
      <button type="button" onClick={loadOrders}>Refresh</button>
    </section>

    {isWholesaler && showForm && <form onSubmit={createOrder} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 18, marginBottom: 24, display: "grid", gap: 12 }}>
      <h2>Record manual order</h2>
      <label>Kirana shop<select name="shop" value={form.shop} onChange={updateField} required><option value="">Select shop</option>{shops.map((shop) => <option key={idOf(shop)} value={idOf(shop)}>{shop.name} — {shop.area || shop.address}</option>)}</select></label>
      <label>Your warehouse<select name="warehouse" value={form.warehouse} onChange={updateField} required><option value="">Select warehouse</option>{warehouses.map((w) => <option key={idOf(w)} value={idOf(w)}>{w.name} — {w.address}</option>)}</select></label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label>Delivery slot starts<input name="deliverySlotStart" type="datetime-local" value={form.deliverySlotStart} onChange={updateField} required /></label>
        <label>Delivery slot ends<input name="deliverySlotEnd" type="datetime-local" value={form.deliverySlotEnd} onChange={updateField} required /></label>
      </div>
      <label>Delivery window (minutes)<input name="deliveryWindowMin" type="number" min="1" value={form.deliveryWindowMin} onChange={updateField} required /></label>
      <h3>Items</h3>
      {form.items.map((item, index) => <div key={index} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input placeholder="Item name" value={item.name} onChange={(e) => updateItem(index, "name", e.target.value)} required />
        <input aria-label="Quantity" type="number" min="1" step="1" placeholder="Quantity" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} required />
        <input aria-label="Price" type="number" min="0" step="any" placeholder="Unit price" value={item.price} onChange={(e) => updateItem(index, "price", e.target.value)} required />
        {form.items.length > 1 && <button type="button" onClick={() => setForm((old) => ({ ...old, items: old.items.filter((_, i) => i !== index) }))}>Remove</button>}
      </div>)}
      <button type="button" onClick={() => setForm((old) => ({ ...old, items: [...old.items, { name: "", quantity: 1, price: "" }] }))}>Add item</button>
      <p><strong>Estimated total:</strong> ₹{totalAmount.toFixed(2)}</p>
      <button type="submit" disabled={saving || !shops.length || !warehouses.length}>{saving ? "Saving..." : "Save supply order"}</button>
      {(!shops.length || !warehouses.length) && <p>Create/activate a kirana shop and warehouse first.</p>}
    </form>}

    {selectedOrder && <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 12, marginBottom: 20 }}>
      <h2>Order details</h2><p><strong>Order ID:</strong> {idOf(selectedOrder)}</p><p><strong>Shop:</strong> {selectedOrder.shop?.name || selectedOrder.shop || "—"}</p><p><strong>Status:</strong> {selectedOrder.status || "—"}</p><p><strong>Address:</strong> {selectedOrder.deliveryAddress || "—"}</p><p><strong>Delivery slot:</strong> {selectedOrder.deliverySlotStart ? new Date(selectedOrder.deliverySlotStart).toLocaleString() : "—"} – {selectedOrder.deliverySlotEnd ? new Date(selectedOrder.deliverySlotEnd).toLocaleString() : "—"}</p><p><strong>Total:</strong> ₹{selectedOrder.totalAmount ?? "—"}</p>
      <h3>Items</h3>{(selectedOrder.items || []).map((item, i) => <p key={i}>{item.name} — {item.quantity} × ₹{item.price}</p>)}<button type="button" onClick={() => setSelectedOrder(null)}>Close details</button>
    </section>}

    <section><h2>Order list ({orders.length})</h2>
      {loading ? <p>Loading orders...</p> : !orders.length ? <p>No orders found for this filter.</p> : <div style={{ display: "grid", gap: 12 }}>
        {orders.map((order, index) => {
          const orderId = idOf(order) || `order-${index}`, next = nextRiderStatus(order);
          const shopName = typeof order.shop === "object" ? order.shop?.name : order.shopName || "";
          return <article key={orderId} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
            <h3>{shopName || order.customerName || "Supply order"}</h3><p><strong>Status:</strong> {order.status || "—"}</p><p><strong>Address:</strong> {order.deliveryAddress || order.shop?.address || "—"}</p><p><strong>Delivery slot:</strong> {order.deliverySlotStart ? new Date(order.deliverySlotStart).toLocaleString() : "Not set"}</p><p><strong>Total:</strong> ₹{order.totalAmount ?? "—"} · <strong>Items:</strong> {order.items?.length ?? 0}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => viewDetails(order)}>View details</button>{canCancel(order) && <button type="button" onClick={() => changeStatus(order, "cancelled")}>Cancel order</button>}{next && <button type="button" onClick={() => changeStatus(order, next)}>Mark {next}</button>}</div>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
