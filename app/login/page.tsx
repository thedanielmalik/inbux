"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.assign("/");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() || undefined },
          emailRedirectTo: window.location.origin + "/auth/callback?next=/"
        }
      });

      if (error) setError(error.message);
      else if (data.session) window.location.assign("/");
      else setMessage("Check your email to confirm your Inbux account, then return here to sign in.");
    }

    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">i</span><strong>inbux</strong></div>
        <div className="auth-eyebrow">DELIVERABILITY-FIRST EMAIL</div>
        <h1>{mode === "signin" ? "Welcome back." : "Create your Inbux account."}</h1>
        <p className="auth-subtitle">Send better campaigns, protect your sender reputation, and understand what reaches the inbox.</p>

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <label>Name<input value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Daniel Malik" autoComplete="name" /></label>
          )}
          <label>Email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
          <label>Password<input type="password" required minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="primary auth-submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={17}/>
          </button>
        </form>

        <button className="auth-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
          {mode === "signin" ? "New to Inbux? Create an account" : "Already have an account? Sign in"}
        </button>

        <div className="auth-points">
          <span><CheckCircle2 size={16}/> RLS-protected workspace data</span>
          <span><ShieldCheck size={16}/> Deliverability checks before sending</span>
        </div>
      </section>
    </main>
  );
}
