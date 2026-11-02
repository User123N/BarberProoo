import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Brand from "@/components/Brand";
import SignOutButton from "./sign-out-button";
import Manage from "./manage";

export const metadata = { title: "Panel de control | BarberPro" };

export default async function DashboardPage({ searchParams }) {
  const { b } = await searchParams;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships, error } = await sb
    .from("business_members")
    .select("role,business:businesses(id,name,slug,status,timezone,description,logo_url,cover_url,phone,address,city,latitude,longitude)")
    .eq("user_id", user.id)
    .eq("active", true);

  const list = (memberships || []).filter((m) => m.business);
  const current = list.find((m) => m.business.id === b) || list[0];

  return (
    <>
      <header className="shell topbar">
        <Brand />
        <div className="top-actions">
          {list.length > 1 && (
            <nav aria-label="Cambiar de barbería" style={{ display: "flex", gap: 8 }}>
              {list.map((m) => (
                <Link key={m.business.id} className="btn" aria-current={m.business.id === current.business.id}
                  style={m.business.id === current.business.id ? { borderColor: "var(--gold)" } : undefined}
                  href={`/dashboard?b=${m.business.id}`}>{m.business.name}</Link>
              ))}
            </nav>
          )}
          {current?.business?.slug && <Link className="btn btn-outline mobile-public-link" href={"/" + current.business.slug} target="_blank" rel="noopener noreferrer">Ver página pública ↗</Link>}
          <span className="muted user-email">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="shell dashboard-shell">
        {error ? <div className="error-box">{error.message}</div>
          : current ? (
            current.business.status === "active" || current.business.status === "pending"
              ? <Manage key={current.business.id} business={current.business} role={current.role} />
              : <div className="empty-state"><h1>Cuenta suspendida</h1><p>Esta barbería está suspendida. Contacta al soporte de BarberPro.</p></div>
          ) : (
            <div className="empty-state">
              <div className="eyebrow">Configuración inicial</div>
              <h1>Tu espacio está listo para comenzar.</h1>
              <p>Tu usuario inició sesión, pero todavía no está vinculado a una barbería.</p>
              <Link className="btn btn-primary" href="/setup">Ver instrucciones de configuración</Link>
            </div>
          )}
      </main>
    </>
  );
}
