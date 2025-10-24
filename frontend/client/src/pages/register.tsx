/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import { Link /*, useNavigate*/ } from "react-router-dom";
import AuthService from "../services/auth.service";
import "../styles/register.css";

// use the SVGs as image sources (works in any Vite setup without SVGR)
import visibility from "../assets/visibility.svg";
import visibilityOff from "../assets/visibilityOff.svg";

export default function Register() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPw, setShowPw] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  // const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const user = await AuthService.register({
        username: username.trim().toLowerCase(),
        password,
      });
      setMsg(`✅ Welcome, ${user.username}!`);
      setPassword("");
      // navigate("/");
    } catch (err) {
      let code = "REGISTER_FAILED";
      if (typeof err === "object" && err !== null) {
        // @ts-expect-error axios error optional shape
        code = err.response?.data?.code ?? code;
      }
      setMsg(`❌ ${code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-blob" />
      <div className="auth-blob b2" />

      <section className="auth-card">
        {/* Left visual pane */}
        <div className="visual-pane">
          <span className="visual-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10h3l-4 6V12H9l4-6v6z" />
            </svg>
            Get started
          </span>
          <h2 className="visual-title">Create your account</h2>
          <p className="visual-copy">
            Join Ad-Wise to launch campaigns quickly and collaborate with your team.
          </p>

          <div className="brand-mark">
            <span className="brand-mark-dot" />
            <span>No credit card • Free to start</span>
          </div>
        </div>

        {/* Right form pane */}
        <div className="form-pane">
          <header style={{ textAlign: "center", marginBottom: 10 }}>
            <div className="brand-dot" aria-hidden />
            <h1 className="auth-heading">Create account</h1>
            <p className="auth-subheading">Join Ad-Wise in a few seconds</p>
          </header>

          <form onSubmit={onSubmit} noValidate>
            {/* Username (wrapped so width matches password input) */}
            <label className="auth-label" htmlFor="username">Username</label>
            <div className="auth-input-wrapper">
              <input
                id="username"
                className="auth-input"
                placeholder="choose a username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* Password with inside toggle */}
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="at least 6 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="pw-toggle-inside"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <img
                  src={showPw ? visibilityOff : visibility}
                  alt={showPw ? "Hide password" : "Show password"}
                  className="pw-icon"
                />
              </button>
            </div>

            <button className="btn-primary" type="submit" disabled={loading || !username || !password}>
              {loading ? "Creating…" : "Create account"}
            </button>

            <div className="btn-row">
              <Link to="/login" className="btn-ghost">Already have an account? Sign in</Link>
            </div>

            {msg && <p className="auth-msg" role="status">{msg}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}
