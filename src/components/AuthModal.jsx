import { useState } from "react";

export default function AuthModal({ onClose, onSignIn, onSignUp, authLoading, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [localError, setLocalError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (m) => { setMode(m); setLocalError(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      const result = mode === "login"
        ? await onSignIn(email, password)
        : await onSignUp(email, password, username);
      if (!result?.success) {
        setLocalError(result?.error || "Something went wrong. Try again.");
      }
      // On success, parent (App.jsx) closes the modal
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || authLoading;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign in" : "Create account"}
    >
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <i className="ti ti-x" />
        </button>

        {/* Brand */}
        <div className="modal-logo">
          <div className="brand-logo" style={{ width: 36, height: 36, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--gray-900)", lineHeight: 1.2 }}>ZynFinder</div>
            <div style={{ fontSize: 12, color: "var(--gray-500)" }}>Save your progress</div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="modal-tabs">
          <button className={`modal-tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>
            Sign in
          </button>
          <button className={`modal-tab ${mode === "signup" ? "active" : ""}`} onClick={() => switchMode("signup")}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                className="form-input"
                type="text"
                placeholder="e.g. toronto_zyn_fan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                title="Letters, numbers, and underscores only"
                autoComplete="username"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="form-input"
              type="password"
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {localError && (
            <div className="modal-error">
              <i className="ti ti-alert-circle" /> {localError}
            </div>
          )}

          <button className="modal-submit" type="submit" disabled={busy}>
            {busy ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} />
                Working…
              </>
            ) : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="modal-footer-note">
          {mode === "login" ? (
            <>New here?{" "}
              <button className="modal-switch-link" onClick={() => switchMode("signup")}>Create a free account</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button className="modal-switch-link" onClick={() => switchMode("login")}>Sign in</button>
            </>
          )}
        </div>

        <button className="modal-guest-btn" onClick={onClose}>
          Continue as guest
        </button>
      </div>
    </div>
  );
}
