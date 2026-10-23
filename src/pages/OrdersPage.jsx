
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ordersApi, shopsApi, warehousesApi } from "../services/api";
import "./OrdersRiders.css";

const STATUSES = ["pending", "planned", "picked", "delivered", "cancelled"];

const emptyForm = {
  shop: "",
  warehouse: "",
  deliverySlotStart: "",
  deliverySlotEnd: "",
  deliveryWindowMin: 60,
  items: [{ name: "", quantity: 1, price: "" }],
};

const idOf = (value) =>
  typeof value === "string"
    ? value
    : value?._id || value?.id || "";

const listOf = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.orders)) return result.data.orders;
  if (Array.isArray(result?.orders)) return result.orders;
  return [];
};

const oneOf = (result) =>
  result?.data?.order || result?.data || result?.order || result;

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

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
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
        const result = await ordersApi.getAll(statusFilter || undefined);
      
        console.log("ORDERS API RESPONSE:", result);
      
        const parsedOrders = listOf(result);
        console.log("PARSED ORDERS:", parsedOrders);
      
        setOrders(parsedOrders);
      } catch (err) {
        console.error("LOAD ORDERS ERROR:", err);
        setError(err.message || "Orders could not be loaded.");
      } finally {
        setLoading(false);
      }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Load the reference data needed by the order forms.
  useEffect(() => {
    if (!isWholesaler && !isShopkeeper) return;

    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);

      try {
        const [shopResult, warehouseResult] = await Promise.all([
          shopsApi.getAll(),
          warehousesApi.getAll(),
        ]);

        if (!active) return;

        const shopList = listOf(shopResult);
        const warehouseList = listOf(warehouseResult);

        setShops(shopList);
        setWarehouses(warehouseList);

        setForm((old) => ({
          ...old,
          shop:
            old.shop && shopList.some((shop) => idOf(shop) === old.shop)
              ? old.shop
              : idOf(shopList[0]),
          warehouse:
            old.warehouse &&
            warehouseList.some((warehouse) => idOf(warehouse) === old.warehouse)
              ? old.warehouse
              : idOf(warehouseList[0]),
        }));
      } catch (err) {
        if (active) {
          setError(err.message || "Shops or warehouses could not be loaded.");
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, [isWholesaler, isShopkeeper]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({ ...old, [name]: value }));
  };

  const updateItem = (index, field, value) => {
    setForm((old) => ({
      ...old,
      items: old.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((old) => ({
      ...old,
      items: [...old.items, { name: "", quantity: 1, price: "" }],
    }));
  };

  const removeItem = (index) => {
    setForm((old) => ({
      ...old,
      items: old.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const totalAmount = form.items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.price);

    return quantity > 0 && Number.isFinite(price) && price >= 0
      ? sum + quantity * price
      : sum;
  }, 0);

  function validateForm() {
    if (!form.shop) {
      setError("Select a kirana shop.");
      return null;
    }

    if (!form.warehouse) {
      setError("Select a warehouse.");
      return null;
    }

    const start = new Date(form.deliverySlotStart);
    const end = new Date(form.deliverySlotEnd);

    if (
      !form.deliverySlotStart ||
      !form.deliverySlotEnd ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start <= new Date() ||
      end <= start
    ) {
      setError("Choose a future delivery slot; end must be after start.");
      return null;
    }

    const deliveryWindowMin = Number(form.deliveryWindowMin);

    if (!Number.isFinite(deliveryWindowMin) || deliveryWindowMin < 1) {
      setError("Delivery window must be at least 1 minute.");
      return null;
    }

    const items = form.items.map((item) => ({
      name: item.name.trim(),
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

    if (
      !items.length ||
      items.some(
        (item) =>
          !item.name ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          !Number.isFinite(item.price) ||
          item.price < 0
      )
    ) {
      setError("Each item needs a name, positive quantity and valid price.");
      return null;
    }

    return {
      shop: form.shop,
      warehouse: form.warehouse,
      deliverySlotStart: start.toISOString(),
      deliverySlotEnd: end.toISOString(),
      deliveryWindowMin,
      items,
    };
  }

  // Wholesaler: record a manually received order.
  async function createManualOrder(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isWholesaler) {
      setError("Only wholesalers can record manual orders.");
      return;
    }

    const payload = validateForm();
    if (!payload) return;

    setSaving(true);

    try {
      await ordersApi.createManual(payload);

      const selectedShop = form.shop;
      const selectedWarehouse = form.warehouse;

      setMessage("Supply order recorded successfully.");
      setForm({
        ...emptyForm,
        shop: selectedShop,
        warehouse: selectedWarehouse,
      });
      setShowForm(false);
      await loadOrders();
    } catch (err) {
      setError(err.message || "Could not record supply order.");
    } finally {
      setSaving(false);
    }
  }

  // Shopkeeper: place a normal supply order.
  async function createShopkeeperOrder(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isShopkeeper) {
      setError("Only shopkeepers can place supply orders.");
      return;
    }

    const payload = validateForm();
    if (!payload) return;

    setSaving(true);

    try {
      await ordersApi.create(payload);

      const selectedShop = form.shop;
      const selectedWarehouse = form.warehouse;

      setMessage("Supply order placed successfully.");
      setForm({
        ...emptyForm,
        shop: selectedShop,
        warehouse: selectedWarehouse,
      });
      await loadOrders();
    } catch (err) {
      setError(err.message || "Could not place supply order.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(order, nextStatus) {
    const orderId = idOf(order);
    if (!orderId) {
      setError("Order ID is missing.");
      return;
    }

    setError("");
    setMessage("");

    try {
      await ordersApi.updateStatus(orderId, nextStatus);
      setMessage(`Order status updated to ${nextStatus}.`);
      setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      setError(err.message || "Order status update failed.");
    }
  }

  async function viewDetails(order) {
    const orderId = idOf(order);

    if (!orderId) {
      setError("Order ID is missing.");
      return;
    }

    setError("");

    try {
      const result = await ordersApi.getById(orderId);
      setSelectedOrder(oneOf(result));
    } catch (err) {
      setError(err.message || "Order details could not be loaded.");
    }
  }

  const nextRiderStatus = (order) => {
    if (!isRider) return null;

    if (order.status === "planned") return "picked";
    if (order.status === "picked") return "delivered";

    return null;
  };

  const canCancel = (order) =>
    (isWholesaler || isShopkeeper) && order.status === "pending";

  const resetForm = () => {
    setForm({
      ...emptyForm,
      shop: idOf(shops[0]),
      warehouse: idOf(warehouses[0]),
    });
    setError("");
    setMessage("");
  };

  const renderItemsForm = () => (
    <>
      <h3>Items</h3>

      {form.items.map((item, index) => (
        <div
          key={index}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input
            placeholder="Item name"
            value={item.name}
            onChange={(event) =>
              updateItem(index, "name", event.target.value)
            }
            required
          />

          <input
            aria-label={`Quantity for item ${index + 1}`}
            type="number"
            min="1"
            step="1"
            placeholder="Quantity"
            value={item.quantity}
            onChange={(event) =>
              updateItem(index, "quantity", event.target.value)
            }
            required
          />

          <input
            aria-label={`Unit price for item ${index + 1}`}
            type="number"
            min="0"
            step="any"
            placeholder="Unit price"
            value={item.price}
            onChange={(event) =>
              updateItem(index, "price", event.target.value)
            }
            required
          />

          {form.items.length > 1 && (
            <button type="button" onClick={() => removeItem(index)}>
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addItem}>
        Add item
      </button>

      <p>
        <strong>Estimated total:</strong> ₹{totalAmount.toFixed(2)}
      </p>
    </>
  );

  const renderOrderFields = () => (
    <>
      <label>
        Kirana shop
        <select
          name="shop"
          value={form.shop}
          onChange={updateField}
          required
        >
          <option value="">Select shop</option>
          {shops.map((shop) => (
            <option key={idOf(shop)} value={idOf(shop)}>
              {shop.name} — {shop.area || shop.address}
            </option>
          ))}
        </select>
      </label>

      <label>
        Warehouse
        <select
          name="warehouse"
          value={form.warehouse}
          onChange={updateField}
          required
        >
          <option value="">Select warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={idOf(warehouse)} value={idOf(warehouse)}>
              {warehouse.name} — {warehouse.address}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label>
          Delivery slot starts
          <input
            name="deliverySlotStart"
            type="datetime-local"
            min={toDateTimeLocal(new Date())}
            value={form.deliverySlotStart}
            onChange={updateField}
            required
          />
        </label>

        <label>
          Delivery slot ends
          <input
            name="deliverySlotEnd"
            type="datetime-local"
            min={form.deliverySlotStart || toDateTimeLocal(new Date())}
            value={form.deliverySlotEnd}
            onChange={updateField}
            required
          />
        </label>
      </div>

      <label>
        Delivery window (minutes)
        <input
          name="deliveryWindowMin"
          type="number"
          min="1"
          value={form.deliveryWindowMin}
          onChange={updateField}
          required
        />
      </label>

      {renderItemsForm()}
    </>
  );

  return (
    <main className="orders-page">
      <h1>
        {isWholesaler
          ? "Supply orders"
          : isRider
            ? "Assigned deliveries"
            : "My supply orders"}
      </h1>

      <p>
        {isWholesaler
          ? "Record manually received kirana orders with a warehouse and delivery time slot."
          : isRider
            ? "View assigned deliveries and update delivery progress."
            : "Place and track supply orders for your kirana shop."}
      </p>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: "#15803d" }}>
          {message}
        </p>
      )}

      <section
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <label>
          Filter by status{" "}
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        {isWholesaler && (
          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError("");
              setMessage("");
            }}
          >
            {showForm ? "Close Form" : "Record supply order"}
          </button>
        )}

        <button type="button" onClick={loadOrders}>
          Refresh
        </button>
      </section>

      {isWholesaler && showForm && (
        <form
          onSubmit={createManualOrder}
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 18,
            marginBottom: 24,
            display: "grid",
            gap: 12,
          }}
        >
          <h2>Record manual order</h2>

          {renderOrderFields()}

          <button
            type="submit"
            disabled={saving || loadingOptions || !shops.length || !warehouses.length}
          >
            {saving ? "Saving..." : "Save supply order"}
          </button>

          <button type="button" onClick={resetForm} disabled={saving}>
            Reset form
          </button>
        </form>
      )}

      {isShopkeeper && (
        <form
          onSubmit={createShopkeeperOrder}
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 18,
            marginBottom: 24,
            display: "grid",
            gap: 12,
          }}
        >
          <h2>Place supply order</h2>

          {renderOrderFields()}

          <button
            type="submit"
            disabled={saving || loadingOptions || !shops.length || !warehouses.length}
          >
            {saving ? "Placing order..." : "Place order"}
          </button>
        </form>
      )}

      {(isWholesaler || isShopkeeper) &&
        !loadingOptions &&
        (!shops.length || !warehouses.length) && (
          <p>
            {isWholesaler
              ? "A shop and warehouse are required before recording an order."
              : "A shop and active warehouse are required before placing an order."}
          </p>
        )}

      {loadingOptions && (isWholesaler || isShopkeeper) && (
        <p>Loading shops and warehouses...</p>
      )}

      {selectedOrder && (
        <section
          style={{
            border: "1px solid #ddd",
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <h2>Order details</h2>
          <p>
            <strong>Order ID:</strong> {idOf(selectedOrder) || "—"}
          </p>
          <p>
            <strong>Shop:</strong>{" "}
            {selectedOrder.shop?.name ||
              selectedOrder.shopName ||
              selectedOrder.shop ||
              "—"}
          </p>
          <p>
            <strong>Status:</strong> {selectedOrder.status || "—"}
          </p>
          <p>
            <strong>Address:</strong> {selectedOrder.deliveryAddress || "—"}
          </p>
          <p>
            <strong>Delivery slot:</strong>{" "}
            {selectedOrder.deliverySlotStart
              ? new Date(selectedOrder.deliverySlotStart).toLocaleString()
              : "—"}{" "}
            –{" "}
            {selectedOrder.deliverySlotEnd
              ? new Date(selectedOrder.deliverySlotEnd).toLocaleString()
              : "—"}
          </p>
          <p>
            <strong>Total:</strong> ₹{selectedOrder.totalAmount ?? "—"}
          </p>

          <h3>Items</h3>
          {(selectedOrder.items || []).map((item, index) => (
            <p key={item._id || index}>
              {item.name} — {item.quantity} × ₹{item.price}
            </p>
          ))}

          <button type="button" onClick={() => setSelectedOrder(null)}>
            Close details
          </button>
        </section>
      )}

      <section>
        <h2>Order list ({orders.length})</h2>

        {loading ? (
          <p>Loading orders...</p>
        ) : !orders.length ? (
          <p>No orders found for this filter.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {orders.map((order, index) => {
              const orderId = idOf(order) || `order-${index}`;
              const next = nextRiderStatus(order);
              const shopName =
                typeof order.shop === "object"
                  ? order.shop?.name
                  : order.shopName || "";

              return (
                <article
                  key={orderId}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <h3>
                    {shopName || order.customerName || "Supply order"}
                  </h3>

                  <p>
                    <strong>Status:</strong> {order.status || "—"}
                  </p>

                  <p>
                    <strong>Address:</strong>{" "}
                    {order.deliveryAddress || order.shop?.address || "—"}
                  </p>

                  <p>
                    <strong>Delivery slot:</strong>{" "}
                    {order.deliverySlotStart
                      ? new Date(order.deliverySlotStart).toLocaleString()
                      : "Not set"}
                  </p>

                  <p>
                    <strong>Total:</strong> ₹{order.totalAmount ?? "—"} ·{" "}
                    <strong>Items:</strong> {order.items?.length ?? 0}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button type="button" onClick={() => viewDetails(order)}>
                      View details
                    </button>

                    {canCancel(order) && (
                      <button
                        type="button"
                        onClick={() => changeStatus(order, "cancelled")}
                      >
                        Cancel order
                      </button>
                    )}

                    {next && (
                      <button
                        type="button"
                        onClick={() => changeStatus(order, next)}
                      >
                        Mark {next}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
