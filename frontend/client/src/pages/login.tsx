/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import { Link /*, useNavigate*/ } from "react-router-dom";
import AuthService from "../services/auth.service";
import "../styles/login.css";
import visibility from "../assets/visibility.svg";
import visibilityOff from "../assets/visibilityOff.svg";




export default function Login() {
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
      const user = await AuthService.login({
        username: username.trim().toLowerCase(),
        password,
      });
      setMsg(`Welcome back, ${user.username}`);
      setPassword("");
      // navigate("/");
    } catch (err) {
      let code = "LOGIN_FAILED";
      if (typeof err === "object" && err !== null) {
        // @ts-expect-error axios error optional shape
        code = err.response?.data?.code ?? code;
      }
      setMsg(`${code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-blob" />
      <div className="auth-blob b2" />

      <section className="auth-card">
        {/* Left visual pane (hidden on narrow screens via grid collapse) */}
        <div className="visual-pane">
          <span className="visual-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.88L18.18 22 12 18.77 5.82 22 7 14.15l-5-4.88 6.91-1.01L12 2z"/>
            </svg>
            Ad-Wise
          </span>
          <h2 className="visual-title">Welcome back</h2>
          <p className="visual-copy">
            Sign in to manage campaigns, track performance, and collaborate with your team.
          </p>

          <div className="brand-mark">
            <span className="brand-mark-dot" />
            <span>Secure • Fast • Reliable</span>
          </div>
        </div>

        {/* Right form pane */}
        <div className="form-pane">
          <header style={{ textAlign: "center", marginBottom: 10 }}>
            <div className="brand-dot" aria-hidden />
            <h1 className="auth-heading">Sign in</h1>
            <p className="auth-subheading">Access your Ad-Wise account</p>
          </header>

          <form onSubmit={onSubmit} noValidate>
          <label className="auth-label" htmlFor="username">Username</label>
          <div className="auth-input-wrapper">
            <input
              id="username"
              className="auth-input"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>


            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
                <button
                  type="button"
                  className="pw-toggle-inside"
                  onClick={() => setShowPw(!showPw)}
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
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="btn-row">
              <Link to="/register" className="btn-ghost">Create new account</Link>
            </div>

            {msg && <p className="auth-msg" role="status">{msg}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}
