
import { useCallback, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./MapPage.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://kiranapool.onrender.com/api";

function getToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt")
  );
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }

  return result;
}

function coordinates(item) {
  const location = item?.location || item?.currentLocation;
  let lat = location?.lat;
  let lng = location?.lng;

  // Support GeoJSON locations too: coordinates are [longitude, latitude].
  if (
    (!Number.isFinite(lat) || !Number.isFinite(lng)) &&
    Array.isArray(location?.coordinates)
  ) {
    [lng, lat] = location.coordinates;
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
}

function FitMap({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [35, 35], maxZoom: 14 });
    }
  }, [map, points]);

  return null;
}

function getName(item, fallback) {
  return item?.name || item?.shopName || item?.title || fallback;
}

export default function MapPage() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gpsMessage, setGpsMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadMap = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const result = await apiRequest("/map/overview");
      if (result.success === false) {
        throw new Error(result.message || "Map data could not be loaded.");
      }

      setMapData(result.data || result);
      setLastUpdated(new Date().toLocaleTimeString());
      setError("");
    } catch (err) {
      setError(err.message || "Could not load map data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMap(true);

    const interval = window.setInterval(() => {
      if (!document.hidden) loadMap();
    }, 7000);

    return () => window.clearInterval(interval);
  }, [loadMap]);

  const sendGPS = () => {
    setGpsMessage("");

    if (!navigator.geolocation) {
      setGpsMessage("This browser does not support GPS location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await apiRequest("/riders/me", {
            method: "PATCH",
            body: JSON.stringify({
              location: {
                lat: coords.latitude,
                lng: coords.longitude,
              },
            }),
          });

          setGpsMessage("Rider location updated successfully.");
          await loadMap();
        } catch (err) {
          setGpsMessage(err.message || "GPS update failed.");
        }
      },
      (err) => {
        setGpsMessage(
          err.code === 1
            ? "Location permission denied. Allow location access in your browser."
            : "Unable to get your location. Please try again."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const warehouses = mapData?.warehouses || [];
  const shops = mapData?.shops || [];
  const riders = mapData?.riders || [];
  const orders = mapData?.orders || [];
  const plans = mapData?.plans || [];
  const role = String(mapData?.role || "").toLowerCase();

  const groups = [
    { title: "Warehouses", items: warehouses, color: "#8b5cf6" },
    { title: "Shops", items: shops, color: "#14b8a6" },
    { title: "Riders", items: riders, color: "#f59e0b" },
  ];

  const allPoints = groups.flatMap((group) =>
    group.items
      .map((item) => coordinates(item))
      .filter(Boolean)
  );

  const riderPoint = coordinates(mapData?.rider);
  if (riderPoint) allPoints.push(riderPoint);

  const center = allPoints[0] || [28.6139, 77.209];

  if (loading && !mapData) {
    return <div className="kp-map-state">Loading KiranaPool map…</div>;
  }

  return (
    <main className="kp-map-page">
      <header className="kp-map-header">
        <div>
          <h1>Live Delivery Map</h1>
          <p>
            Role: {role || "Unknown"} · Refreshes every 7 seconds
            {lastUpdated ? ` · Updated ${lastUpdated}` : ""}
          </p>
        </div>

        <button onClick={() => loadMap(true)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh map"}
        </button>
      </header>

      {error && <div className="kp-map-error">{error}</div>}

      {role === "rider" && (
        <section className="kp-map-gps">
          <button onClick={sendGPS}>Share my current location</button>
          <span>{gpsMessage}</span>
        </section>
      )}

      <section className="kp-map-stats">
        <div><strong>{warehouses.length}</strong><span>Warehouses</span></div>
        <div><strong>{shops.length}</strong><span>Shops</span></div>
        <div><strong>{riders.length + (mapData?.rider ? 1 : 0)}</strong><span>Riders</span></div>
        <div><strong>{orders.length}</strong><span>Orders</span></div>
        <div><strong>{plans.length}</strong><span>Plans</span></div>
      </section>

      <section className="kp-map-layout">
        <div className="kp-map-canvas">
          <MapContainer center={center} zoom={11} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitMap points={allPoints} />

            {groups.map((group) =>
              group.items.map((item, index) => {
                const point = coordinates(item);
                if (!point) return null;

                return (
                  <CircleMarker
                    key={`${group.title}-${item._id || index}`}
                    center={point}
                    radius={7}
                    pathOptions={{
                      color: group.color,
                      fillColor: group.color,
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup>
                      <strong>{getName(item, group.title.slice(0, -1))}</strong>
                      <br />
                      {group.title.slice(0, -1)}
                      <br />
                      {point[0].toFixed(5)}, {point[1].toFixed(5)}
                    </Popup>
                  </CircleMarker>
                );
              })
            )}

            {mapData?.rider && riderPoint && (
              <CircleMarker
                center={riderPoint}
                radius={10}
                pathOptions={{
                  color: "#ef4444",
                  fillColor: "#ef4444",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <strong>{getName(mapData.rider, "My rider location")}</strong>
                  <br />
                  My rider profile
                  {mapData.rider.locationUpdatedAt && (
                    <>
                      <br />
                      Updated: {new Date(
                        mapData.rider.locationUpdatedAt
                      ).toLocaleString()}
                    </>
                  )}
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>

        <aside className="kp-map-legend">
          <h2>Map locations</h2>
          {groups.map((group) => (
            <div className="kp-map-group" key={group.title}>
              <h3>
                <span
                  className="kp-map-dot"
                  style={{ background: group.color }}
                />
                {group.title} ({group.items.length})
              </h3>

              {group.items.length === 0 ? (
                <p className="kp-map-muted">No {group.title.toLowerCase()} returned.</p>
              ) : (
                group.items.map((item, index) => {
                  const point = coordinates(item);

                  return (
                    <div
                      className="kp-map-location"
                      key={item._id || index}
                    >
                      <strong>{getName(item, `${group.title.slice(0, -1)} ${index + 1}`)}</strong>
                      <span>
                        {point
                          ? `${point[0].toFixed(4)}, ${point[1].toFixed(4)}`
                          : "Coordinates unavailable"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          ))}

          <p className="kp-map-muted">
            Orders: {orders.length} · Plans: {plans.length}
          </p>
          <p className="kp-map-muted">
            Markers require valid numeric coordinates. This map does not provide turn-by-turn navigation.
          </p>
        </aside>
      </section>
    </main>
  );
}
