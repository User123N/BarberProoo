import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  let createdUserId = null;
  let createdBusinessId = null;
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    const { data: profile } = await auth.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
    if (profile?.platform_role !== "superadmin") return NextResponse.json({ error: "No tienes permisos de superadministrador." }, { status: 403 });

    const body = await request.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const ownerName = String(body.ownerName || "").trim();
    const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();
    const ownerPassword = String(body.ownerPassword || "");
    if (name.length < 2 || name.length > 90) return NextResponse.json({ error: "El nombre debe tener entre 2 y 90 caracteres." }, { status: 400 });
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return NextResponse.json({ error: "El slug debe usar minúsculas, números y guiones." }, { status: 400 });
    if (!ownerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return NextResponse.json({ error: "Debes indicar el nombre y correo del propietario." }, { status: 400 });
    if (ownerPassword.length < 8 || ownerPassword.length > 72) return NextResponse.json({ error: "La contraseña debe tener entre 8 y 72 caracteres." }, { status: 400 });

    const admin = createAdminClient();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { full_name: ownerName }
    });
    if (authError) return NextResponse.json({ error: authError.message.includes("already") ? "Ese correo ya está registrado en Supabase Authentication. Usa otro correo o asigna el usuario existente desde la gestión de miembros." : `No se pudo crear la cuenta: ${authError.message}` }, { status: 400 });
    createdUserId = authData.user.id;

    const { data: business, error: createError } = await admin.from("businesses").insert({
      name, slug,
      city: String(body.city || "").trim() || null,
      phone: String(body.phone || "").trim() || null,
      description: String(body.description || "").trim() || null,
      status: body.status === "pending" ? "pending" : "active"
    }).select("id,name,slug,status,city,phone,description,logo_url,cover_url,created_at").single();
    if (createError) {
      await admin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    createdBusinessId = business.id;

    const { error: settingsError } = await admin.from("business_settings").insert({ business_id: business.id });
    if (settingsError) {
      await admin.from("businesses").delete().eq("id", business.id);
      await admin.auth.admin.deleteUser(createdUserId);
      createdBusinessId = null; createdUserId = null;
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }
    const { error: memberError } = await admin.from("business_members").insert({
      business_id: business.id, user_id: createdUserId, role: "owner", active: true
    });
    if (memberError) {
      await admin.from("business_settings").delete().eq("business_id", business.id);
      await admin.from("businesses").delete().eq("id", business.id);
      await admin.auth.admin.deleteUser(createdUserId);
      createdBusinessId = null; createdUserId = null;
      return NextResponse.json({ error: `No se pudo asignar el propietario: ${memberError.message}` }, { status: 500 });
    }
    return NextResponse.json({ business, createdAccount: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Error interno." }, { status: 500 });
  }
}
