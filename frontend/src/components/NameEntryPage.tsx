import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import LandingNav from "./landing/LandingNav";
import { getDisplayName, saveDisplayName } from "../lib/deployments";

export default function NameEntryPage() {
  const [displayName, setDisplayName] = useState(() => getDisplayName());
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? "/deploy";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = displayName.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (value.length < 2 || value.length > 32 || !/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]{1,31}$/u.test(value)) {
      setError("Use 2–32 letters, numbers, spaces, periods, apostrophes, underscores, or hyphens.");
      return;
    }
    saveDisplayName(value);
    toast.success(`Welcome, ${value}.`);
    navigate(destination, { replace: true });
  };

  return (
    <main className="landingmain-container pushmint-name-page">
      <LandingNav />
      <section className="pushmint-name-card">
        <p className="pushmint-name-eyebrow">PUBLIC DEPLOYMENT PROFILE</p>
        <h1>What should we call you?</h1>
        <p>Choose a display name to label your deployments and find them in the dashboard. No password or account is created.</p>
        <form onSubmit={submit}>
          <label htmlFor="pushmint-name">Display name</label>
          <input id="pushmint-name" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setError(""); }} minLength={2} maxLength={32} autoComplete="nickname" autoFocus />
          {error && <p role="alert" className="pushmint-name-error">{error}</p>}
          <button className="pushmint-button pushmint-button-primary" type="submit">Continue <span aria-hidden="true">↗</span></button>
        </form>
        <Link to="/">Back to Pushmint</Link>
      </section>
    </main>
  );
}
