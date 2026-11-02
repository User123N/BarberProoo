"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { money, timeInTz, todayInTz, zonedToUtcIso } from "@/lib/tz";

export default function BookingForm({ slug, services, barbers, timezone }) {
  const sb = useMemo(() => createClient(), []);
  const [service, setService] = useState(services[0]?.id || "");
  const [barber, setBarber] = useState(""); // "" = cualquier profesional
  const [date, setDate] = useState(todayInTz(timezone));
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const chosen = services.find((x) => x.id === service);

  useEffect(() => {
    let cancelled = false;
    async function loadSlots() {
      if (!service || !date) return;
      setLoadingSlots(true);
      setSlot("");
      setError("");
      const { data, error: err } = await sb.rpc("get_available_slots", {
        p_slug: slug, p_service: service, p_barber: barber || null, p_date: date
      });
      if (cancelled) return;
      if (err) { setError(err.message); setSlots([]); }
      else {
        // Con "cualquier profesional" se agrupan horas repetidas.
        const seen = new Set();
        setSlots((data || []).filter((r) => !seen.has(r.out_slot_start) && seen.add(r.out_slot_start)));
      }
      setLoadingSlots(false);
    }
    loadSlots();
    return () => { cancelled = true; };
  }, [sb, slug, service, barber, date]);

  async function submit(e) {
    e.preventDefault();
    if (!slot) { setError("Elige un horario disponible."); return; }
    setBusy(true);
    setError("");
    const { data, error: err } = await sb.rpc("create_public_booking", {
      p_slug: slug, p_service: service, p_barber: barber || null, p_starts_at: slot,
      p_customer_name: name, p_customer_phone: phone, p_customer_email: email || null, p_notes: notes || null
    });
    setBusy(false);
    if (err) {
      setError(err.message || "No fue posible reservar. Intenta de nuevo.");
      // Si el horario se ocupó, refresca la lista.
      setDate((d) => d);
      return;
    }
    setDone(data);
  }

  if (done) {
    return (
      <div className="booking-card" role="status">
        <div className="eyebrow">{done.status === "confirmed" ? "RESERVA CONFIRMADA" : "SOLICITUD ENVIADA"}</div>
        <h2>Tu código: {done.code}</h2>
        <p className="muted">
          {done.status === "confirmed"
            ? "Tu cita está confirmada."
            : "La barbería debe confirmar tu cita. Si no lo hace a tiempo, el horario se libera."}
          {" "}Guarda este código: junto con tu teléfono te permite consultar, cancelar o reprogramar.
        </p>
        <p><strong>{new Date(done.starts_at).toLocaleString("es-CO", { timeZone: timezone, dateStyle: "full", timeStyle: "short" })}</strong></p>
        <Link className="btn btn-outline" href="/reserva">Consultar mi reserva</Link>
      </div>
    );
  }

  return (
    <form className="booking-card" onSubmit={submit}>
      <div className="eyebrow">Reserva en línea</div>
      <h2>Agenda tu visita</h2>
      <ol className="booking-steps" aria-label="Progreso de la reserva">
        {[["Servicio", !!service], ["Profesional", true], ["Fecha y hora", !!slot], ["Tus datos", !!slot && name.length > 1 && phone.length > 6]].map(([label, ok]) => (
          <li key={label} className={ok ? "done" : ""}>{label}</li>
        ))}
      </ol>
      <div className="service-picker" role="radiogroup" aria-label="Servicio">
        {services.map((s) => (
          <button type="button" key={s.id} role="radio" aria-checked={service === s.id}
            className={service === s.id ? "service-option active" : "service-option"} onClick={() => setService(s.id)}>
            <span>{s.name}<small>{s.duration_minutes} min</small></span>
            <strong>{money(s.price)}</strong>
          </button>
        ))}
      </div>
      <label>Profesional
        <select value={barber} onChange={(e) => setBarber(e.target.value)}>
          <option value="">Cualquier profesional disponible</option>
          {barbers.map((b) => <option key={b.id} value={b.id}>{b.display_name}</option>)}
        </select>
      </label>
      <label>Fecha
        <input type="date" required min={todayInTz(timezone)} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <div>
        <span className="muted" style={{ fontSize: 13 }}>Horarios disponibles</span>
        {loadingSlots ? <p className="muted">Buscando horarios…</p> : slots.length ? (
          <div className="slot-grid" role="radiogroup" aria-label="Horarios disponibles">
            {slots.map((s) => (
              <button type="button" key={s.out_slot_start} role="radio" aria-checked={slot === s.out_slot_start}
                className={slot === s.out_slot_start ? "slot active" : "slot"} onClick={() => setSlot(s.out_slot_start)}>
                {timeInTz(s.out_slot_start, timezone)}
              </button>
            ))}
          </div>
        ) : <p className="muted">No hay horarios libres ese día. Prueba otra fecha o profesional.</p>}
      </div>

      <label>Nombre completo<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" /></label>
      <label>Teléfono<input required type="tel" minLength={7} maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 000 0000" /></label>
      <label>Correo (opcional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></label>
      <label>Nota (opcional)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="¿Alguna indicación?" /></label>
      {chosen && <div className="booking-total"><span>Total estimado</span><strong>{money(chosen.price)}</strong></div>}
      <button className="btn btn-primary full" disabled={busy || !service || !slot}>{busy ? "Enviando…" : "Solicitar reserva"}</button>
      {error && <p className="form-message" role="alert">{error}</p>}
    </form>
  );
}
