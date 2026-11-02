"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/tz";

const EMPTY = { name: "", description: "", price: "", duration_minutes: 30 };

export default function ServicesTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await sb.from("services").select("*").eq("business_id", business.id).order("created_at");
    if (err) setError(err.message); else setServices(data || []);
  }, [sb, business.id]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault(); setError("");
    const payload = { name: form.name.trim(), description: form.description.trim() || null, price: Number(form.price), duration_minutes: Number(form.duration_minutes) };
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

  function edit(s) {
    setEditing(s.id);
    setForm({ name: s.name, description: s.description || "", price: String(s.price), duration_minutes: s.duration_minutes });
  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      <form className="inline-form" onSubmit={save}>
        <h3>{editing ? "Editar servicio" : "Agregar servicio"}</h3>
        <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input required type="number" min="0" placeholder="Precio COP" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input required type="number" min="5" step="5" placeholder="Minutos" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
        <button className="btn btn-primary">{editing ? "Guardar cambios" : "Guardar servicio"}</button>
        {editing && <button type="button" className="btn" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancelar edición</button>}
      </form>
      <div className="entity-list">
        {services.map((s) => (
          <div className="entity-row" key={s.id} style={s.active ? undefined : { opacity: 0.55 }}>
            <div><b>{s.name}</b>{!s.active && " (inactivo)"}<p>{s.description} · {s.duration_minutes} min · {money(s.price)}</p></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => edit(s)}>Editar</button>
              <button className={s.active ? "btn btn-danger" : "btn"} onClick={() => toggle(s)}>{s.active ? "Desactivar" : "Reactivar"}</button>
            </div>
          </div>
        ))}
        {!services.length && <p className="empty">Aún no hay servicios.</p>}
      </div>
    </>
  );
}
