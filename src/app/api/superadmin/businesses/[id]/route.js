import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorize() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  const { data: me } = await auth.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (me?.platform_role !== "superadmin") return { error: NextResponse.json({ error: "Sin permisos." }, { status: 403 }) };
  return {};
}

export async function GET(_request, { params }) {
  try {
    const access = await authorize();
    if (access.error) return access.error;
    const { id } = await params;
    const admin = createAdminClient();
    const { data: member, error: memberError } = await admin.from("business_members").select("user_id").eq("business_id", id).eq("role", "owner").eq("active", true).limit(1).maybeSingle();
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });
    if (!member) return NextResponse.json({ error: "Esta barbería no tiene un propietario activo asignado." }, { status: 404 });
    const { data, error } = await admin.auth.admin.getUserById(member.user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ownerEmail: data.user.email || "" });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Error interno." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const access = await authorize();
    if (access.error) return access.error;
    const { id } = await params;
    const body = await request.json();
    const updates = {};
    if (Object.hasOwn(body, "status")) {
      if (!["active", "pending", "suspended"].includes(body.status)) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
      updates.status = body.status;
    }
    if (Object.hasOwn(body, "name")) {
      const name = String(body.name || "").trim();
      if (name.length < 2 || name.length > 90) return NextResponse.json({ error: "El nombre debe tener entre 2 y 90 caracteres." }, { status: 400 });
      updates.name = name;
    }
    if (Object.hasOwn(body, "slug")) {
      const slug = String(body.slug || "").trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return NextResponse.json({ error: "El slug no es válido." }, { status: 400 });
      updates.slug = slug;
    }
    for (const field of ["city", "phone", "description"]) {
      if (Object.hasOwn(body, field)) updates[field] = String(body[field] || "").trim() || null;
    }

    const admin = createAdminClient();
    const hasEmail = Object.hasOwn(body, "ownerEmail");
    const hasPassword = Object.hasOwn(body, "ownerPassword") && String(body.ownerPassword || "").length > 0;
    let ownerUserId = null;
    if (hasEmail || hasPassword) {
      const email = String(body.ownerEmail || "").trim().toLowerCase();
      if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "El correo del propietario no es válido." }, { status: 400 });
      const password = String(body.ownerPassword || "");
      if (hasPassword && (password.length < 8 || password.length > 72)) return NextResponse.json({ error: "La nueva contraseña debe tener entre 8 y 72 caracteres." }, { status: 400 });
      const { data: member, error: memberError } = await admin.from("business_members").select("user_id").eq("business_id", id).eq("role", "owner").eq("active", true).limit(1).maybeSingle();
      if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });
      if (!member) return NextResponse.json({ error: "No hay un propietario activo asignado a esta barbería." }, { status: 404 });
      ownerUserId = member.user_id;
      const authChanges = {};
      if (hasEmail) { authChanges.email = email; authChanges.email_confirm = true; }
      if (hasPassword) authChanges.password = password;
      const { error: authError } = await admin.auth.admin.updateUserById(ownerUserId, authChanges);
      if (authError) return NextResponse.json({ error: `No se pudo actualizar el acceso: ${authError.message}` }, { status: 400 });
    }
    if (!Object.keys(updates).length && !hasEmail && !hasPassword) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
    let business = null;
    if (Object.keys(updates).length) {
      const { data, error } = await admin.from("businesses").update(updates).eq("id", id)
        .select("id,name,slug,status,city,phone,description,logo_url,cover_url,created_at").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      business = data;
    }
    return NextResponse.json({ business: business || {}, ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Error interno." }, { status: 500 });
  }
}
