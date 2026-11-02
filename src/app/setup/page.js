import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configuración inicial | BarberPro" };

export default async function Setup() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return (
    <main className="shell setup-page">
      <Link className="brand" href="/">BARBER<span>PRO</span></Link>
      <div className="feature">
        <div className="eyebrow">Configuración inicial</div>
        <h1>Vincular tu primera barbería</h1>
        <p>Para evitar que cualquiera cree negocios o se asigne permisos, el primer negocio se crea desde el SQL Editor de Supabase.</p>
        <ol>
          <li>Abre Supabase → SQL Editor.</li>
          <li>Ejecuta <code>supabase/setup_first_owner.sql</code> reemplazando UUID, nombre y slug.</li>
          <li>Vuelve al panel: tu barbería aparecerá automáticamente.</li>
          <li>Agrega barberos y servicios, y configura el horario de cada barbero en “Horarios”.</li>
        </ol>
        <p className="muted">Tu UUID está en Authentication → Users. No compartas claves secretas.</p>
        <Link className="btn btn-primary" href="/dashboard">Volver al panel</Link>
      </div>
    </main>
  );
}
