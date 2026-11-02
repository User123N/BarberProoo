import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Brand from "@/components/Brand";
import SignOutButton from "../dashboard/sign-out-button";
import BusinessTable from "./business-table";

export const metadata = { title: "Superadmin | BarberPro" };

export default async function SuperadminPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/superadmin");
  const { data: me } = await sb.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (me?.platform_role !== "superadmin") notFound();

  const [{ data: businesses, error }, appts] = await Promise.all([
    sb.from("businesses").select("id,name,slug,status,city,description,logo_url,cover_url,created_at").order("created_at", { ascending: false }).limit(200),
    sb.from("appointments").select("id", { count: "exact", head: true })
  ]);
  const by = (st) => (businesses || []).filter((b) => b.status === st).length;

  return (
    <>
      <header className="shell topbar"><Brand /><div className="top-actions"><span className="muted user-email">{user.email}</span><SignOutButton /></div></header>
      <main className="shell dashboard-shell">
        <div className="platform-head"><div><div className="eyebrow">Plataforma</div><h1>Barberías</h1></div><span className="pill ok">Superadministrador</span></div>
        {error && <div className="error-box">{error.message}</div>}
        <div className="stats-row">
          <div className="stat-card"><span>Registradas</span><strong>{businesses?.length || 0}</strong></div>
          <div className="stat-card stat-ok"><span>Activas</span><strong>{by("active")}</strong></div>
          <div className="stat-card stat-bad"><span>Suspendidas</span><strong>{by("suspended")}</strong></div>
          <div className="stat-card"><span>Reservas (global)</span><strong>{appts.count || 0}</strong></div>
        </div>
        <BusinessTable initial={businesses || []} />
      </main>
    </>
  );
}
