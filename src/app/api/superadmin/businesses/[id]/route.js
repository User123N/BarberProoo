import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request, { params }) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    const { data: me } = await auth.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
    if (me?.platform_role !== "superadmin") return NextResponse.json({ error: "Sin permisos." }, { status: 403 });

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
    if (!Object.keys(updates).length) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.from("businesses").update(updates).eq("id", id)
      .select("id,name,slug,status,city,phone,description,logo_url,cover_url,created_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ business: data, ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Error interno." }, { status: 500 });
  }
}
