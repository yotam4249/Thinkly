/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState } from "react";
import { Link /*, useNavigate*/ } from "react-router-dom";
import AuthService from "../services/auth.service";
import type { Gender, User } from "../types/user.type";
import "../styles/register.css";

// use the SVGs as image sources (works in any Vite setup without SVGR)
import visibility from "../assets/visibility.svg";
import visibilityOff from "../assets/visibilityOff.svg";

type FieldError = string | null;

export default function Register() {
  // form fields
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>(""); // HTML date: YYYY-MM-DD
  const [gender, setGender] = useState<Gender | "">("");

  // ui state
  const [showPw, setShowPw] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  // simple validations
  const usernameError: FieldError = useMemo(() => {
    if (!username) return null;
    const u = username.trim().toLowerCase();
    if (u.length < 3) return "Username must be at least 3 characters.";
    if (u.length > 30) return "Username must be at most 30 characters.";
    if (!/^[a-z0-9._-]+$/.test(u))
      return "Only lowercase letters, numbers, dot, underscore and hyphen are allowed.";
    return null;
  }, [username]);

  const passwordError: FieldError = useMemo(() => {
    if (!password) return null;
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  }, [password]);

  const underage: boolean = useMemo(() => {
    if (!dateOfBirth) return false;
    const d = new Date(dateOfBirth);
    if (Number.isNaN(d.getTime())) return false;
    const msYear = 365.25 * 24 * 3600 * 1000;
    const age = Math.floor((Date.now() - d.getTime()) / msYear);
    return age < 16; // keep in sync with server
  }, [dateOfBirth]);

  const dateError: FieldError = useMemo(() => {
    if (!dateOfBirth) return null; // optional
    const d = new Date(dateOfBirth);
    if (Number.isNaN(d.getTime())) return "Please enter a valid date.";
    if (underage) return "You must be at least 16 years old to register.";
    return null;
  }, [dateOfBirth, underage]);

  const canSubmit =
    !!username &&
    !!password &&
    !usernameError &&
    !passwordError &&
    !dateError &&
    !underage &&
    !loading;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const user: User = await AuthService.register({
        username: username.trim().toLowerCase(),
        password,
        dateOfBirth: dateOfBirth || undefined,
        gender: (gender as Gender) || undefined,
      });
      setMsg(`Welcome, ${user.username}!`);
      // reset sensitive fields (leave username as QoL choice)
      setPassword("");
      setDateOfBirth("");
      setGender("");
      // const navigate = useNavigate(); // if you want auto-redirect:
      // navigate("/");
    } catch (err: unknown) {
      let code = "REGISTER_FAILED";
      if (typeof err === "object" && err !== null) {
        // @ts-expect-error axios error optional shape
        code = err.response?.data?.code ?? code;
      }
      // map a few known backend codes to human messages
      const friendly =
        code === "USERNAME_EXISTS"
          ? "This username is already taken."
          : code === "INVALID_DATE_OF_BIRTH"
          ? "Please provide a valid date of birth."
          : code === "AGE_TOO_YOUNG"
          ? "You must be at least 16 years old to register."
          : code === "INVALID_GENDER"
          ? "Please choose a valid gender option."
          : code === "BAD REQUEST"
          ? "Please fill username and password."
          : code;
      setMsg(friendly);
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
          <header className="form-header">
            <div className="brand-dot" aria-hidden />
            <h1 className="auth-heading">Create account</h1>
            <p className="auth-subheading">Join Ad-Wise in a few seconds</p>
          </header>

          <form onSubmit={onSubmit} noValidate>
            {/* Username */}
            <label className="auth-label" htmlFor="username">
              Username
            </label>
            <div className="auth-input-wrapper">
              <input
                id="username"
                className="auth-input"
                placeholder="choose a username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={!!usernameError}
                aria-describedby={usernameError ? "username-err" : undefined}
              />
            </div>
            {usernameError && (
              <p id="username-err" className="auth-msg" role="alert">
                {usernameError}
              </p>
            )}

            {/* Password with toggle */}
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <input
                id="password"
                className="auth-input"
                type={showPw ? "text" : "password"}
                placeholder="at least 6 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-err" : undefined}
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
            {passwordError && (
              <p id="password-err" className="auth-msg" role="alert">
                {passwordError}
              </p>
            )}

            {/* Date of Birth (optional) */}
            <label className="auth-label" htmlFor="dateOfBirth">
              Date of Birth <span className="optional">(optional)</span>
            </label>
            <div className="auth-input-wrapper date-input">
              <input
                id="dateOfBirth"
                className="auth-input"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().slice(0, 10)} // prevent future dates
                aria-invalid={!!dateError}
                aria-describedby={dateError ? "dob-err" : undefined}
              />
            </div>
            {dateError && (
              <p id="dob-err" className="auth-msg" role="alert">
                {dateError}
              </p>
            )}

            {/* Gender (optional) */}
            <label className="auth-label" htmlFor="gender">
              Gender <span className="optional">(optional)</span>
            </label>
            <div className="auth-input-wrapper">
              <select
                id="gender"
                className="auth-input"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | "")}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={!canSubmit}>
              {loading ? "Creating…" : "Create account"}
            </button>

            <div className="btn-row">
              <Link to="/login" className="btn-ghost">
                Already have an account? Sign in
              </Link>
            </div>

            {msg && (
              <p className="auth-msg" role="status">
                {msg}
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
