
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRiders } from "../api/orders";
import { plansApi, ridersApi } from "../services/api";
import StatusBadge from "../components/StatusBadge";


export default function RiderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rider, setRider] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRiderData() {
      setLoading(true);
      setError("");

      try {
        const [riderResult, planResult] = await Promise.all([
          ridersApi.getById(id),
          plansApi.getAll(),
        ]);
        const riders = [riderResult?.data || riderResult];
        const latestPlan = planResult;

        if (!active) return;

        const riderList = Array.isArray(riders)
          ? riders
          : riders?.data || riders?.riders || [];

        setRider(
          riderList.find(
            (item) => String(item.id || item._id) === String(id)
          ) || null
        );

        const planList = Array.isArray(latestPlan?.data) ? latestPlan.data : [];
        setPlan({ pooled: { routes: planList.filter((item) => String(item.rider?._id || item.rider) === String(id)).map((item) => ({
          riderId: id, orderIds: (item.orders || []).map((order) => order._id || order), stops: item.route?.stops || [], distanceKm: item.pooled?.distanceKm || 0, durationMin: item.pooled?.durationMin || 0, planId: item._id
        })) } });
      } catch (err) {
        if (active) {
          setError(
            err.message || "Could not load rider information."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRiderData();

    return () => {
      active = false;
    };
  }, [id]);

  const route = plan?.pooled?.routes?.find(
    (item) => String(item.riderId) === String(id)
  );

  const stops = route?.stops || [];
  const pickupCount = stops.filter(
    (stop) => stop.type === "pickup"
  ).length;
  const deliveryCount = stops.filter(
    (stop) => stop.type === "delivery"
  ).length;

  const riderName = rider?.name || "Delivery Rider";
  const riderStatus = rider?.status || "Available";
  const isAvailable =
    String(riderStatus).toLowerCase() === "available";

  return (
    <div className="riders-page">
      <div className="rider-dashboard">
        <header className="rider-page-header">
          <div>
            <div className="rider-breadcrumb">
              OPERATIONS <span>/</span> RIDERS
            </div>

            <h1>Rider Overview</h1>

            <p className="rider-page-description">
              Track rider information, assigned routes and delivery stops.
            </p>
          </div>

          <button
            className="rider-back-button"
            onClick={() => navigate(-1)}
            type="button"
          >
            <span aria-hidden="true">←</span> Go Back
          </button>
        </header>

        {error && (
          <div className="rider-alert" role="alert">
            <span>!</span>
            <div>
              <strong>Unable to load rider</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <section className="rider-loading-card">
            <div className="rider-loader" />
            <h2>Loading rider details</h2>
            <p>Fetching rider information and route plan...</p>
          </section>
        ) : !rider ? (
          <section className="rider-empty-card">
            <div className="rider-empty-icon">↗</div>
            <h2>Rider not found</h2>
            <p>
              This rider is not present in the current dataset.
              Return to the riders list and choose an available rider.
            </p>
            <button
              type="button"
              onClick={() => navigate("/riders")}
              className="rider-primary-button"
            >
              Explore Riders
            </button>
          </section>
        ) : (
          <>
            <section className="rider-hero-card">
              <div className="rider-hero-top">
                <div className="rider-identity">
                  <div className="rider-avatar-large">
                    {riderName.charAt(0).toUpperCase()}
                  </div>

                  <div className="rider-identity-copy">
                    <span className="rider-section-kicker">
                      RIDER PROFILE
                    </span>

                    <h2>{riderName}</h2>

                    <p>
                      Rider ID:{" "}
                      <span>{rider.id || rider._id}</span>
                    </p>
                  </div>
                </div>

                <div className="rider-status-wrap">
                  <span
                    className={`rider-availability-dot ${
                      isAvailable ? "is-available" : "is-unavailable"
                    }`}
                  />
                  <span>{riderStatus}</span>
                </div>
              </div>

              <div className="rider-hero-divider" />

              <div className="rider-profile-meta">
                <div>
                  <span className="rider-meta-label">Capacity</span>
                  <strong>
                    {rider.capacity ?? "—"}
                    <small> units</small>
                  </strong>
                </div>

                <div>
                  <span className="rider-meta-label">Route status</span>
                  <strong>{route ? "Route assigned" : "Not assigned"}</strong>
                </div>

                <div>
                  <span className="rider-meta-label">Stops assigned</span>
                  <strong>{stops.length}</strong>
                </div>
              </div>
            </section>

            <section className="rider-stat-grid">
              <article className="rider-stat-card">
                <div className="rider-stat-icon rider-icon-teal">↗</div>
                <div>
                  <span>Total stops</span>
                  <strong>{stops.length}</strong>
                  <small>In current route</small>
                </div>
              </article>

              <article className="rider-stat-card">
                <div className="rider-stat-icon rider-icon-blue">P</div>
                <div>
                  <span>Pickups</span>
                  <strong>{pickupCount}</strong>
                  <small>Collection stops</small>
                </div>
              </article>

              <article className="rider-stat-card">
                <div className="rider-stat-icon rider-icon-purple">D</div>
                <div>
                  <span>Deliveries</span>
                  <strong>{deliveryCount}</strong>
                  <small>Customer stops</small>
                </div>
              </article>
            </section>

            <section className="rider-route-panel">
              <div className="rider-panel-header">
                <div>
                  <span className="rider-section-kicker">
                    DELIVERY PLAN
                  </span>
                  <h2>Assigned Route</h2>
                  <p>
                    Follow the stop sequence generated by the current plan.
                  </p>
                </div>

                <span className="rider-route-count">
                  {stops.length} {stops.length === 1 ? "STOP" : "STOPS"}
                </span>
              </div>

              {!route ? (
                <div className="rider-route-empty">
                  <div className="rider-route-empty-icon">⌁</div>
                  <h3>No route assigned yet</h3>
                  <p>
                    This rider does not have a route in the current delivery
                    plan. A route will appear here once planning assigns stops.
                  </p>
                </div>
              ) : (
                <div className="rider-timeline">
                  {stops.map((stop, index) => {
                    const isPickup = stop.type === "pickup";

                    return (
                      <div
                        className="rider-timeline-item"
                        key={stop.id || `${stop.type}-${index}`}
                      >
                        <div className="rider-timeline-rail">
                          <div
                            className={`rider-timeline-marker ${
                              isPickup
                                ? "rider-pickup-marker"
                                : "rider-delivery-marker"
                            }`}
                          >
                            {isPickup ? "P" : "D"}
                          </div>

                          {index !== stops.length - 1 && (
                            <div className="rider-timeline-line" />
                          )}
                        </div>

                        <div className="rider-stop-card">
                          <div className="rider-stop-card-main">
                            <div className="rider-stop-number">
                              STOP {String(index + 1).padStart(2, "0")}
                            </div>

                            <h3>
                              {stop.label ||
                                stop.name ||
                                `Stop ${index + 1}`}
                            </h3>

                            <p>
                              {isPickup
                                ? "Collect order"
                                : stop.type === "delivery"
                                ? "Deliver order"
                                : "Route checkpoint"}
                            </p>
                          </div>

                          <div className="rider-stop-card-side">
                            <span
                              className={`rider-stop-type ${
                                isPickup
                                  ? "rider-pickup-tag"
                                  : "rider-delivery-tag"
                              }`}
                            >
                              {stop.type || "stop"}
                            </span>

                            <strong>
                              {stop.etaMin != null
                                ? `${stop.etaMin} min`
                                : "—"}
                            </strong>

                            <small>Estimated time</small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="rider-prototype-note">
              <span className="rider-note-icon">i</span>
              <div>
                <strong>Prototype view</strong>
                <p>
                  Route information comes from the current planning response.
                  Live GPS tracking, real-time movement and delivery status
                  updates are not enabled on this screen yet.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
