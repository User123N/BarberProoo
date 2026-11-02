"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault(); setError("");
    if (password.length < 10) return setError("Usa al menos 10 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    const sb = createClient();
    const { error: err } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    window.location.assign("/dashboard");
  }

  return (
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="p1">Nueva contraseña</label>
        <input id="p1" type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <div className="field"><label htmlFor="p2">Repite la contraseña</label>
        <input id="p2" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="btn primary" disabled={busy} style={{ width: "100%", marginTop: 18 }}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
    </form>
  );
}
