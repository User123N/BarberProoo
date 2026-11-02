import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    const { data: profile } = await auth.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
    if (profile?.platform_role !== "superadmin") return NextResponse.json({ error: "No tienes permisos de superadministrador." }, { status: 403 });
    const body = await request.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();
    if (name.length < 2 || name.length > 90) return NextResponse.json({ error: "El nombre debe tener entre 2 y 90 caracteres." }, { status: 400 });
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return NextResponse.json({ error: "El slug debe usar minúsculas, números y guiones." }, { status: 400 });
    if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return NextResponse.json({ error: "El correo del propietario no es válido." }, { status: 400 });
    const admin = createAdminClient();
    const { data: business, error: createError } = await admin.from("businesses").insert({ name, slug, city: String(body.city || "").trim() || null, phone: String(body.phone || "").trim() || null, description: String(body.description || "").trim() || null, status: body.status === "pending" ? "pending" : "active" }).select("id,name,slug,status,city,created_at").single();
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
    const { error: settingsError } = await admin.from("business_settings").insert({ business_id: business.id });
    if (settingsError) { await admin.from("businesses").delete().eq("id", business.id); return NextResponse.json({ error: settingsError.message }, { status: 500 }); }
    let invitation = null;
    if (ownerEmail) {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(ownerEmail, { data: { full_name: String(body.ownerName || "").trim() || name } });
      let ownerUser = invited?.user || null;
      if (inviteError && /already|registered|exists/i.test(inviteError.message)) {
        const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (!usersError) ownerUser = users.users.find((item) => item.email?.toLowerCase() === ownerEmail) || null;
      } else if (inviteError) {
        await admin.from("businesses").delete().eq("id", business.id);
        return NextResponse.json({ error: `No se pudo invitar al propietario: ${inviteError.message}` }, { status: 400 });
      }
      if (!ownerUser) return NextResponse.json({ error: "La barbería se creó, pero no se pudo localizar al usuario propietario. Puedes asignarlo después desde la gestión de usuarios.", business }, { status: 201 });
      const { error: memberError } = await admin.from("business_members").upsert({ business_id: business.id, user_id: ownerUser.id, role: "owner", active: true }, { onConflict: "business_id,user_id" });
      if (memberError) return NextResponse.json({ error: `Barbería creada, pero no se pudo asignar propietario: ${memberError.message}`, business }, { status: 500 });
      invitation = invited?.user ? "Invitación enviada" : "Propietario existente asignado";
    }
    return NextResponse.json({ business, invitation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Error interno." }, { status: 500 });
  }
}
