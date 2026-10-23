
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import PlanPage from "./pages/PlanPage";
import RiderPage from "./pages/RiderPage";
import InsightsPage from "./pages/InsightsPage";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import ShopsPage from "./pages/ShopsPage";
import RidersPage from "./pages/RidersPage";
import OrdersPage from "./pages/OrdersPage";
import WarehousePage from "./pages/WarehousePage";

function NotFound() {
  return (
    <div className="panel not-found">
      <div className="eyebrow">404 / NOT FOUND</div>
      <h1>That page isn't in this route plan.</h1>
      <p className="page-subtitle">
        Use the navigation to return to your workspace.
      </p>
      <a className="button primary" href="/">
        Back to dashboard
      </a>
    </div>
  );
}

function PublicOnlyRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <div className="auth-loading">Checking your session...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <AuthPage mode="login" />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <AuthPage mode="signup" />
            </PublicOnlyRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route element={<ProtectedRoute roles={["shopkeeper", "wholesaler"]} />}>
              <Route path="/shops" element={<ShopsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["wholesaler"]} />}>
              <Route path="/warehouses" element={<WarehousePage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/rider/:id" element={<RiderPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["wholesaler", "rider"]} />}>
              <Route path="/riders" element={<RidersPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["wholesaler", "rider"]} />}>
              <Route path="/plan" element={<PlanPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["shopkeeper", "wholesaler", "rider"]} />}>
              <Route path="/orders" element={<OrdersPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
