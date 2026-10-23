
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { getOrders, getRiders, getShops } from '../api/orders';

import { USE_MOCK_DATA } from '../api/config';
import { useAuth } from '../context/AuthContext';
import { plansApi } from '../services/api';

const money = (value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : '—';

const getStatus = (status) =>
  String(status || 'unknown').trim().toLowerCase();

const getStatusLabel = (status) =>
  getStatus(status)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Unknown';

const getOrderId = (order) => order.id || order._id || '—';

export default function Dashboard() {
  const { user } = useAuth();
  const isWholesaler = user?.role === "wholesaler";
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [riders, setRiders] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [orderData, shopData, riderData, latestPlanResult] = await Promise.all([
        getOrders(),
        getShops(),
        isWholesaler ? getRiders() : Promise.resolve([]),
        isWholesaler ? plansApi.getLatest().catch(() => null) : Promise.resolve(null),
      ]);

      setOrders(Array.isArray(orderData) ? orderData : []);
      setShops(Array.isArray(shopData) ? shopData : []);
      setRiders(Array.isArray(riderData) ? riderData : []);
      const latestPlan = latestPlanResult?.data || latestPlanResult;
      setPlan(latestPlan ? {
        ...latestPlan,
        pooled: {
          ...(latestPlan.pooled || {}),
          routes: latestPlan.route ? [{
            ...latestPlan.route,
            riderId: latestPlan.rider?.name || latestPlan.rider?._id || latestPlan.rider || "Unassigned",
            distanceKm: latestPlan.pooled?.distanceKm || 0,
            durationMin: latestPlan.pooled?.durationMin || 0,
            stops: latestPlan.route?.stops || [],
          }] : [],
        },
      } : null);
    } catch (err) {
      setError(err.message || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [isWholesaler]);

  const counts = useMemo(() => {
    const delivered = orders.filter(
      (order) => getStatus(order.status) === 'delivered'
    ).length;

    return {
      active: orders.length - delivered,
      delivered,
    };
  }, [orders]);

  const availableRiders = useMemo(
    () =>
      riders.filter(
        (rider) => getStatus(rider.status) === 'available'
      ).length,
    [riders]
  );

  const statusChartData = useMemo(() => {
    const statusCounts = new Map();

    orders.forEach((order) => {
      const label = getStatusLabel(order.status);
      statusCounts.set(label, (statusCounts.get(label) || 0) + 1);
    });

    return Array.from(statusCounts, ([status, total]) => ({
      status,
      total,
    }));
  }, [orders]);

  const savings = plan?.savings?.amount;
  const soloCost = plan?.solo?.totalCost;
  const pooledCost = plan?.pooled?.totalCost;

  const comparisonBars = useMemo(() => {
    if (
      typeof soloCost !== 'number' ||
      typeof pooledCost !== 'number' ||
      soloCost < 0 ||
      pooledCost < 0
    ) {
      return null;
    }

    const maxCost = Math.max(soloCost, pooledCost, 1);

    return {
      soloWidth: `${(soloCost / maxCost) * 100}%`,
      pooledWidth: `${(pooledCost / maxCost) * 100}%`,
    };
  }, [soloCost, pooledCost]);

  const totalRoutes = plan?.pooled?.routes?.length ?? 0;

  const totalStops = useMemo(
    () =>
      (plan?.pooled?.routes || []).reduce(
        (total, route) => total + (route.stops?.length || 0),
        0
      ),
    [plan]
  );

  const totalDistance = useMemo(
    () =>
      (plan?.pooled?.routes || []).reduce(
        (total, route) => total + (Number(route.distanceKm) || 0),
        0
      ),
    [plan]
  );

  const recentActivity = useMemo(
    () =>
      [...orders]
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
          const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 4),
    [orders]
  );
  
  const poolingInsights = useMemo(() => {
    const pending = orders.filter((order) =>
      ['pending', 'placed', 'confirmed'].includes(getStatus(order.status))
    ).length;
  
    const delivered = orders.filter(
      (order) => getStatus(order.status) === 'delivered'
    ).length;
  
    const insights = [];
  
    if (pending > 0) {
      insights.push({
        icon: '◷',
        title: `${pending} orders may need planning`,
        detail: 'These orders are not marked as delivered. Review them when generating your next plan.',
      });
    }
  
    if (availableRiders === 0 && orders.length > 0) {
      insights.push({
        icon: '!',
        title: 'No riders marked available',
        detail: 'Check rider availability before planning deliveries.',
      });
    } else if (availableRiders > 0 && pending > 0) {
      insights.push({
        icon: '↗',
        title: 'Rider capacity is available',
        detail: `${availableRiders} riders are marked available for ${pending} orders not yet delivered.`,
      });
    }
  
    if (delivered > 0) {
      insights.push({
        icon: '✓',
        title: `${delivered} orders delivered`,
        detail: 'Delivery progress based on the statuses returned by your current data source.',
      });
    }
  
    if (plan && totalRoutes > 0) {
      insights.push({
        icon: '⌁',
        title: `${totalRoutes} routes in the latest plan`,
        detail: `${totalStops} stops across ${totalDistance.toFixed(1)} km of reported pooled distance.`,
      });
    }
  
    return insights.slice(0, 4);
  }, [
    orders,
    availableRiders,
    plan,
    totalRoutes,
    totalStops,
    totalDistance,
  ]);
  
  async function onGeneratePlan() {
    setPlanning(true);
    setError('');
    setNotice('');

    try {
      if (!isWholesaler) return;
      const result = await plansApi.autoPool({});
      setNotice(result.message || `Pooling complete: ${result.plansCreated || 0} plans created.`);
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Could not generate a delivery plan.');
    } finally {
      setPlanning(false);
    }
  }

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="page-stack">
     
<section className="hero-banner">
  <div className="hero-content">
    <div className="hero-eyebrow">
      <span className="hero-live-dot" />
      {USE_MOCK_DATA ? 'DEMO WORKSPACE' : 'OPERATIONS WORKSPACE'}
      <span className="hero-eyebrow-divider">/</span>
      {todayLabel}
    </div>

    <h1>Smarter deliveries, <br />closer communities.</h1>

    <p>
      Bring neighbourhood orders together, simplify delivery routes
      and understand your pooling performance in one place.
    </p>

    <div className="hero-actions">
      {isWholesaler && <button
        className="button hero-primary-button"
        onClick={onGeneratePlan}
        disabled={planning || loading}
        type="button"
      >
        {planning ? (
          <>
            <span className="spinner" />
            Building your plan…
          </>
        ) : (
          <>
            Generate pooling plan <span aria-hidden="true">↗</span>
          </>
        )}
      </button>}

    </div>

    <div className="hero-micro-stats">
      <div>
        <span>ORDERS IN VIEW</span>
        <strong>{loading ? '…' : orders.length}</strong>
      </div>
      <div>
        <span>AVAILABLE RIDERS</span>
        <strong>{loading ? '…' : availableRiders}</strong>
      </div>
      <div>
        <span>POOLED ROUTES</span>
        <strong>{plan ? totalRoutes : '—'}</strong>
      </div>
    </div>
  </div>

  <div className="hero-art" aria-hidden="true">
    <div className="hero-orbit orbit-one" />
    <div className="hero-orbit orbit-two" />
    <div className="hero-route-line">
      <span className="hero-route-stop stop-a" />
      <span className="hero-route-stop stop-b" />
      <span className="hero-route-stop stop-c" />
    </div>
    <div className="hero-route-card">
      <span className="hero-route-icon">⌁</span>
      <div>
        <strong>Neighbourhood pooling</strong>
        <span>{plan ? `${totalRoutes} routes in latest plan` : 'Ready when you are'}</span>
      </div>
      <span className="hero-route-check">{plan ? '✓' : '✦'}</span>
    </div>
    <div className="hero-floating-chip">
      <span>✧</span> One smarter journey
    </div>
  </div>
</section>


      {USE_MOCK_DATA && (
        <div className="demo-banner">
          <span className="banner-dot" />
          <div>
            <strong>Sample data mode</strong>
            <span>
              This workspace uses synthetic demo data. Live backend
              integration is pending API confirmation.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert error-alert" role="alert">
          <strong>Something went wrong.</strong> {error}
          <button type="button" onClick={loadDashboard}>
            Try again
          </button>
        </div>
      )}

      {notice && (
        <div className="alert success-alert" role="status">
          {notice}
        </div>
      )}

      <section className="stats-grid" aria-label="Delivery statistics">
        <StatCard
          label="Active orders"
          value={loading ? '…' : counts.active}
          note="Not yet delivered"
          icon="▤"
          tone="violet"
        />

        <StatCard
          label="Kirana shops"
          value={loading ? '…' : shops.length}
          note="Shops in current dataset"
          icon="⌂"
          tone="blue"
        />

        <StatCard
          label="Available riders"
          value={loading ? '…' : availableRiders}
          note={`${riders.length} riders in dataset`}
          icon="↗"
          tone="teal"
        />

        <StatCard
          label="Delivered orders"
          value={loading ? '…' : counts.delivered}
          note="Orders marked delivered"
          icon="✓"
          tone="orange"
        />
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">ORDER OVERVIEW</div>
            <h2>Orders by status</h2>
          </div>

          <span className="soft-tag">
            {loading ? 'Loading' : `${orders.length} total orders`}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="spinner dark-spinner" />
            Loading order data…
          </div>
        ) : statusChartData.length === 0 ? (
          <div className="empty-state">
            No order data available to display yet.
          </div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusChartData}
                margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
              >
             <CartesianGrid
  stroke="#EAE7F0"
  strokeDasharray="3 5"
  vertical={false}
/>

                <XAxis
                  dataKey="status"
                  tick={{
                    fill: '#8A8797',
                    fontSize: 11,
                    fontFamily: 'DM Sans',
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fill: '#8A8797',
                    fontSize: 11,
                    fontFamily: 'DM Sans',
                  }}
                  axisLine={false}
                  tickLine={false}
                />

<Tooltip
  cursor={{ fill: '#F4F0F8' }}
  contentStyle={{
    background: '#FFFFFF',
    border: '1px solid #E7E2EE',
    borderRadius: 12,
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(40, 34, 55, 0.08)',
    fontSize: 12,
  }}
  formatter={(value) => [value, 'Orders']}
/>

                <Bar
                  dataKey="total"
                  name="Orders"
                  fill="#8175AD"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="dashboard-grid">
        <article className="panel savings-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">COST EFFICIENCY</div>
              <h2>Pooling impact</h2>
            </div>

            <span className="soft-tag">
              {plan ? 'Latest plan' : 'Awaiting plan'}
            </span>
          </div>

          {plan ? (
            <>
              <div className="savings-total">
                <span>Estimated savings</span>
                <strong>{money(savings)}</strong>

                <span className="savings-percent">
                  {typeof plan.savings?.percent === 'number'
                    ? `${plan.savings.percent.toFixed(1)}% lower cost`
                    : 'Percentage unavailable'}
                </span>
              </div>

              <div className="comparison-row">
                <div>
                  <span>Solo delivery</span>
                  <strong>{money(soloCost)}</strong>
                </div>

                <div>
                  <span>Pooled delivery</span>
                  <strong>{money(pooledCost)}</strong>
                </div>
              </div>

              {comparisonBars ? (
                <div className="cost-comparison-bars">
                  <div className="cost-bar-group">
                    <div className="cost-bar-label">
                      <span>Solo</span>
                      <strong>{money(soloCost)}</strong>
                    </div>
                    <div className="cost-bar-track">
                      <div
                        className="cost-bar-fill solo-fill"
                        style={{ width: comparisonBars.soloWidth }}
                      />
                    </div>
                  </div>

                  <div className="cost-bar-group">
                    <div className="cost-bar-label">
                      <span>Pooled</span>
                      <strong>{money(pooledCost)}</strong>
                    </div>
                    <div className="cost-bar-track">
                      <div
                        className="cost-bar-fill pooled-fill"
                        style={{ width: comparisonBars.pooledWidth }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state compact-empty">
                  Cost comparison is unavailable for this plan.
                </div>
              )}
            </>
          ) : (
            <div className="empty-plan">
              <div className="empty-icon">↗</div>
              <strong>Your next plan starts here</strong>
              <p>
                Generate a delivery plan to compare individual and pooled
                delivery costs.
              </p>

              {isWholesaler && <button
                className="button primary"
                onClick={onGeneratePlan}
                disabled={planning || loading}
                type="button"
              >
                {planning ? 'Planning…' : 'Generate delivery plan'}
              </button>}
            </div>
          )}

          <div className="panel-footnote">
            Estimates depend on the route and cost configuration. Sample
            results are not confirmed operational savings.
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">ORDER ACTIVITY</div>
              <h2>Recent orders</h2>
            </div>

            <Link className="text-link" to="/plan">
              View plan <span>→</span>
            </Link>
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner dark-spinner" />
              Loading orders…
            </div>
          ) : orders.length ? (
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>ORDER</th>
                    <th>SHOP / CUSTOMER</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.slice(0, 5).map((order, index) => (
                    <tr key={getOrderId(order) === '—' ? index : getOrderId(order)}>
                      <td>
                        <strong>{getOrderId(order)}</strong>
                        <span className="table-subtext">
                          {order.createdLabel || 'Sample order'}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {order.shopName || order.shopId || 'Shop'}
                        </strong>
                        <span className="table-subtext">
                          {order.customerLabel ||
                            order.customer?.name ||
                            'Delivery location'}
                        </span>
                      </td>

                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              No orders available. Orders will appear when data is returned.
            </div>
          )}

          <div className="activity-footer">
            <span className="tiny-status-dot" />
            {USE_MOCK_DATA
              ? 'Statuses shown from sample data'
              : 'Statuses shown from API data'}
          </div>
        </article>
      </section>

      <section className="creative-grid">
  <article className="panel activity-feed-panel">
    <div className="panel-heading">
      <div>
        <div className="eyebrow">LIVE DATA FEED</div>
        <h2>Delivery activity</h2>
      </div>
      <span className="soft-tag">{loading ? 'Loading' : `${recentActivity.length} recent`}</span>
    </div>

    {loading ? (
      <div className="loading-state">Loading activity…</div>
    ) : recentActivity.length ? (
      <div className="activity-feed">
        {recentActivity.map((order, index) => (
          <div className="feed-item" key={getOrderId(order) === '—' ? index : getOrderId(order)}>
            <div className={`feed-marker feed-${getStatus(order.status).replace(/[^a-z0-9]+/g, '-')}`}>
              {getStatus(order.status) === 'delivered' ? '✓' : '↗'}
            </div>
            <div className="feed-copy">
              <strong>
                Order {getOrderId(order)}
              </strong>
              <span>
                {order.shopName || order.shopId || 'Neighbourhood shop'}
                {' · '}
                {getStatusLabel(order.status)}
              </span>
              <small>
                {order.createdLabel ||
                  (order.createdAt || order.created_at
                    ? new Date(order.createdAt || order.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Time not provided')}
              </small>
            </div>
            <StatusBadge status={order.status} />
          </div>
        ))}
      </div>
    ) : (
      <div className="empty-state">New order activity will appear here when orders are available.</div>
    )}
  </article>

  <article className="panel neighbourhood-panel">
    <div className="panel-heading">
      <div>
        <div className="eyebrow">ROUTE EXPLORER</div>
        <h2>Neighbourhood journeys</h2>
      </div>
      <span className="soft-tag">{plan ? 'Latest plan' : 'Preview'}</span>
    </div>

    {plan && totalRoutes > 0 ? (
      <>
        <div className="neighbourhood-visual" aria-label="Illustrative route connections, not a geographic map">
          <div className="map-road road-one" />
          <div className="map-road road-two" />
          <div className="map-road road-three" />
          <div className="map-block block-one" />
          <div className="map-block block-two" />
          <div className="map-block block-three" />
          <div className="map-route">
            <span className="map-pin pin-one">S</span>
            <span className="map-pin pin-two">1</span>
            <span className="map-pin pin-three">2</span>
            <span className="map-pin pin-four">✓</span>
          </div>
          <div className="map-caption">
            <span className="map-caption-dot" />
            Route connection preview
          </div>
        </div>

        <div className="route-preview-facts">
          <div>
            <span>Routes</span>
            <strong>{totalRoutes}</strong>
          </div>
          <div>
            <span>Stops</span>
            <strong>{totalStops}</strong>
          </div>
          <div>
            <span>Total distance</span>
            <strong>{totalDistance.toFixed(1)} km</strong>
          </div>
        </div>

        <p className="visual-note">
          Schematic illustration based on plan availability. This is not a
          geographic map or live rider tracking.
        </p>

        <Link to="/plan" className="text-link neighbourhood-link">
          Explore full plan <span>→</span>
        </Link>
      </>
    ) : (
      <div className="map-empty">
        <div className="map-empty-art" aria-hidden="true">
          <span>⌁</span>
          <i />
          <i />
          <i />
        </div>
        <strong>Your neighbourhood, connected.</strong>
        <p>Generate a pooling plan to see its route and stop summary here.</p>
        {isWholesaler && <button
          className="button primary"
          onClick={onGeneratePlan}
          disabled={planning || loading}
          type="button"
        >
          {planning ? 'Planning…' : 'Build route preview'}
        </button>}
      </div>
    )}
  </article>

  <article className="panel smart-insights-panel">
    <div className="panel-heading">
      <div>
        <div className="eyebrow">OPERATIONS ASSISTANT</div>
        <h2>Smart pooling insights</h2>
      </div>
      <span className="insight-sparkle">✧</span>
    </div>

    {loading ? (
      <div className="loading-state">Analysing current data…</div>
    ) : poolingInsights.length ? (
      <div className="smart-insights-list">
        {poolingInsights.map((insight, index) => (
          <div className="smart-insight" key={`${insight.title}-${index}`}>
            <span className="smart-insight-icon">{insight.icon}</span>
            <div>
              <strong>{insight.title}</strong>
              <p>{insight.detail}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="empty-state">
        No actionable insights from the current dataset yet.
      </div>
    )}

    <div className="insight-disclaimer">
      <span>✦</span>
      Insights are rule-based observations from returned data, not ML predictions.
    </div>
  </article>

  <article className="panel carbon-panel">
    <div className="panel-heading">
      <div>
        <div className="eyebrow">SUSTAINABILITY</div>
        <h2>CO₂ impact</h2>
      </div>
      <span className="carbon-leaf">♧</span>
    </div>

    <div className="carbon-visual">
      <div className="carbon-ring">
        <div>
          <span>CO₂</span>
          <strong>—</strong>
          <small>kg saved</small>
        </div>
      </div>
      <div className="carbon-copy">
        <strong>Make every trip count.</strong>
        <p>
          A defensible emissions estimate needs a verified emissions factor
          and comparable solo-versus-pooled distance data.
        </p>
      </div>
    </div>

    <div className="carbon-status">
      <span className="carbon-status-dot" />
      CO₂ calculation awaiting verified inputs
    </div>
    <p className="visual-note">
      No emissions savings are claimed from cost or pooled distance alone.
    </p>
  </article>
</section>

      {plan && (
        <section className="panel route-preview">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">DELIVERY PLAN</div>
              <h2>Plan summary</h2>
            </div>

            <Link to="/plan" className="text-link">
              View plan →
            </Link>
          </div>

          <div className="route-summary-grid">
            <div>
              <span>Routes</span>
              <strong>{totalRoutes}</strong>
            </div>

            <div>
              <span>Stops</span>
              <strong>{totalStops}</strong>
            </div>

            <div>
              <span>Pooled distance</span>
              <strong>{totalDistance.toFixed(1)} km</strong>
            </div>

            <div>
              <span>Algorithm</span>
              <strong className="algorithm-label">
                {plan.meta?.algorithm || 'Not specified'}
              </strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
