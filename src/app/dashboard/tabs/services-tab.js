"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/tz";
import Icon, { serviceIcon } from "@/components/Icons";
import { SkeletonCards } from "@/components/Skeleton";

const EMPTY = { name: "", description: "", price: "", duration_minutes: 30, image_url: "" };

export default function ServicesTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);\n  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await sb.from("services").select("*").eq("business_id", business.id).order("created_at");
    if (err) setError(err.message); else setServices(data || []);
    setReady(true);
  }, [sb, business.id]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault(); setError("");
    const payload = { name: form.name.trim(), description: form.description.trim() || null, price: Number(form.price), duration_minutes: Number(form.duration_minutes), image_url: form.image_url || null };
    const q = editing
      ? sb.from("services").update(payload).eq("id", editing).eq("business_id", business.id)
      : sb.from("services").insert({ ...payload, business_id: business.id });
    const { error: err } = await q;
    if (err) return setError(err.message);
    setForm(EMPTY); setEditing(null); load();
  }

  async function toggle(s) {
    const { error: err } = await sb.from("services").update({ active: !s.active }).eq("id", s.id).eq("business_id", business.id);
    if (err) setError(err.message); else load();
  }

  async function uploadImage(file) {\n    if (!file) return;\n    if (!file.type.startsWith("image/")) return setError("Selecciona una imagen.");\n    if (file.size > 5 * 1024 * 1024) return setError("La imagen no puede superar 5 MB.");\n    setUploading(true); setError("");\n    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");\n    const path = `${business.id}/services/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;\n    const { error: upErr } = await sb.storage.from("barberpro-media").upload(path, file, { contentType: file.type });\n    if (upErr) setError(upErr.message);\n    else { const { data } = sb.storage.from("barberpro-media").getPublicUrl(path); setForm((f) => ({ ...f, image_url: data.publicUrl })); }\n    setUploading(false);\n  }\n\n  function edit(s) {
    setEditing(s.id);
    setForm({ name: s.name, description: s.description || "", price: String(s.price), duration_minutes: s.duration_minutes, image_url: s.image_url || "" });
  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      <form className="inline-form" onSubmit={save}>
        <h3>{editing ? "Editar servicio" : "Agregar servicio"}</h3>
        <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input required type="number" min="0" placeholder="Precio COP" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input required type="number" min="5" step="5" placeholder="Minutos" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />\n        <label className="service-image-picker">Imagen del servicio (opcional)<input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0])} />{form.image_url && <img src={form.image_url} alt="Vista previa" />}</label>
        <button className="btn btn-primary" disabled={uploading}>{uploading ? "Subiendo imagen…" : editing ? "Guardar cambios" : "Guardar servicio"}</button>
        {editing && <button type="button" className="btn" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancelar edición</button>}
      </form>
      {!ready ? <SkeletonCards cards={6} /> : (
        <div className="card-grid">
          {services.map((s) => (
            <article className={s.active ? "service-admin" : "service-admin is-off"} key={s.id}>
              <div className="service-art">{s.image_url ? <img src={s.image_url} alt={s.name} loading="lazy" /> : <Icon name={serviceIcon(s.name)} size={30} stroke={1.4} />}</div>
              <div className="service-admin-body">
                <div className="service-admin-top"><h3>{s.name}</h3><span className={s.active ? "pill ok" : "pill off"}>{s.active ? "Activo" : "Inactivo"}</span></div>
                <p>{s.description || "Sin descripción"}</p>
                <div className="service-admin-meta"><strong>{money(s.price)}</strong><span><Icon name="clock" size={14} /> {s.duration_minutes} min</span></div>
                <div className="person-actions">
                  <button className="btn" onClick={() => edit(s)}>Editar</button>
                  <button className={s.active ? "btn btn-danger" : "btn"} onClick={() => toggle(s)}>{s.active ? "Desactivar" : "Reactivar"}</button>
                </div>
              </div>
            </article>
          ))}
          {!services.length && <p className="empty">Aún no hay servicios.</p>}
        </div>
      )}
    </>
  );
}
