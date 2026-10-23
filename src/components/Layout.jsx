import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navByRole = {
  wholesaler: [
    { to: '/', label: 'Overview', icon: '▦', end: true },
    { to: '/shops', label: 'Kirana shops', icon: '⌂' },
    { to: '/warehouses', label: 'My warehouses', icon: '▣' },
    { to: '/orders', label: 'Supply orders', icon: '▤' },
    { to: '/plan', label: 'Delivery planning', icon: '⌁' },
    { to: '/riders', label: 'Riders', icon: '↗' },
    { to: '/insights', label: 'Insights & forecasts', icon: '▥' },
  ],
  shopkeeper: [
    { to: '/', label: 'Overview', icon: '▦', end: true },
    { to: '/shops', label: 'My kirana shop', icon: '⌂' },
    { to: '/orders', label: 'Supply orders', icon: '▤' },
  ],
  rider: [
    { to: '/', label: 'Overview', icon: '▦', end: true },
    { to: '/riders', label: 'My rider profile', icon: '↗' },
    { to: '/orders', label: 'Assigned deliveries', icon: '▤' },
    { to: '/plan', label: 'My route', icon: '⌁' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navItems = navByRole[user?.role] || navByRole.shopkeeper;
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const displayName = user?.name || 'KiranaPool User';
  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Member';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'KP';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">K</div>
          <div>
            <div className="brand-name">KiranaPool</div>
            <div className="brand-caption">DELIVERY INTELLIGENCE</div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">i</div>
            <div>
              <strong>Hackathon demo</strong>
              <p>Role-based workspace · live API data.</p>
            </div>
          </div>

          <div className="profile-row">
            <div className="avatar">{initials}</div>
            <div className="profile-details">
              <strong>{displayName}</strong>
              <span>{role}</span>
            </div>
            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-separator">/</span>
            <strong>KiranaPool</strong>
          </div>

          <div className="topbar-actions">
            <span className="connection-pill">
              <span className="status-dot" />
              Connected workspace
            </span>

            <button
              className="logout-top-button"
              type="button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>

        <footer className="footer">
          <span>KiranaPool · Shared delivery, smarter routes.</span>
          <span>Hackathon prototype · Estimates only</span>
        </footer>
      </div>
    </div>
  );
}