"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatInTz, zonedToUtcIso } from "@/lib/tz";

// weekday = extract(dow): 0 domingo … 6 sábado. Se muestra lunes primero.
const DAYS = [[1, "Lunes"], [2, "Martes"], [3, "Miércoles"], [4, "Jueves"], [5, "Viernes"], [6, "Sábado"], [0, "Domingo"]];
const emptyWeek = () => Object.fromEntries(DAYS.map(([d]) => [d, { on: false, s1: "09:00", e1: "13:00", two: false, s2: "14:00", e2: "19:00" }]));
const hhmm = (t) => String(t).slice(0, 5);

export default function HoursTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const tz = business.timezone || "America/Bogota";
  const [barbers, setBarbers] = useState([]);
  const [barberId, setBarberId] = useState("");
  const [week, setWeek] = useState(emptyWeek());
  const [holidays, setHolidays] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [hDate, setHDate] = useState("");
  const [hText, setHText] = useState("");
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");
  const [bWhy, setBWhy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const loadShared = useCallback(async () => {
    const [b, h, bl] = await Promise.all([
      sb.from("barbers").select("id,display_name,active").eq("business_id", business.id).order("created_at"),
      sb.from("business_holidays").select("*").eq("business_id", business.id).gte("holiday_date", new Date().toISOString().slice(0, 10)).order("holiday_date"),
      sb.from("blocked_times").select("*").eq("business_id", business.id).gte("ends_at", new Date().toISOString()).order("starts_at")
    ]);
    const err = b.error || h.error || bl.error;
    if (err) setError(err.message);
    setBarbers(b.data || []); setHolidays(h.data || []); setBlocks(bl.data || []);
    if (!barberId && b.data?.length) setBarberId(b.data[0].id);
  }, [sb, business.id, barberId]);
  useEffect(() => { loadShared(); }, [loadShared]);

  useEffect(() => {
    if (!barberId) return;
    (async () => {
      const { data, error: err } = await sb.from("working_hours").select("weekday,start_time,end_time").eq("barber_id", barberId).order("start_time");
      if (err) return setError(err.message);
      const w = emptyWeek();
      for (const r of data || []) {
        const d = w[r.weekday];
        if (!d.on) { d.on = true; d.s1 = hhmm(r.start_time); d.e1 = hhmm(r.end_time); }
        else { d.two = true; d.s2 = hhmm(r.start_time); d.e2 = hhmm(r.end_time); }
      }
      setWeek(w);
    })();
  }, [sb, barberId]);

  const patch = (d, v) => setWeek({ ...week, [d]: { ...week[d], ...v } });

  async function saveWeek() {
    setError(""); setInfo("");
    const hours = [];
    for (const [d, label] of DAYS) {
      const x = week[d];
      if (!x.on) continue;
      if (x.e1 <= x.s1) return setError(`${label}: la hora final debe ser posterior a la inicial.`);
      hours.push({ weekday: d, start: x.s1, end: x.e1 });
      if (x.two) {
        if (x.e2 <= x.s2 || x.s2 < x.e1) return setError(`${label}: el segundo turno debe empezar después del primero y terminar después de empezar.`);
        hours.push({ weekday: d, start: x.s2, end: x.e2 });
      }
    }
    const { error: err } = await sb.rpc("set_barber_hours", { p_barber: barberId, p_hours: hours });
    if (err) setError(err.message); else setInfo("Horario guardado. Los huecos entre turnos (por ejemplo, el almuerzo) quedan no disponibles.");
  }

  async function addHoliday(e) {
    e.preventDefault(); setError("");
    const { error: err } = await sb.from("business_holidays").insert({ business_id: business.id, holiday_date: hDate, description: hText || null });
    if (err) return setError(err.code === "23505" ? "Ese día ya está registrado." : err.message);
    setHDate(""); setHText(""); loadShared();
  }
  async function delHoliday(id) {
    const { error: err } = await sb.from("business_holidays").delete().eq("id", id).eq("business_id", business.id);
    if (err) setError(err.message); else loadShared();
  }

  async function addBlock(e) {
    e.preventDefault(); setError("");
    const from = zonedToUtcIso(bFrom, tz), to = zonedToUtcIso(bTo, tz);
    if (!from || !to || to <= from) return setError("Revisa las fechas: el fin debe ser posterior al inicio.");
    const { error: err } = await sb.from("blocked_times").insert({ business_id: business.id, barber_id: barberId, starts_at: from, ends_at: to, reason: bWhy || null });
    if (err) return setError(err.message);
    setBFrom(""); setBTo(""); setBWhy(""); loadShared();
  }
  async function delBlock(id) {
    const { error: err } = await sb.from("blocked_times").delete().eq("id", id).eq("business_id", business.id);
    if (err) setError(err.message); else loadShared();
  }

  if (!barbers.length) return <p className="empty">Primero agrega barberos.</p>;
  const nameOf = (id) => barbers.find((b) => b.id === id)?.display_name || "—";

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      {info && <p className="form-message" role="status">{info}</p>}
      <label className="muted">Barbero{" "}
        <select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
          {barbers.map((b) => <option key={b.id} value={b.id}>{b.display_name}{b.active ? "" : " (inactivo)"}</option>)}
        </select>
      </label>
      <p className="muted" style={{ fontSize: 13 }}>Zona horaria del negocio: {tz}. Sin turnos en un día = no atiende ese día.</p>

      <div className="entity-list">
        {DAYS.map(([d, label]) => {
          const x = week[d];
          return (
            <div className="entity-row" key={d} style={{ flexWrap: "wrap", gap: 10 }}>
              <label style={{ minWidth: 110 }}><input type="checkbox" checked={x.on} onChange={(e) => patch(d, { on: e.target.checked })} /> <b>{label}</b></label>
              {x.on && (
                <div className="hours-row">
                  <input type="time" value={x.s1} onChange={(e) => patch(d, { s1: e.target.value })} aria-label={`${label} inicio`} /> a
                  <input type="time" value={x.e1} onChange={(e) => patch(d, { e1: e.target.value })} aria-label={`${label} fin`} />
                  {x.two ? (<>
                    <span className="muted">y</span>
                    <input type="time" value={x.s2} onChange={(e) => patch(d, { s2: e.target.value })} aria-label={`${label} inicio 2`} /> a
                    <input type="time" value={x.e2} onChange={(e) => patch(d, { e2: e.target.value })} aria-label={`${label} fin 2`} />
                    <button className="btn" onClick={() => patch(d, { two: false })}>Quitar turno</button>
                  </>) : <button className="btn" onClick={() => patch(d, { two: true })}>+ Turno (almuerzo)</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn primary" onClick={saveWeek} style={{ marginTop: 12 }}>Guardar horario</button>

      <h3 style={{ marginTop: 34 }}>Festivos y días cerrados</h3>
      <form className="inline-form" onSubmit={addHoliday}>
        <input required type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} />
        <input placeholder="Descripción" value={hText} onChange={(e) => setHText(e.target.value)} />
        <button className="btn btn-primary">Agregar</button>
      </form>
      <div className="entity-list">
        {holidays.map((h) => (
          <div className="entity-row" key={h.id}><div><b>{h.holiday_date}</b><p>{h.description || "Sin descripción"}</p></div>
            <button className="btn btn-danger" onClick={() => delHoliday(h.id)}>Quitar</button></div>
        ))}
        {!holidays.length && <p className="empty">Sin festivos próximos.</p>}
      </div>

      <h3 style={{ marginTop: 34 }}>Bloqueos y vacaciones de {nameOf(barberId)}</h3>
      <form className="inline-form" onSubmit={addBlock}>
        <label className="muted" style={{ fontSize: 12 }}>Desde<input required type="datetime-local" value={bFrom} onChange={(e) => setBFrom(e.target.value)} /></label>
        <label className="muted" style={{ fontSize: 12 }}>Hasta<input required type="datetime-local" value={bTo} onChange={(e) => setBTo(e.target.value)} /></label>
        <input placeholder="Motivo (vacaciones, cita médica…)" value={bWhy} onChange={(e) => setBWhy(e.target.value)} />
        <button className="btn btn-primary">Bloquear</button>
      </form>
      <div className="entity-list">
        {blocks.filter((b) => b.barber_id === barberId).map((b) => (
          <div className="entity-row" key={b.id}>
            <div><b>{formatInTz(b.starts_at, tz)} → {formatInTz(b.ends_at, tz)}</b><p>{b.reason || "Sin motivo"}</p></div>
            <button className="btn btn-danger" onClick={() => delBlock(b.id)}>Quitar</button>
          </div>
        ))}
        {!blocks.some((b) => b.barber_id === barberId) && <p className="empty">Sin bloqueos próximos.</p>}
      </div>
    </>
  );
}
