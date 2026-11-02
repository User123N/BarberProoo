"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function SignOutButton() {
  const [busy,setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }
  return <button className="btn" onClick={signOut} disabled={busy}>{busy ? "Saliendo..." : "Cerrar sesión"}</button>;
}
