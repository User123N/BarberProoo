"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icons";
import { SkeletonCards } from "@/components/Skeleton";

export default function BarbersTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [links, setLinks] = useState([]); // barber_services
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [open, setOpen] = useState(null);
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [b, s, l] = await Promise.all([
      sb.from("barbers").select("*").eq("business_id", business.id).order("created_at"),
      sb.from("services").select("id,name,active").eq("business_id", business.id).eq("active", true).order("name"),
      sb.from("barber_services").select("barber_id,service_id").eq("business_id", business.id)
    ]);
    const err = b.error || s.error || l.error;
    if (err) setError(err.message);
    setBarbers(b.data || []); setServices(s.data || []); setLinks(l.data || []); setReady(true);
  }, [sb, business.id]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault(); setError("");
    const { error: err } = await sb.from("barbers").insert({ business_id: business.id, display_name: name.trim(), bio: bio.trim() || null });
    if (err) return setError(err.message);
    setName(""); setBio(""); load();
  }

  async function uploadPhoto(b, file) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return setError("Usa una imagen de máximo 5 MB.");
    setError("");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${business.id}/barbers/${b.id}-${Date.now()}.${ext}`;
    const { error: upError } = await sb.storage.from("barberpro-media").upload(path, file, { contentType: file.type, upsert: true });
    if (upError) return setError(upError.message);
    const { data } = sb.storage.from("barberpro-media").getPublicUrl(path);
    const { error: saveError } = await sb.from("barbers").update({ photo_url: data.publicUrl }).eq("id", b.id).eq("business_id", business.id);
    if (saveError) setError(saveError.message); else { setInfo(`Fotografía de ${b.display_name} actualizada.`); load(); }
  }

  async function toggle(b) {
    const { error: err } = await sb.from("barbers").update({ active: !b.active }).eq("id", b.id).eq("business_id", business.id);
    if (err) setError(err.message); else load();
  }

  function openServices(b) {
    setInfo("");
    if (open === b.id) return setOpen(null);
    setOpen(b.id);
    setPicked(links.filter((x) => x.barber_id === b.id).map((x) => x.service_id));
  }

  async function saveServices(id) {
    setError(""); setInfo("");
    const { error: err } = await sb.rpc("set_barber_services", { p_barber: id, p_services: picked });
    if (err) return setError(err.message);
    setInfo("Servicios actualizados."); setOpen(null); load();
  }

  const active = barbers.filter((b) => b.active).length;
  return (
    <>
      {error && <div className="error-box">{error}</div>}
      {info && <p className="form-message" role="status">{info}</p>}
      <div className="tab-summary"><b>{active}</b> activos de <b>{barbers.length}</b> barberos</div>
      <form className="inline-form" onSubmit={add}>
        <h3>Agregar barbero</h3>
        <input required placeholder="Nombre del barbero" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Especialidad o biografía (opcional)" value={bio} onChange={(e) => setBio(e.target.value)} />
        <button className="btn btn-primary"><Icon name="plus" size={16} /> Agregar</button>
      </form>
      <p className="muted" style={{ fontSize: 13 }}>Un barbero nuevo no tiene horario: configúralo en la pestaña “Horarios” para que pueda recibir reservas.</p>
      {!ready ? <SkeletonCards cards={3} /> : (
        <div className="card-grid">
          {barbers.map((b) => {
            const mine = links.filter((x) => x.barber_id === b.id);
            const names = mine.map((x) => services.find((s) => s.id === x.service_id)?.name).filter(Boolean);
            return (
              <article className={b.active ? "person-card" : "person-card is-off"} key={b.id}>
                <div className="person-photo">
                  {b.photo_url ? <img src={b.photo_url} alt={b.display_name} loading="lazy" decoding="async" /> : <span className="person-mono">{b.display_name.slice(0, 1).toUpperCase()}</span>}
                  <span className={b.active ? "pill ok" : "pill off"}>{b.active ? "Activo" : "Inactivo"}</span>
                  <label className="photo-edit" title="Cambiar foto"><Icon name="plus" size={16} /><input type="file" accept="image/*" onChange={(e) => uploadPhoto(b, e.target.files?.[0])} /></label>
                </div>
                <div className="person-body">
                  <h3>{b.display_name}</h3>
                  <p>{b.bio || "Barbero profesional"}</p>
                  <div className="chips">
                    {names.length ? names.slice(0, 3).map((n) => <span key={n}>{n}</span>) : <span>Realiza todos los servicios</span>}
                    {names.length > 3 && <span>+{names.length - 3}</span>}
                  </div>
                  <div className="person-actions">
                    <button className="btn" onClick={() => openServices(b)}>Servicios</button>
                    <button className={b.active ? "btn btn-danger" : "btn"} onClick={() => toggle(b)}>{b.active ? "Desactivar" : "Reactivar"}</button>
                  </div>
                  {open === b.id && (
                    <div className="picker-pop">
                      <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>Marca los servicios que realiza. Sin ninguno marcado, realiza todos.</p>
                      {services.map((s) => (
                        <label key={s.id} className="pick-line">
                          <input type="checkbox" checked={picked.includes(s.id)}
                            onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} /> {s.name}
                        </label>
                      ))}
                      <button className="btn primary" onClick={() => saveServices(b.id)} style={{ marginTop: 10 }}>Guardar servicios</button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          {!barbers.length && <p className="empty">Aún no hay barberos.</p>}
        </div>
      )}
    </>
  );
}
