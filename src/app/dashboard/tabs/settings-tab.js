"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const cleanSlug = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function SettingsTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const [s, setS] = useState(null);
  const [profile, setProfile] = useState({
    name: business.name, slug: business.slug, description: business.description || "",
    phone: business.phone || "", address: business.address || "", city: business.city || "",
    latitude: business.latitude ?? "", longitude: business.longitude ?? "",
    logo_url: business.logo_url || "", cover_url: business.cover_url || ""
  });
  const [gallery, setGallery] = useState([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data, error: err }, { data: media, error: mediaErr }] = await Promise.all([
        sb.from("business_settings").select("*").eq("business_id", business.id).maybeSingle(),
        sb.from("gallery_images").select("id,media_url,media_type,description,position").eq("business_id", business.id).order("position")
      ]);
      if (!alive) return;
      if (err) setError(err.message); else setS(data);
      if (mediaErr) setError(mediaErr.message); else setGallery(media || []);
    })();
    return () => { alive = false; };
  }, [sb, business.id]);

  const set = (k, v) => setS({ ...s, [k]: v });
  const setP = (k, v) => setProfile({ ...profile, [k]: v });

  async function uploadBrand(file, field) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Selecciona una imagen.");
    if (file.size > 5 * 1024 * 1024) return setError("La imagen no puede superar 5 MB.");
    setUploading(field); setError("");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${business.id}/branding/${field}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("barberpro-media").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) setError(upErr.message);
    else { const { data } = sb.storage.from("barberpro-media").getPublicUrl(path); setP(field, data.publicUrl); }
    setUploading("");
  }

  async function addMedia(file) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const allowed = isVideo ? ["video/mp4", "video/webm", "video/quicktime"] : ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowed.includes(file.type)) return setError("Formato no admitido. Usa JPG, PNG, WebP, AVIF, MP4, WebM o MOV.");
    if (file.size > (isVideo ? 50 : 5) * 1024 * 1024) return setError(isVideo ? "El video no puede superar 50 MB." : "La imagen no puede superar 5 MB.");
    setUploading("gallery"); setError(""); setInfo("");
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${business.id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await sb.storage.from("barberpro-media").upload(path, file, { contentType: file.type });
    if (upErr) { setError(upErr.message); setUploading(""); return; }
    const { data: publicData } = sb.storage.from("barberpro-media").getPublicUrl(path);
    const { data, error: insertErr } = await sb.from("gallery_images").insert({
      business_id: business.id, image_url: publicData.publicUrl, media_url: publicData.publicUrl,
      media_type: isVideo ? "video" : "image", description: caption.trim() || null,
      position: gallery.length
    }).select("id,media_url,media_type,description,position").single();
    if (insertErr) setError(insertErr.message);
    else { setGallery([...gallery, data]); setCaption(""); setInfo("Contenido agregado a la página pública."); }
    setUploading("");
  }

  async function removeMedia(item) {
    const { error: err } = await sb.from("gallery_images").delete().eq("id", item.id).eq("business_id", business.id);
    if (err) setError(err.message); else setGallery(gallery.filter(x => x.id !== item.id));
  }

  async function save(e) {
    e.preventDefault(); setError(""); setInfo("");
    const slug = cleanSlug(profile.slug);
    if (!slug) return setError("El enlace debe contener letras o números.");
    const lat = profile.latitude === "" ? null : Number(profile.latitude);
    const lng = profile.longitude === "" ? null : Number(profile.longitude);
    if ((lat == null) !== (lng == null) || (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180))) {
      return setError("Verifica las coordenadas: latitud entre -90 y 90 y longitud entre -180 y 180.");
    }
    const { error: be } = await sb.from("businesses").update({
      name: profile.name.trim(), slug, description: profile.description.trim() || null,
      phone: profile.phone.trim() || null, address: profile.address.trim() || null,
      city: profile.city.trim() || null, latitude: lat, longitude: lng,
      logo_url: profile.logo_url || null, cover_url: profile.cover_url || null
    }).eq("id", business.id);
    if (be) return setError(be.message);
    const { error: se } = await sb.from("business_settings").update({
      booking_interval_minutes: Number(s.booking_interval_minutes),
      min_notice_minutes: Number(s.min_notice_minutes), cancellation_hours: Number(s.cancellation_hours),
      pending_hold_hours: Number(s.pending_hold_hours), auto_confirm: !!s.auto_confirm
    }).eq("business_id", business.id);
    if (se) setError(se.message); else setInfo("Cambios guardados. Tu nueva página está en /" + slug);
  }

  if (error && !s) return <div className="error-box">{error}</div>;
  if (!s) return <p className="muted">Cargando ajustes…</p>;

  return <form className="settings-layout" onSubmit={save}>
    <section className="settings-card">
      <div className="eyebrow">Identidad de tu barbería</div><h2>Tu marca, a tu manera.</h2>
      <p className="muted">Personaliza la página pública con tu logo, portada y datos del negocio.</p>
      <div className="brand-preview" style={profile.cover_url ? { backgroundImage: `linear-gradient(90deg,rgba(8,9,11,.86),rgba(8,9,11,.2)),url("${profile.cover_url}")` } : {}}>
        {profile.logo_url ? <img src={profile.logo_url} alt="Logo" /> : <div className="brand-placeholder">{profile.name.slice(0,1).toUpperCase()}</div>}
        <div><b>{profile.name}</b><small>Vista previa de marca</small></div>
      </div>
      <div className="upload-grid">
        <label className="upload-tile"><span>Logotipo destacado</span>{profile.logo_url && <img src={profile.logo_url} alt="Logo actual" />}
          <input type="file" accept="image/*" onChange={e => uploadBrand(e.target.files?.[0], "logo_url")} />
          <small>{uploading === "logo_url" ? "Subiendo…" : "Subir o reemplazar logo"}</small></label>
        <label className="upload-tile cover-upload"><span>Imagen de portada</span>{profile.cover_url && <img src={profile.cover_url} alt="Portada actual" />}
          <input type="file" accept="image/*" onChange={e => uploadBrand(e.target.files?.[0], "cover_url")} />
          <small>{uploading === "cover_url" ? "Subiendo…" : "Subir o reemplazar portada"}</small></label>
      </div>
      <div className="settings-fields">
        <label>Nombre<input value={profile.name} onChange={e => setP("name", e.target.value)} required maxLength="90" /></label>
        <label>Enlace público (slug)<input value={profile.slug} onChange={e => setP("slug", cleanSlug(e.target.value))} required maxLength="60" pattern="[a-z0-9]+(-[a-z0-9]+)*" /><small>Tu página será: {typeof window !== "undefined" ? window.location.origin : ""}/{cleanSlug(profile.slug)}</small></label>
        <label>Descripción<textarea value={profile.description} onChange={e => setP("description", e.target.value)} rows="3" maxLength="500" /></label>
        <label>Teléfono / WhatsApp<input value={profile.phone} onChange={e => setP("phone", e.target.value)} placeholder="+57 300 000 0000" /></label>
        <label>Dirección<input value={profile.address} onChange={e => setP("address", e.target.value)} placeholder="Calle, carrera, número…" /></label>
        <label>Ciudad<input value={profile.city} onChange={e => setP("city", e.target.value)} /></label>
        <label>Latitud (opcional)<input type="number" step="any" value={profile.latitude} onChange={e => setP("latitude", e.target.value)} placeholder="Ej. 10.9685" /></label>
        <label>Longitud (opcional)<input type="number" step="any" value={profile.longitude} onChange={e => setP("longitude", e.target.value)} placeholder="-74.7813" /></label>
      </div>
      <p className="small-note">El mapa se muestra con la dirección; si agregas latitud y longitud, se usará el punto exacto.</p>
    </section>

    <section className="settings-card">
      <div className="eyebrow">Galería pública</div><h2>Fotos y videos</h2>
      <p className="muted">Agrega imágenes del local, cortes y videos cortos para que tus clientes conozcan tu barbería.</p>
      <label>Descripción opcional<input value={caption} onChange={e => setCaption(e.target.value)} maxLength="160" placeholder="Ej. Nuestro espacio de trabajo" /></label>
      <label className="media-upload-button">Agregar foto o video<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" onChange={e => addMedia(e.target.files?.[0])} /></label>
      <small className="small-note">Imágenes hasta 5 MB y videos hasta 50 MB (MP4, WebM o MOV).</small>
      <div className="settings-media-grid">{gallery.map(item => <article key={item.id}>
        {item.media_type === "video" ? <video src={item.media_url} controls preload="metadata" /> : <img src={item.media_url || item.image_url} alt={item.description || "Galería"} />}
        <span>{item.media_type === "video" ? "Video" : "Imagen"}</span>
        <button type="button" className="btn-danger" onClick={() => removeMedia(item)}>Eliminar</button>
      </article>)}</div>
      {!gallery.length && <p className="muted">Todavía no has agregado contenido.</p>}
    </section>

    <section className="settings-card">
      <div className="eyebrow">Reglas de reserva</div><h2>Control de agenda</h2>
      <label>Intervalo entre horarios (min)<select value={s.booking_interval_minutes} onChange={e => set("booking_interval_minutes", e.target.value)}>{[5,10,15,20,30,45,60].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label>Anticipación mínima (min)<input type="number" min="0" value={s.min_notice_minutes} onChange={e => set("min_notice_minutes", e.target.value)} /></label>
      <label>Cancelar o reprogramar hasta (horas antes)<input type="number" min="0" value={s.cancellation_hours} onChange={e => set("cancellation_hours", e.target.value)} /></label>
      <label>Retener reserva pendiente (horas)<input type="number" min="1" max="168" value={s.pending_hold_hours} onChange={e => set("pending_hold_hours", e.target.value)} /></label>
      <label className="check-line"><input type="checkbox" checked={!!s.auto_confirm} onChange={e => set("auto_confirm", e.target.checked)} /> Confirmar reservas automáticamente</label>
      <button className="btn btn-primary full" disabled={!!uploading}>Guardar todos los cambios</button>
      {error && <div className="error-box">{error}</div>}{info && <p className="form-message" role="status">{info}</p>}
    </section>
  </form>;
}
