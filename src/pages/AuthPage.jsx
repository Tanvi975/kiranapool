
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function AuthPage({ mode = "login" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const { login, signup, googleLogin } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("shopkeeper");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (isSignup && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        await signup({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role,
        });
      } else {
        await login({
          email: normalizedEmail,
          password,
        });
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(response) {
    setError("");

    if (!response?.credential) {
      setError("Google did not return a credential. Please try again.");
      return;
    }

    setLoading(true);

    try {
      await googleLogin(response.credential, role);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.message ||
        "Google sign-in failed. Please check backend Google configuration."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand">
          <div className="auth-brand-mark">K</div>
          <div>
            <div className="auth-brand-name">KiranaPool</div>
            <div className="auth-brand-caption">
              DELIVERY INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="auth-visual-content">
          <span className="auth-kicker">SMARTER LOCAL COMMERCE</span>
          <h1>
            Better deliveries.
            <br />
            Stronger communities.
          </h1>
          <p>
            Bring wholesalers, local kirana stores, delivery partners and shared
            delivery planning together in one workspace.
          </p>

          <div className="auth-feature-list">
            <div>
              <span className="auth-feature-icon">↗</span>
              <span>
                <strong>Smarter routes</strong>
                <small>Plan deliveries more efficiently</small>
              </span>
            </div>
            <div>
              <span className="auth-feature-icon">◎</span>
              <span>
                <strong>Shared delivery</strong>
                <small>Coordinate nearby orders</small>
              </span>
            </div>
            <div>
              <span className="auth-feature-icon">▥</span>
              <span>
                <strong>Clear insights</strong>
                <small>Understand your delivery operations</small>
              </span>
            </div>
          </div>
        </div>

        <div className="auth-visual-footer">
          Built for local stores. Designed for smarter delivery.
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <div className="auth-brand-mark">K</div>
            <strong>KiranaPool</strong>
          </div>

          <div className="auth-heading">
            <span className="auth-kicker">
              {isSignup ? "GET STARTED" : "WELCOME BACK"}
            </span>
            <h2>
              {isSignup ? "Create your account" : "Sign in to KiranaPool"}
            </h2>
            <p>
              {isSignup
                ? "Set up your workspace in a few simple steps."
                : "Enter your details to access your workspace."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="auth-password">Password</label>
                {!isSignup && (
                  <span className="auth-helper-text">
                    Minimum 8 characters
                  </span>
                )}
              </div>

              <div className="auth-password-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    isSignup ? "Create a strong password" : "Enter your password"
                  }
                  autoComplete={
                    isSignup ? "new-password" : "current-password"
                  }
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1.1-1.3 2.4-2.6 3.5M6.2 6.2C3.9 7.6 2.8 9.7 2.5 12c.8 2.1 4.2 7 9.5 7 1.2 0 2.3-.3 3.3-.7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-role">Account type</label>
              <select
                id="auth-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="shopkeeper">Kirana shop</option>
                <option value="wholesaler">Wholesaler / supplier</option>
                <option value="rider">Delivery rider</option>
              </select>
              <span className="auth-helper-text">
                Used when creating a new account with Google.
                Existing Google accounts keep their saved role.
              </span>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <span aria-hidden="true">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isSignup
                  ? "Create account"
                  : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <span>OR CONTINUE WITH</span>
            <span />
          </div>

          <div className="auth-google-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                setError("Google sign-in was cancelled or could not start.")
              }
              useOneTap={false}
              theme="outline"
              size="large"
              shape="rectangular"
              text={isSignup ? "signup_with" : "signin_with"}
              width="360"
            />
          </div>

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New to KiranaPool?"}{" "}
            <Link to={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Sign in" : "Create account"}
            </Link>
          </p>

          <p className="auth-legal">
            By continuing, you agree to use KiranaPool responsibly.
          </p>
        </div>
      </section>
    </div>
  );
}
