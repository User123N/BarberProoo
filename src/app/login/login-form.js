"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-redirect";

export default function LoginForm() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const params = useSearchParams();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign(safeNext(params.get("next")));
    } catch (error) {
      setMessage(error.message || "No fue posible iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nombre@barberia.com"/>
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tu contraseña"/>
      </div>
      {(message || params.get("error")) && <div className="notice error" role="alert">{message || "El enlace no es válido o expiró. Solicita uno nuevo."}</div>}
      <button className="btn primary" disabled={busy} style={{width:"100%",marginTop:18,opacity:busy?.65:1}}>
        {busy ? "Verificando..." : "Iniciar sesión"}
      </button>
      <p style={{fontSize:13,marginTop:14}}><a className="muted" href="/forgot-password">¿Olvidaste tu contraseña?</a></p>
      <p className="muted" style={{fontSize:12,lineHeight:1.6,marginTop:18}}>
        Las cuentas se crearán desde el proceso administrativo autorizado. El registro público está deshabilitado en esta etapa.
      </p>
    </form>
  );
}
