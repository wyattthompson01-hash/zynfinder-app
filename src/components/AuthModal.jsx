import { useState } from "react";

export default function AuthModal({ onClose, onSignIn, onSignUp, authLoading, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPw, setShowPw]     = useState(false);
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
      if (!result?.success) setLocalError(result?.error || "Something went wrong. Try again.");
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
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      role="dialog" aria-modal="true"
      aria-label={mode === "login" ? "Sign in" : "Create account"}
    >
      <div className="auth-card">
        <button className="auth-close" onClick={onClose} aria-label="Close">
          <i className="ti ti-x" />
        </button>

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src="/snusworld_logo.svg" alt="SnusWorld" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <div>
            <div className="auth-brand-name">SnusWorld</div>
            <div className="auth-brand-sub">Track · Report · Discover</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>
            Sign in
          </button>
          <button className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => switchMode("signup")}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-username">Username</label>
              <div className="auth-input-wrap">
                <i className="ti ti-at auth-input-icon" />
                <input
                  id="auth-username" className="auth-input"
                  type="text" placeholder="e.g. zyn_hunter_99"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  required minLength={3} maxLength={30}
                  pattern="[a-zA-Z0-9_]+" title="Letters, numbers, and underscores only"
                  autoComplete="username"
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">Email</label>
            <div className="auth-input-wrap">
              <i className="ti ti-mail auth-input-icon" />
              <input
                id="auth-email" className="auth-input"
                type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">Password</label>
            <div className="auth-input-wrap">
              <i className="ti ti-lock auth-input-icon" />
              <input
                id="auth-password" className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button" className="auth-pw-toggle"
                onClick={() => setShowPw(!showPw)}
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <i className={`ti ti-eye${showPw ? "-off" : ""}`} />
              </button>
            </div>
          </div>

          {localError && (
            <div className="auth-error">
              <i className="ti ti-alert-circle" /> {localError}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> Working…</>
            ) : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "login" ? (
            <>New here? <button className="auth-switch" onClick={() => switchMode("signup")}>Create a free account</button></>
          ) : (
            <>Have an account? <button className="auth-switch" onClick={() => switchMode("login")}>Sign in</button></>
          )}
        </div>

        <button className="auth-guest" onClick={onClose}>
          Continue as guest
        </button>
      </div>
    </div>
  );
}
