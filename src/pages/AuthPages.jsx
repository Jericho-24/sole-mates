import { useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../utils/format";
import { hasAdminAccess } from "../utils/admin";

export function LoginPage() {
  const { login, resetPassword } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (params.get("reset") === "1") {
        await resetPassword(email);
        setNotice("Password reset email sent. Check your inbox.");
      } else {
        const credential = await login(email, password);
        const destination = hasAdminAccess(credential.user.uid)
          ? "/admin"
          : location.state?.from?.pathname || "/account";
        navigate(destination, { replace: true });
      }
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const resetMode = params.get("reset") === "1";
  return (
    <AuthShell>
      <div className="auth-kicker"><span className="auth-icon"><LockKeyhole size={18} /></span><span className="eyebrow">{resetMode ? "ACCOUNT RECOVERY" : "WELCOME BACK"}</span></div>
      <h1>{resetMode ? "Reset your password." : "Good to see you."}</h1>
      <p className="auth-intro">{resetMode ? "We'll send you a secure link to get back into your account." : "Sign in to pick up where your next favorite pair left off."}</p>
      {error && <div className="form-alert" role="alert">{error}</div>}
      {notice && <div className="form-success" role="status">{notice}</div>}
      <form className="auth-form" onSubmit={submit}>
        <label className="field-label">Email address<div className="input-icon"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div></label>
        {!resetMode && <label className="field-label">Password<div className="input-icon"><KeyRound size={17} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
        {!resetMode && <div className="auth-form-aside"><span>Secure sign-in with Firebase</span><Link to="/login?reset=1">Forgot password?</Link></div>}
        <button disabled={busy} className="button button-primary auth-submit">{busy ? "Please wait…" : resetMode ? "Send reset link" : "Sign in"} {!busy && <ArrowRight size={17} />}</button>
      </form>
      <div className="auth-bottom">{resetMode ? <Link to="/login">Back to sign in</Link> : <>New to Sole Mates? <Link to="/register">Create an account <ArrowRight size={14} /></Link></>}</div>
      <div className="auth-assurance"><ShieldCheck size={16} /> Your account is protected by Firebase Authentication.</div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Your passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await register(form);
      setCreated(true);
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-kicker"><span className="auth-icon"><UserRound size={18} /></span><span className="eyebrow">JOIN SOLE MATES</span></div>
      {created ? <>
        <h1>You're on the list.</h1><p className="auth-intro">Your account is ready. Find your next favorite pair.</p>
        <div className="form-success"><ShieldCheck size={17} /> Account created successfully.</div><Link to="/account" className="button button-primary auth-submit">Go to your account <ArrowRight size={17} /></Link>
      </> : <>
        <h1>Create your account.</h1><p className="auth-intro">Save your cart and keep track of the styles you love.</p>
        {error && <div className="form-alert" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label className="field-label">Your name<div className="input-icon"><UserRound size={17} /><input name="name" autoComplete="name" value={form.name} onChange={update} required maxLength={100} /></div></label>
          <label className="field-label">Email address<div className="input-icon"><Mail size={17} /><input name="email" type="email" autoComplete="email" value={form.email} onChange={update} required /></div></label>
          <label className="field-label">Password<div className="input-icon"><KeyRound size={17} /><input name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} minLength={8} required /></div></label>
          <label className="field-label">Confirm password<div className="input-icon"><KeyRound size={17} /><input name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={update} required /></div></label>
          <button disabled={busy} className="button button-primary auth-submit">{busy ? "Creating account…" : "Create account"} {!busy && <ArrowRight size={17} />}</button>
        </form>
        <div className="auth-bottom">Already part of Sole Mates? <Link to="/login">Sign in <ArrowRight size={14} /></Link></div>
        <div className="auth-assurance"><ShieldCheck size={16} /> Secure sign-in with Firebase Authentication.</div>
      </>}
    </AuthShell>
  );
}

function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-art"><div className="auth-art-grid" /><div className="auth-art-copy"><span className="eyebrow">SOLE MATES / YOUR STYLE</span><h2>Find your<br />own <span>stride.</span></h2><p>Your style, your pace, your next favorite pair.</p><div className="auth-art-index">STEP / 001 <span>— MADE TO MOVE</span></div></div></div>
      <div className="auth-panel"><div className="auth-panel-inner">{children}</div></div>
    </div>
  );
}
