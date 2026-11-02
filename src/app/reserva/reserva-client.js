"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money, timeInTz, todayInTz } from "@/lib/tz";

export default function ReservaClient() {
  const sb = useMemo(() => createClient(), []);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resched, setResched] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");

  const tz = booking?.timezone || "America/Bogota";

  async function lookup(e) {
    e?.preventDefault();
    setBusy(true); setError(""); setInfo("");
    const { data, error: err } = await sb.rpc("get_booking", { p_code: code, p_phone: phone });
    setBusy(false);
    if (err) return setError(err.message);
    if (!data?.found) { setBooking(null); return setError("No encontramos una reserva con esos datos."); }
    setBooking(data);
    setResched(false);
  }

  async function cancel() {
    if (!confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    setBusy(true); setError("");
    const { data, error: err } = await sb.rpc("cancel_booking", { p_code: code, p_phone: phone });
    setBusy(false);
    if (err) return setError(err.message);
    if (!data?.ok) return setError(data?.message || "No fue posible cancelar.");
    setInfo("Tu reserva fue cancelada.");
    lookup();
  }

  useEffect(() => {
    if (!resched || !date || !booking) return;
    let cancelled = false;
    (async () => {
      setSlot("");
      const { data, error: err } = await sb.rpc("get_available_slots", {
        p_slug: booking.slug, p_service: booking.service_id, p_barber: booking.barber_id, p_date: date
      });
      if (cancelled) return;
      if (err) setError(err.message); else setSlots(data || []);
    })();
    return () => { cancelled = true; };
  }, [sb, resched, date, booking]);

  async function reschedule() {
    if (!slot) return setError("Elige un nuevo horario.");
    setBusy(true); setError("");
    const { data, error: err } = await sb.rpc("reschedule_booking", { p_code: code, p_phone: phone, p_new_start: slot });
    setBusy(false);
    if (err) return setError(err.message);
    if (!data?.ok) return setError(data?.message || "No fue posible reprogramar.");
    setInfo("Tu reserva fue reprogramada.");
    setResched(false);
    lookup();
  }

  return (
    <div>
      <form onSubmit={lookup}>
        <div className="field"><label htmlFor="code">Código de reserva</label>
          <input id="code" required maxLength={12} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" /></div>
        <div className="field"><label htmlFor="phone">Teléfono</label>
          <input id="phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 000 0000" /></div>
        <button className="btn primary" disabled={busy} style={{ width: "100%", marginTop: 14 }}>{busy ? "Buscando…" : "Consultar"}</button>
      </form>
      {error && <div className="notice error" role="alert" style={{ marginTop: 14 }}>{error}</div>}
      {info && <p className="form-message" role="status">{info}</p>}

      {booking && (
        <div className="feature" style={{ marginTop: 18 }}>
          <div className="eyebrow">{booking.business_name}</div>
          <h3>{booking.service_name} · {money(booking.price)}</h3>
          <p className="muted">
            {new Date(booking.starts_at).toLocaleString("es-CO", { timeZone: tz, dateStyle: "full", timeStyle: "short" })}
            {" · con "}{booking.barber_name}
          </p>
          <p>Estado: <span className={`status ${booking.status}`}>{booking.status}</span></p>
          {booking.can_change ? (
            <div className="actions">
              <button className="btn" onClick={() => { setResched(!resched); setDate(todayInTz(tz)); }} disabled={busy}>Reprogramar</button>
              <button className="btn btn-danger" onClick={cancel} disabled={busy}>Cancelar reserva</button>
            </div>
          ) : (booking.status === "pending" || booking.status === "confirmed") && (
            <p className="muted">Los cambios online se cierran {booking.cancellation_hours} h antes de la cita. Contacta a la barbería.</p>
          )}
          {resched && (
            <div style={{ marginTop: 14 }}>
              <label className="muted" style={{ fontSize: 13 }}>Nueva fecha
                <input type="date" min={todayInTz(tz)} value={date} onChange={(e) => setDate(e.target.value)} /></label>
              {slots.length ? (
                <div className="slot-grid">
                  {slots.map((s) => (
                    <button type="button" key={s.out_slot_start} className={slot === s.out_slot_start ? "slot active" : "slot"} onClick={() => setSlot(s.out_slot_start)}>
                      {timeInTz(s.out_slot_start, tz)}
                    </button>
                  ))}
                </div>
              ) : <p className="muted">No hay horarios libres ese día.</p>}
              <button className="btn primary" onClick={reschedule} disabled={busy || !slot} style={{ marginTop: 12 }}>Confirmar nuevo horario</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
