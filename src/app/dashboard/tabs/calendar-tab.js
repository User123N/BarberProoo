"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatInTz, timeInTz, zonedToUtcIso } from "@/lib/tz";

const STATUS = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" };
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const keyInTz = (iso, tz) => new Intl.DateTimeFormat("en-CA", {timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
const startOfWeek = (date) => { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d; };
const plusDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate()+n); return d; };


export default function CalendarTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [barber, setBarber] = useState("all");
  const [barbers, setBarbers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [infoCalendar, setInfoCalendar] = useState("");
  const weekStart = startOfWeek(anchor);
  const days = Array.from({length: view === "day" ? 1 : 7}, (_,i) => plusDays(view === "day" ? anchor : weekStart, i));
  const rangeStart = view === "month" ? new Date(anchor.getFullYear(), anchor.getMonth(), 1) : days[0];
  const rangeEnd = view === "month" ? new Date(anchor.getFullYear(), anchor.getMonth()+1, 1) : plusDays(days[days.length-1],1);
  const rangeStartIso = zonedToUtcIso(`${keyOf(rangeStart)}T00:00`, business.timezone || "America/Bogota");
  const rangeEndIso = zonedToUtcIso(`${keyOf(rangeEnd)}T00:00`, business.timezone || "America/Bogota");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [{data: bs, error: be}, {data: ap, error: ae}] = await Promise.all([
      sb.from("barbers").select("id,display_name,active,photo_url").eq("business_id", business.id).eq("active", true).order("display_name"),
      sb.from("appointments").select("id,status,starts_at,ends_at,customer:customers(full_name,phone),barber:barbers(id,display_name),appointment_items(service_name,price)").eq("business_id", business.id).gte("starts_at", rangeStartIso).lt("starts_at", rangeEndIso).neq("status", "cancelled").order("starts_at")
    ]);
    if (be || ae) setError((be || ae).message);
    setBarbers(bs || []); setRows(ap || []); setLoading(false);
  }, [sb,business.id,rangeStartIso,rangeEndIso]);
  useEffect(() => { load(); }, [load]);

  const visibleBarbers = barber === "all" ? barbers : barbers.filter(b => b.id === barber);
  const appointmentsFor = (day, barberId) => rows.filter(a => keyInTz(a.starts_at,business.timezone || "America/Bogota") === keyOf(day) && a.barber?.id === barberId);
  const navigate = (direction) => setAnchor(d => view === "month" ? new Date(d.getFullYear(),d.getMonth()+direction,1) : plusDays(d, direction * (view === "week" ? 7 : 1)));
  const title = view === "month" ? anchor.toLocaleDateString("es-CO",{month:"long",year:"numeric"}) : view === "day" ? anchor.toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : `${days[0].toLocaleDateString("es-CO",{day:"numeric",month:"short"})} – ${days[6].toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}`;

  function openWhatsApp(a) {
    const raw = (a.customer?.phone || "").replace(/\D/g, "");
    const phone = raw.length === 10 ? `57${raw}` : raw;
    if (!phone) return;
    const service = a.appointment_items?.map(x=>x.service_name).join(", ") || "tu servicio";
    const msg = `Hola ${a.customer?.full_name || ""}, te contactamos de ${business.name} por tu cita de ${service} el ${formatInTz(a.starts_at,business.timezone)}. ¿Podemos ayudarte?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank","noopener,noreferrer");
  }

  async function updateStatus(a, status) {
    const {error: err} = await sb.from("appointments").update({status}).eq("id",a.id).eq("business_id",business.id);
    if (err) setError(err.message); else { setSelected(null); load(); }
  }

  async function moveAppointment(a, targetDay) {
    const tz = business.timezone || "America/Bogota";
    const parts = new Intl.DateTimeFormat("en-GB", {timeZone:tz,hourCycle:"h23",hour:"2-digit",minute:"2-digit"}).formatToParts(new Date(a.starts_at));
    const hour = parts.find(p=>p.type==="hour")?.value || "09";
    const minute = parts.find(p=>p.type==="minute")?.value || "00";
    const newStart = zonedToUtcIso(`${keyOf(targetDay)}T${hour}:${minute}`,tz);
    if (!newStart) return setError("No se pudo calcular la nueva hora en la zona del negocio.");
    const duration = new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime();
    const newEnd = new Date(new Date(newStart).getTime()+duration).toISOString();
    setError(""); setInfoCalendar("");
    const {error: err} = await sb.from("appointments").update({starts_at:newStart,ends_at:newEnd}).eq("id",a.id).eq("business_id",business.id);
    if (err) setError(err.message.includes("no_overlapping") ? "Ese horario ya está ocupado para este barbero." : err.message);
    else { setInfoCalendar(`Cita de ${a.customer?.full_name || "cliente"} reprogramada.`); load(); }
    setDragging(null);
  }

  return <div className="calendar-module">
    <div className="calendar-toolbar">
      <div><div className="eyebrow">AGENDA DEL EQUIPO</div><h2>{title}</h2><p className="muted">Cronograma de citas por profesional · {business.timezone || "America/Bogota"}</p></div>
      <div className="calendar-actions"><button className="btn" onClick={()=>setAnchor(new Date())}>Hoy</button><button className="btn" onClick={()=>navigate(-1)}>←</button><button className="btn" onClick={()=>navigate(1)}>→</button><select className="calendar-select" value={view} onChange={e=>setView(e.target.value)}><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option></select><select className="calendar-select" value={barber} onChange={e=>setBarber(e.target.value)}><option value="all">Todos los barberos</option>{barbers.map(b=><option key={b.id} value={b.id}>{b.display_name}</option>)}</select><button className="btn" onClick={load}>Actualizar</button></div>
    </div>
    {error && <div className="error-box">{error}</div>}
    <div className="calendar-hint">Arrastra una cita a otro día para reprogramarla; se conserva la hora y duración. La base de datos impedirá los cruces de horario.</div>{infoCalendar&&<p className="form-message">{infoCalendar}</p>}<div className="calendar-legend">{Object.entries(STATUS).filter(([k])=>k!=="cancelled").map(([k,v])=><span key={k}><i className={`calendar-dot ${k}`}/>{v}</span>)}</div>
    {view === "month" ? <div className="month-grid">{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(x=><b key={x}>{x}</b>)}{Array.from({length: new Date(anchor.getFullYear(),anchor.getMonth(),1).getDay() === 0 ? 6 : new Date(anchor.getFullYear(),anchor.getMonth(),1).getDay()-1},(_,i)=><span key={`blank${i}`} className="month-blank"/>)}{Array.from({length:new Date(anchor.getFullYear(),anchor.getMonth()+1,0).getDate()},(_,i)=>{const d=new Date(anchor.getFullYear(),anchor.getMonth(),i+1);const n=rows.filter(a=>keyInTz(a.starts_at,business.timezone || "America/Bogota")===keyOf(d)).length;return <button key={i} className={`month-day ${keyOf(d)===keyOf(new Date())?"today":""}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragging)moveAppointment(dragging,d)}} onClick={()=>{setAnchor(d);setView("day")}}><strong>{i+1}</strong>{n>0&&<small>{n} cita{n===1?"":"s"}</small>}</button>})}</div> : <div className="calendar-board" style={{"--day-count":days.length}}>
      <div className="calendar-corner">BARBERO</div>{days.map(d=><div className={`calendar-day-head ${keyOf(d)===keyOf(new Date())?"today":""}`} key={keyOf(d)}><b>{d.toLocaleDateString("es-CO",{weekday:"short"})}</b><strong>{d.getDate()}</strong></div>)}
      {visibleBarbers.map(b=><Fragment key={b.id}><div className="calendar-barber" key={`b-${b.id}`}>{b.photo_url?<img src={b.photo_url} alt=""/>:<span>{b.display_name.slice(0,1).toUpperCase()}</span>}<b>{b.display_name}</b></div>{days.map(d=><div className="calendar-cell" key={`${b.id}-${keyOf(d)}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragging&&dragging.barber?.id===b.id)moveAppointment(dragging,d);else if(dragging)setError("Para cambiar de barbero, utiliza el detalle de la cita.")}}>{appointmentsFor(d,b.id).map(a=><button key={a.id} draggable={a.status==="pending"||a.status==="confirmed"} onDragStart={()=>setDragging(a)} onDragEnd={()=>setDragging(null)} className={`calendar-event ${a.status}`} onClick={()=>setSelected(a)} title="Arrastra para cambiar de día o pulsa para ver detalles"><strong>{timeInTz(a.starts_at,business.timezone || "America/Bogota")}</strong><span>{a.customer?.full_name || "Cliente"}</span><small>{a.appointment_items?.map(x=>x.service_name).join(", ")}</small></button>)}</div>)}</Fragment>)}
      {!visibleBarbers.length&&<div className="calendar-empty">Aún no hay barberos activos para mostrar.</div>}
    </div>}
    {loading&&<p className="muted" style={{padding:16}}>Actualizando agenda…</p>}
    {selected&&<div className="calendar-modal-backdrop" onClick={()=>setSelected(null)}><section className="calendar-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}>×</button><div className="eyebrow">DETALLE DE CITA</div><h3>{selected.customer?.full_name || "Cliente"}</h3><p className="muted">{formatInTz(selected.starts_at,business.timezone)}</p><div className="calendar-detail"><span>Barbero</span><b>{selected.barber?.display_name || "—"}</b><span>Servicio</span><b>{selected.appointment_items?.map(x=>x.service_name).join(", ") || "—"}</b><span>Teléfono</span><b>{selected.customer?.phone || "—"}</b><span>Estado</span><b>{STATUS[selected.status]}</b></div><div className="actions"><button className="btn primary" onClick={()=>openWhatsApp(selected)}>Contactar por WhatsApp</button><select className="calendar-select" value={selected.status} onChange={e=>updateStatus(selected,e.target.value)}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div></section></div>}
  </div>;
}
