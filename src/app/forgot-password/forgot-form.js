"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    const sb = createClient();
    const { error: err } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    });
    setBusy(false);
    // Respuesta neutra: no revela si el correo existe.
    if (err && err.status !== 400) setError("No fue posible enviar el correo. Inténtalo más tarde."); else setSent(true);
  }

  if (sent) return <p className="form-message" role="status">Si el correo está registrado, recibirás un enlace en unos minutos.</p>;
  return (
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="btn primary" disabled={busy} style={{ width: "100%", marginTop: 18 }}>{busy ? "Enviando…" : "Enviar enlace"}</button>
    </form>
  );
}
